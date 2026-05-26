<script lang="ts">
  import { frecency } from "../lib/frecency";
  import type { History, Playlist, Song } from "../lib/types";

  let {
    songs,
    history,
    playlists,
    onselect,
    onplaylist,
  }: {
    songs: Song[];
    history: History[];
    playlists: Playlist[];
    onselect: (s: Song) => void;
    onplaylist: (pl: Playlist) => void;
  } = $props();

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
  {#if playlists.length > 0}
    <section class="playlists">
      <h2>Playlists</h2>
      <div class="pl-chips">
        {#each playlists as pl (pl.id)}
          <button onclick={() => onplaylist(pl)}>
            {pl.name}<span class="chip">{pl.songIds.length}</span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
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
