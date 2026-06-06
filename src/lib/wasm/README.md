# iReal Tokenizer

A canonical tokenizer for the iReal Pro song format. This Rust library parses and tokenizes iReal Pro chart files, enabling downstream processing and analysis.

## Features

- Parse iReal Pro song format
- Tokenize song charts into structured tokens
- Support for WASM compilation (web integration)
- CLI binary for direct usage

## Installation

### As a library

Add to your `Cargo.toml`:

```toml
[dependencies]
ireal-tokenizer = "0.1.0"
```

### From source

```bash
git clone git@github.com:sbarbi-gh/ireal-tokenizer.git
cd ireal-tokenizer
cargo build --release
```

## Usage

### Library

```rust
use ireal_tokenizer::tokenise;

let input = "...ireal song data...";
let tokens = tokenise(input).unwrap();
```

### CLI

```bash
cargo run -- --help
```

### WASM

Enable the `wasm` feature and compile with `wasm-pack`:

```bash
cargo build --target wasm32-unknown-unknown --features wasm
```

## Project Structure

- `src/lib.rs` - Library entry point
- `src/main.rs` - CLI binary
- `src/tokenise.rs` - Tokenization logic
- `src/tokens.rs` - Token definitions

## License

MIT License
