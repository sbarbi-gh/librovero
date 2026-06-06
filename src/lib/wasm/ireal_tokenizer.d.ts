/* tslint:disable */
/* eslint-disable */

/**
 * Get the library author.
 */
export function author(): string;

/**
 * Parse an irealb:// playlist URL and return fully parsed songs as JSON.
 */
export function import_playlist_songs_wasm(input: string): any;

/**
 * Parse an irealb:// playlist URL and return playlist title + raw song strings as JSON.
 */
export function import_playlist_wasm(input: string): any;

/**
 * Parse a single iReal song link string and return JSON.
 */
export function import_song_wasm(input: string): any;

/**
 * Tokenize an iReal Pro song string in extended format (alias for tokenize_wasm).
 */
export function tokenize_extended(input: string): any;

/**
 * Tokenize an iReal Pro song string and return JSON.
 */
export function tokenize_wasm(input: string): any;

/**
 * Get the library version.
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly author: () => [number, number];
    readonly import_playlist_songs_wasm: (a: number, b: number) => [number, number, number];
    readonly import_playlist_wasm: (a: number, b: number) => [number, number, number];
    readonly import_song_wasm: (a: number, b: number) => [number, number, number];
    readonly tokenize_extended: (a: number, b: number) => [number, number, number];
    readonly version: () => [number, number];
    readonly tokenize_wasm: (a: number, b: number) => [number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
