# LibroVero

A single-page iReal Pro reader: import `irealb://` playlists, search, transpose, and
view tunes, with recent/most-played ranking. Charts are tokenized by the Rust
[`ireal-tokenizer`](https://github.com/sbarbi-gh/ireal-tokenizer) compiled to
WebAssembly. The WASM output is **prebuilt and committed** to `src/lib/wasm/`,
so no Rust toolchain is needed to build or run the app. The tokenizer source is
vendored as a git submodule at `ireal-tokenizer/` for those who need to modify
it.
Transposition is **enharmonically correct** — after mechanical pitch shifting a
fine-tuned ChordBERT ONNX model selects the musically-appropriate spelling (e.g.
Bb not A# in a Bb-major context).

![E=Fb](images/einstein.jpeg)

## Stack

- **Vite + Svelte 5 (runes) + TypeScript**
- **IndexedDB** (via `idb`) for songs / playlists / history
- **WASM** tokenizer built from the sibling Rust crate with `wasm-pack`
- **ONNX Runtime Web** for enharmonic spelling correction model

## Prerequisites

- Node (uses **yarn**, since system `npm` is broken under Node 25)

Rust toolchain and `wasm-pack` are **optional** — only needed if you want to
re-build the tokenizer from source:
```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

## Develop

```sh
git clone --recursive git@github.com:sbarbi-gh/librovero.git
# already cloned without --recursive? pull the submodule in with:
git submodule update --init

yarn install
yarn dev           # http://localhost:9000
```

The WASM tokenizer is prebuilt and committed, so `yarn build:wasm` is **not**
needed for normal development. Only run it when you modify the Rust tokenizer:

```sh
yarn build:wasm   # builds the ireal-tokenizer submodule into src/lib/wasm
```

To adopt newer tokenizer work, bump the submodule:

```sh
git -C ireal-tokenizer pull origin main
git add ireal-tokenizer && git commit -m "Bump ireal-tokenizer"
```

## Docker

A prebuilt Docker image is published to
[ghcr.io/sbarbi-gh/librovero](https://github.com/sbarbi-gh/librovero/pkgs/container/librovero)
on every push to `main`:

```sh
docker pull ghcr.io/sbarbi-gh/librovero:latest
docker run -d -p 8080:80 ghcr.io/sbarbi-gh/librovero:latest
# → http://localhost:8080
```

To build locally:

```sh
docker build -t librovero .
docker run -d -p 8080:80 librovero
```

The final image is an nginx container serving the static build on port 80.

## Layout

```
src/
  lib/
    types.ts       token / song / playlist / history types (match the Rust wire format)
    tokenizer.ts   typed wrapper around the wasm module
    db.ts          IndexedDB stores: songs, playlists, history
    frecency.ts    recency-weighted ranking + history updates
    transpose.ts   transposition over chord tokens
    enharmonic.ts  ChordBERT ONNX model wrapper for enharmonic spelling correction
    import.ts      irealb:// import -> dedup -> persist
    chart.ts       pure layout(tokens) -> positioned SVG primitives (port of draw.mjs)
    wasm/          prebuilt, committed WASM tokenizer output
  components/      Home, SearchList, ImportDialog, ChartView
  App.svelte, main.ts
ireal-tokenizer/   Rust tokenizer crate (git submodule)
public/model/     enharmonic.onnx (fine-tuned ChordBERT for spelling correction)
images/           E=Fb meme
```

