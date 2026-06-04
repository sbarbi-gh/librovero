/**
 * Enharmonic spelling correction via the ChordBERT ONNX model.
 *
 * After a mechanical transposition the chord roots may have sub-optimal
 * enharmonic spellings (e.g. A# where Bb is expected in a Bb-major context).
 * This module runs the fine-tuned model to correct those spellings.
 *
 * Public API:
 *   fixSpellings(tokens: Token[]): Promise<Token[]>
 *
 * The model is loaded lazily on the first call and cached for subsequent ones.
 * The ONNX file must be served at /model/enharmonic.onnx.
 */

import * as ort from "onnxruntime-web";
import { isChord, type ChordToken, type Token } from "./types";

// ── Vocab (mirrors Python ireal_model/vocab.py exactly) ─────────────────────

const ROOTS = [
  "Fb", "Cb", "Gb", "Db", "Ab", "Eb", "Bb",
  "F",  "C",  "G",  "D",  "A",  "E",  "B",
  "F#", "C#", "G#", "D#", "A#", "E#", "B#",
];

const QUALITIES = ["maj", "maj7", "m7", "dom7", "m7b5", "dim7", "mMaj7", "aug"];

const N_QUALS    = 8;
const VOCAB_SIZE = 168;   // 21 roots × 8 qualities
const PAD_ID     = 168;
const MASK_ID    = 169;
const CLS_ID     = 170;
const MAX_SEQ    = 256;

const ROOT_TO_IDX = new Map(ROOTS.map((r, i) => [r, i]));
const QUAL_TO_IDX = new Map(QUALITIES.map((q, i) => [q, i]));

// Pitch class of each root (same as Python ROOT_TO_PC).
const ROOT_PC = [4,11,6,1,8,3,10,5,0,7,2,9,4,11,6,1,8,3,10,5,0];

// Enharmonic root pairs: root_idx → partner_root_idx.
const ENHARMONIC_ROOT: Map<number, number> = new Map();
{
  const pcToRoots = new Map<number, number[]>();
  ROOTS.forEach((_, ri) => {
    const pc = ROOT_PC[ri];
    if (!pcToRoots.has(pc)) pcToRoots.set(pc, []);
    pcToRoots.get(pc)!.push(ri);
  });
  for (const ris of pcToRoots.values()) {
    if (ris.length === 2) {
      ENHARMONIC_ROOT.set(ris[0], ris[1]);
      ENHARMONIC_ROOT.set(ris[1], ris[0]);
    }
  }
}

/** Map an iReal chord token's quality/tensions to our 8 canonical qualities. */
function mapQuality(quality?: string, tensions?: string[]): string {
  if (quality === "+") return "aug";
  if (quality === "o") return "dim7";
  if (quality === "h") return "m7b5";
  if (quality === "7") return "dom7";
  if (quality === "-") {
    if (tensions?.includes("^7") || tensions?.includes("^")) return "mMaj7";
    return "m7";
  }
  if (tensions?.includes("^7") || tensions?.includes("^")) return "maj7";
  return "maj";
}

function chordToIdx(root: string, quality: string): number {
  const ri = ROOT_TO_IDX.get(root);
  const qi = QUAL_TO_IDX.get(quality);
  if (ri === undefined || qi === undefined) return -1;
  return ri * N_QUALS + qi;
}

function enharmonicChordIdx(idx: number): number | null {
  const ri = Math.floor(idx / N_QUALS);
  const qi = idx % N_QUALS;
  const enh = ENHARMONIC_ROOT.get(ri);
  return enh !== undefined ? enh * N_QUALS + qi : null;
}

function idxToRoot(idx: number): string {
  return ROOTS[Math.floor(idx / N_QUALS)];
}

// ── ONNX session (lazy, singleton) ───────────────────────────────────────────

let _sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  if (!_sessionPromise) {
    // Use the WASM backend; multithreading not required for this tiny model.
    ort.env.wasm.numThreads = 1;
    _sessionPromise = ort.InferenceSession.create("/model/enharmonic.onnx", {
      executionProviders: ["wasm"],
    });
  }
  return _sessionPromise;
}

