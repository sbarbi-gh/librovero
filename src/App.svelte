<script lang="ts">
  import { onMount } from "svelte";
  import { allHistory, allPlaylists, allSongs } from "./lib/db";
  import type { History, Playlist, Song } from "./lib/types";
  import ChartView from "./components/ChartView.svelte";
  import Home from "./components/Home.svelte";
  import ImportDialog from "./components/ImportDialog.svelte";
  import SearchList from "./components/SearchList.svelte";

  let songs = $state<Song[]>([]);
  let history = $state<History[]>([]);
  let playlists = $state<Playlist[]>([]);
  let selected = $state<Song | null>(null);
  let view = $state<"home" | "search">("home");
  let importing = $state(false);
  let activePlaylist = $state<Playlist | null>(null);

  const visibleSongs = $derived(
    activePlaylist ? songs.filter((s) => activePlaylist!.songIds.includes(s.id)) : songs
  );

  async function refresh() {
    [songs, history, playlists] = await Promise.all([allSongs(), allHistory(), allPlaylists()]);
  }

  onMount(refresh);
</script>

<header>
  <strong class="brand">LibroVero</strong>
  <button onclick={() => { selected = null; view = "home"; activePlaylist = null; }}>Home</button>
  <button onclick={() => { selected = null; view = "search"; activePlaylist = null; }}>Search</button>
  <button onclick={() => (importing = true)}>Import</button>
  <span class="count">{songs.length} tunes</span>
</header>

<main class:chart-open={!!selected}>
  {#if selected}
    <ChartView song={selected} onclose={() => (selected = null)} onopened={refresh} />
  {:else if view === "search"}
    <SearchList
      songs={visibleSongs}
      onselect={(s) => (selected = s)}
      playlistName={activePlaylist?.name}
      onclearplaylist={() => (activePlaylist = null)}
    />
  {:else}
    <Home
      {songs}
      {history}
      {playlists}
      onselect={(s) => (selected = s)}
      onplaylist={(pl) => { activePlaylist = pl; selected = null; view = "search"; }}
    />
  {/if}
</main>

{#if importing}
  <ImportDialog
    onclose={() => (importing = false)}
    onimported={async () => { importing = false; await refresh(); }}
  />
{/if}
