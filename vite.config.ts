import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

// Copy onnxruntime-web WASM runtime files into public/ort/ so they are served
// at /ort/ (both dev server and production build).  Vite bundles the JS but
// can't resolve the companion .wasm files automatically, so we stage them here.
function ortWasmPlugin() {
  const wasmFiles = [
    "ort-wasm-simd-threaded.wasm",
    "ort-wasm-simd-threaded.asyncify.wasm",
    "ort-wasm-simd-threaded.jsep.wasm",
    "ort-wasm-simd-threaded.jspi.wasm",
  ];
  return {
    name: "ort-wasm",
    buildStart() {
      const src = resolve("node_modules/onnxruntime-web/dist");
      const dst = resolve("public/ort");
      mkdirSync(dst, { recursive: true });
      for (const f of wasmFiles) {
        const s = `${src}/${f}`;
        if (existsSync(s)) copyFileSync(s, `${dst}/${f}`);
      }
    },
  };
}

// The wasm-pack `--target web` output is a standard ES module that fetches its
// `.wasm` via `new URL(..., import.meta.url)`, which Vite handles natively — no
// extra wasm plugin needed.
export default defineConfig({
  plugins: [svelte(), ortWasmPlugin()],
  server: { port: 9000 },
});
