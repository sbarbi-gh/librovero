<script lang="ts">
  import { layout } from "../lib/chart";
  import { getHistory, putHistory } from "../lib/db";
  import { rememberKey, touch } from "../lib/frecency";
  import { MAJOR_KEYS, MINOR_KEYS, keyIsMinor, transpose } from "../lib/transpose";
  import type { Song } from "../lib/types";

  let {
    song,
    onclose,
    onopened,
  }: { song: Song; onclose: () => void; onopened: () => void } = $props();

  let currentKey = $state("");

  // On open (and whenever the song changes): restore the remembered, possibly
  // transposed key, then record the open.
  $effect(() => {
    const id = song.id;
    currentKey = song.key;
    let cancelled = false;
    (async () => {
      const h = await getHistory(id);
      if (cancelled) return;
      if (h?.lastKey) currentKey = h.lastKey;
      await putHistory(touch(h, id, currentKey));
      onopened();
    })();
    return () => {
      cancelled = true;
    };
  });

  const isTransposed = $derived(currentKey !== "" && currentKey !== song.key);
  const keys = $derived(keyIsMinor(song.key) ? MINOR_KEYS : MAJOR_KEYS);
  const chart = $derived(layout(transpose(song.tokens, song.key, currentKey || song.key)));

  // Transposing remembers the key but does not count as a new open.
  async function setKey(k: string) {
    currentKey = k;
    const h = await getHistory(song.id);
    if (h) await putHistory(rememberKey(h, k));
  }
</script>

<div class="chart-header">
  <button onclick={onclose}>← Back</button>
  <h1>{song.title}</h1>
  <span class="author">{song.author}</span>
  <span class="key" class:transposed={isTransposed}>
    {currentKey}{#if isTransposed} ⟵ {song.key}{/if}
  </span>
  {#if isTransposed}
    <button class="revert" onclick={() => setKey(song.key)}>↺ original</button>
  {/if}
</div>

<nav class="transpose">
  {#each keys as k (k)}
    <button class:active={k === currentKey} class:orig={k === song.key} onclick={() => setKey(k)}>
      {k}
    </button>
  {/each}
</nav>

<div class="chart-panel">
  <svg
    class="chart"
    role="img"
    aria-label={`${song.title} chart`}
    width={chart.width}
    height={chart.height}
    viewBox={`0 0 ${chart.width} ${chart.height}`}
  >
    <g transform={`translate(${chart.offsetX},${chart.offsetY})`}>
      {#each chart.elements as el, i (i)}
        {#if el.kind === "barline"}
          <text class="barline" x={el.x} y={el.y}>{el.text}</text>
        {:else if el.kind === "chord"}
          <text class={el.cls} x={el.x} y={el.y}>
            {#each el.parts as p}<tspan class={p.cls} dx={p.dx} dy={p.dy}>{p.text}</tspan>{/each}
          </text>
        {:else if el.kind === "plain"}
          <text class={el.cls} x={el.x} y={el.y}>{el.text}</text>
        {:else if el.kind === "section"}
          <g class="section" transform={`translate(${el.gx},${el.gy})`}>
            <rect width="1em" height="1em"></rect>
            <text x="0.5em" y="0.5em">{el.letter}</text>
          </g>
        {:else if el.kind === "timesig"}
          <g class="timesig" transform={`translate(${el.gx},${el.gy})`}>
            <text x="0.4em" y="-1em">{el.num}</text>
            <text x="0.4em" y="0em">{el.den}</text>
          </g>
        {:else if el.kind === "ending"}
          <g class="ending" transform={`translate(${el.gx},${el.gy})`}>
            <polyline points={el.points}></polyline>
            <text>{el.num}.</text>
          </g>
        {/if}
      {/each}
    </g>
  </svg>
</div>

<style>
  .chart-panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem;
    overflow-x: auto;
  }

  .chart {
    font-family: "Patrick Hand", cursive;
    font-size: 20px;
    fill: var(--ink);
  }

  /* Dynamic classes are applied via string props, so scope them under .chart
     with :global to keep Svelte from pruning them as "unused". */
  .chart :global(.l *) {
    font-stretch: normal;
  }
  .chart :global(.s *) {
    font-stretch: extra-condensed;
  }
  .chart :global(.note) {
    font-size: larger;
  }
  .chart :global(.quality) {
    font-size: smaller;
  }
  .chart :global(.barline) {
    font-size: 125%;
  }
  .chart :global(.timesig) {
    font-size: 70%;
  }
  .chart :global(.repeat) {
    font-size: larger;
  }
  .chart :global(.optional) {
    font-size: 80%;
    fill: var(--muted);
  }
  .chart :global(.annot) {
    font-size: 125%;
    fill: var(--accent);
  }
  .chart :global(.comment) {
    font-stretch: condensed;
    font-size: smaller;
    fill: var(--muted);
  }
  .chart :global(.section rect) {
    stroke: var(--accent);
    stroke-width: 2px;
    fill: none;
  }
  .chart :global(.section text) {
    font-weight: bold;
    fill: var(--accent);
    text-anchor: middle;
    dominant-baseline: central;
  }
  .chart :global(.ending polyline) {
    stroke: var(--accent);
    fill: none;
  }
  .chart :global(.ending text) {
    fill: var(--accent);
  }
</style>
