<script lang="ts">
  import type { Song } from "../lib/types";

  let { songs, onselect }: { songs: Song[]; onselect: (s: Song) => void } = $props();
  let query = $state("");

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => `${s.title} ${s.author}`.toLowerCase().includes(q));
  });
</script>

<input class="search" placeholder="Search by title or author…" bind:value={query} />

<table>
  <thead>
    <tr><th>Title</th><th>Author</th></tr>
  </thead>
  <tbody>
    {#each filtered.slice(0, 200) as song (song.id)}
      <tr onclick={() => onselect(song)}>
        <td>{song.title}</td>
        <td>{song.author}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#if filtered.length > 200}
  <p class="more">Showing first 200 of {filtered.length} — refine your search.</p>
{/if}
