<script lang="ts">
  import { tick } from "svelte";
  import type { Song } from "../lib/types";

  let { songs, onselect }: { songs: Song[]; onselect: (s: Song) => void } = $props();
  let query = $state("");
  let cursor = $state(-1);
  let rowEls: (HTMLTableRowElement | null)[] = [];

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => `${s.title} ${s.author}`.toLowerCase().includes(q));
  });

  const visible = $derived(filtered.slice(0, 200));

  $effect(() => {
    query; // reset cursor whenever the search changes
    cursor = -1;
  });

  async function onkeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.min(cursor + 1, visible.length - 1);
      await tick();
      rowEls[cursor]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cursor = Math.max(cursor - 1, -1);
      if (cursor >= 0) { await tick(); rowEls[cursor]?.scrollIntoView({ block: "nearest" }); }
    } else if (e.key === "Enter" && cursor >= 0) {
      e.preventDefault();
      onselect(visible[cursor]);
    }
  }
</script>

<input class="search" placeholder="Search by title or author…" bind:value={query} onkeydown={onkeydown} />

<table>
  <thead>
    <tr><th>Title</th><th>Author</th></tr>
  </thead>
  <tbody>
    {#each visible as song, i (song.id)}
      <tr onclick={() => onselect(song)} class:highlighted={i === cursor} bind:this={rowEls[i]}>
        <td>{song.title}</td>
        <td>{song.author}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#if filtered.length > 200}
  <p class="more">Showing first 200 of {filtered.length} — refine your search.</p>
{/if}

<style>
  .highlighted {
    background: var(--accent) !important;
    color: var(--paper);
  }
</style>
