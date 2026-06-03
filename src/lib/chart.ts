// Chart layout: turn a structured token stream into positioned SVG primitives.
// A pure port of the old draw.mjs — no DOM here; ChartView renders the result.
import { isAtom, isChord, isTimeSig, type ChordToken, type Token } from "./types";

const CELL = { x: 40, y: 60 };
const px = (cx: number) => Math.round(cx * CELL.x);
const py = (cy: number) => Math.round(cy * CELL.y);

/** Map iReal ASCII to musical glyphs (qualities, accidentals, barlines, marks). */
export function toMusic(s: string): string {
  let out = "";
  for (const ch of s) {
    switch (ch) {
      case "-": out += "m"; break;
      case "h": out += "ø"; break;
      case "^": out += "Δ"; break;
      case "#": out += "♯"; break;
      case "b": out += "♭"; break;
      case "Q": out += "𝄌"; break;
      case "S": out += "𝄋"; break;
      case "f": out += "𝄐"; break;
      case "x": out += "𝄎"; break;
      case "r": out += "𝄏"; break;
      case "p": out += "𝄍"; break;
      case "n": out += "N.C."; break;
      case "|": out += "𝄀"; break;
      case "[":
      case "]": out += "𝄁"; break;
      case "{": out += "𝄆"; break;
      case "}": out += "𝄇"; break;
      case "Z": out += "𝄂"; break;
      default: out += ch;
    }
  }
  return out;
}

function barGlyph(b: string): string {
  switch (b) {
    case "|": return "𝄀";
    case "[":
    case "]": return "𝄁";
    case "{": return "𝄆";
    case "}": return "𝄇";
    case "Z": return "𝄂";
    default: return b;
  }
}

/** A drawn tspan within a chord text element. */
export interface Part {
  text: string;
  cls?: string;
  dx?: string;
  dy?: string;
}

export type ChartEl =
  | { kind: "barline"; x: number; y: number; text: string }
  | { kind: "chord"; x: number; y: number; cls: string; parts: Part[] }
  | { kind: "plain"; x: number; y: number; cls: string; text: string }
  | { kind: "section"; gx: number; gy: number; letter: string }
  | { kind: "timesig"; gx: number; gy: number; num: number; den: number }
  | { kind: "ending"; gx: number; gy: number; num: string; points: string };

export interface ChartLayout {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  elements: ChartEl[];
}

function noteParts(note: string): Part[] {
  // Root letter, plus a superscript accidental if present (e.g. "Eb").
  const parts: Part[] = [{ text: toMusic(note[0]), cls: "note" }];
  if (note.length === 2) {
    parts.push({ text: toMusic(note[1]), cls: "accidental", dy: "-0.6em", dx: "-0.1em" });
  }
  return parts;
}

function chordParts(c: ChordToken): Part[] {
  const parts: Part[] = [];
  const accidental = c.note !== "W" && c.note.length === 2;
  if (c.note !== "W") parts.push(...noteParts(c.note));

  let dx = accidental ? 0.4 : 0;
  let dy = accidental ? -0.7 : 0;

  let quality = "";
  if (c.quality) quality += toMusic(c.quality);
  if (c.tensions) for (const t of c.tensions) quality += toMusic(t);
  if (c.literal_quality) quality += toMusic(c.literal_quality);
  if (quality) {
    parts.push({ text: quality, cls: "quality", dx: `${0 - dx}em`, dy: `${0.1 - dy}em` });
    dx = 0;
    dy = 0.1;
  }

  if (c.bass) {
    parts.push({ text: "/", dx: `${0 - dx}em`, dy: `${0.2 - dy}em` });
    parts.push(...noteParts(c.bass));
  }
  return parts;
}

function parseComment(raw: string): { above: boolean; text: string } {
  let text = raw;
  const m = text.match(/^\*\d{2}/); // leading *NN positions the comment above the staff
  const above = m !== null;
  if (m) text = text.slice(m[0].length);
  text = text.replace(/^(XyQ| )+/, "");
  return { above, text };
}

/** Lay out a token stream into positioned chart primitives. */
export function layout(tokens: Token[]): ChartLayout {
  const els: ChartEl[] = [];
  let font = "l";
  let maxCy = 0;
  let lastCy = -1;

  for (const tok of tokens) {
    if (isAtom(tok)) {
      const [type, content, cx, cy] = tok;
      if (cy > maxCy) maxCy = cy;
      // Add leading barline at start of row (except row 0) if first token is not a bar
      if (cy > lastCy && cy > 0 && cx === 0 && type !== "bar") {
        els.push({ kind: "barline", x: px(0), y: py(cy), text: "𝄀" });
      }
      lastCy = cy;
      switch (type) {
        case "setfont":
          font = content;
          break;
        case "bar":
          els.push({ kind: "barline", x: px(cx), y: py(cy), text: barGlyph(content) });
          break;
        case "ending":
          els.push({
            kind: "ending",
            gx: px(cx + 0.1),
            gy: py(cy - 0.4),
            num: content,
            points: `0,${py(0.1)} 0,${py(-0.3)} ${px(3.5)},${py(-0.3)}`,
          });
          break;
        case "section":
          els.push({ kind: "section", gx: px(cx - 0.5), gy: py(cy - 0.8), letter: content });
          break;
        case "annot":
          if (content !== "U") {
            els.push({ kind: "plain", x: px(cx), y: py(cy - 0.5), cls: "annot", text: toMusic(content) });
          }
          break;
        case "chrdspec":
          els.push({ kind: "plain", x: px(cx), y: py(cy), cls: `chord special ${font}`, text: toMusic(content) });
          break;
        case "rlb":
          // Render 1 cell right of logical position (visual centering in bar).
          els.push({ kind: "plain", x: px(cx + 1), y: py(cy), cls: "repeat", text: toMusic(content) });
          break;
        case "comment": {
          const { above, text } = parseComment(content);
          els.push({ kind: "plain", x: px(cx), y: py(cy + (above ? -0.5 : 0.5)), cls: "comment", text });
          break;
        }
      }
    } else if (isTimeSig(tok)) {
      if (tok.cy > maxCy) maxCy = tok.cy;
      // Add leading barline at start of row (except row 0) if first token is not a bar
      if (tok.cy > lastCy && tok.cy > 0 && tok.cx === 0) {
        els.push({ kind: "barline", x: px(0), y: py(tok.cy), text: "𝄀" });
      }
      lastCy = tok.cy;
      els.push({ kind: "timesig", gx: px(tok.cx), gy: py(tok.cy), num: tok.numerator, den: tok.denominator });
    } else if (isChord(tok)) {
      if (tok.cy > maxCy) maxCy = tok.cy;
      // Add leading barline at start of row (except row 0) if first token is not a bar
      if (tok.cy > lastCy && tok.cy > 0 && tok.cx === 0) {
        els.push({ kind: "barline", x: px(0), y: py(tok.cy), text: "𝄀" });
      }
      lastCy = tok.cy;
      // cx already has cx -= 1 applied for optional chords (tokenizer semantic).
      els.push({
        kind: "chord",
        x: px(tok.cx + 0.4),
        y: py(tok.optional ? tok.cy - 0.5 : tok.cy),
        cls: `chord ${font}${tok.optional ? " optional" : ""}`,
        parts: chordParts(tok),
      });
    }
  }

  const offsetY = py(1.5);
  return {
    width: CELL.x * 18,
    height: offsetY + py(maxCy) + py(2),
    offsetX: CELL.x,
    offsetY,
    elements: els,
  };
}
