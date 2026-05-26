import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// The wasm-pack `--target web` output is a standard ES module that fetches its
// `.wasm` via `new URL(..., import.meta.url)`, which Vite handles natively — no
// extra wasm plugin needed.
export default defineConfig({
  plugins: [svelte()],
  server: { port: 9000 },
});