// ── Inference ────────────────────────────────────────────────────────────────

interface EnhPosition {
  tokenIndex: number;   // index in the original tokens array
  seqPos: number;       // 1-indexed position in input_ids (after CLS)
  correctIdx: number;   // current (post-transposition) chord token id
  altIdx: number;       // enharmonic alternative chord token id
  isBass: boolean;      // true when this is a bass note, not a root
}

/**
 * Correct enharmonic spellings in a (post-transposition) token array.
 *
 * All chord positions with an enharmonic alternative are masked in the input
 * so the model must choose purely from harmonic context.  Positions where the
 * model prefers the alternative spelling have their `note` (or `bass`) field
 * updated in place on a shallow-cloned token.
 *
 * Bass notes are handled independently from roots: each is treated as its own
 * enharmonic position in the sequence.
 */
export async function fixSpellings(tokens: Token[]): Promise<Token[]> {
  // ── 1. Extract chord tokens and build model input ─────────────────────────
  const chords: { tok: ChordToken; tokIdx: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (isChord(t) && t.note !== "W") chords.push({ tok: t, tokIdx: i });
  }

  if (chords.length === 0) return tokens;

  // Truncate to model capacity (leave 1 slot for CLS).
  const usable = chords.slice(0, MAX_SEQ - 1);

  // Build the input sequence: [CLS] + chord_ids with enharmonic positions masked.
  const inputIds  = new Int32Array(MAX_SEQ).fill(PAD_ID);
  const attnMask  = new Int32Array(MAX_SEQ).fill(0);
  inputIds[0] = CLS_ID;
  attnMask[0] = 1;

  const enhPositions: EnhPosition[] = [];

  usable.forEach(({ tok, tokIdx }, i) => {
    const seqPos = i + 1;   // 1-indexed after CLS
    attnMask[seqPos] = 1;
    const quality = mapQuality(tok.quality, tok.tensions);
    const rootIdx = chordToIdx(tok.note, quality);

    if (rootIdx < 0) {
      inputIds[seqPos] = 0;  // unknown chord: put C-maj as placeholder
      return;
    }

    const altIdx = enharmonicChordIdx(rootIdx);
    if (altIdx !== null) {
      // Mask this position — model will choose which spelling fits context.
      inputIds[seqPos] = MASK_ID;
      enhPositions.push({ tokenIndex: tokIdx, seqPos, correctIdx: rootIdx, altIdx, isBass: false });
    } else {
      inputIds[seqPos] = rootIdx;
    }
  });

  // If nothing is enharmonically ambiguous, return tokens unchanged.
  if (enhPositions.length === 0) return tokens;

  // ── 2. Run ONNX model ─────────────────────────────────────────────────────
  const session = await getSession();

  const inputIdsTensor = new ort.Tensor("int64", BigInt64Array.from(Array.from(inputIds, BigInt)), [1, MAX_SEQ]);
  const attnMaskTensor = new ort.Tensor("int64", BigInt64Array.from(Array.from(attnMask, BigInt)), [1, MAX_SEQ]);

  const results = await session.run({
    input_ids: inputIdsTensor,
    attention_mask: attnMaskTensor,
  });

  // mlm_logits: shape [1, MAX_SEQ, 171]
  const logits = results["mlm_logits"].data as Float32Array;
  const stride = VOCAB_SIZE + 3;  // 171

  // ── 3. Apply corrections ──────────────────────────────────────────────────
  const corrected = tokens.slice() as Token[];   // shallow clone

  for (const { tokenIndex, seqPos, correctIdx, altIdx, isBass } of enhPositions) {
    const base = seqPos * stride;
    const logitCorrect = logits[base + correctIdx];
    const logitAlt     = logits[base + altIdx];

    if (logitAlt > logitCorrect) {
      // Model prefers the alternative spelling.
      const orig = corrected[tokenIndex] as ChordToken;
      const newRoot = idxToRoot(altIdx);
      if (isBass) {
        corrected[tokenIndex] = { ...orig, bass: newRoot };
      } else {
        corrected[tokenIndex] = { ...orig, note: newRoot };
      }
    }
  }

  return corrected;
}
