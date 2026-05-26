<script lang="ts">
  import { frecency } from "../lib/frecency";
  import type { History, Song } from "../lib/types";

  let {
    songs,
    history,
    onselect,
  }: { songs: Song[]; history: History[]; onselect: (s: Song) => void } = $props();

  const byId = $derived(new Map(songs.map((s) => [s.id, s])));

  type Row = { h: History; song: Song };

  function rows(sorted: History[]): Row[] {
    return sorted
      .map((h) => ({ h, song: byId.get(h.songId) }))
      .filter((r): r is Row => r.song !== undefined)
      .slice(0, 20);
  }

  const recent = $derived(rows([...history].sort((a, b) => b.lastOpened - a.lastOpened)));
  const top = $derived(rows([...history].sort((a, b) => frecency(b) - frecency(a))));
</script>

{#if songs.length === 0}
  <p class="empty">No tunes yet — use <em>Import</em> to add an iReal playlist.</p>
{:else}
  <div class="columns">
    <section>
      <h2>Recent</h2>
      <ul>
        {#each recent as { h, song } (song.id)}
          <li>
            <button onclick={() => onselect(song)}>
              {song.title}
              {#if h.lastKey && h.lastKey !== song.key}<span class="chip">{h.lastKey}</span>{/if}
            </button>
            <small>{song.author}</small>
          </li>
        {/each}
      </ul>
    </section>

    <section>
      <h2>Most played</h2>
      <ul>
        {#each top as { song } (song.id)}
          <li>
            <button onclick={() => onselect(song)}>{song.title}</button>
            <small>{song.author}</small>
          </li>
        {/each}
      </ul>
    </section>
  </div>
{/if}
