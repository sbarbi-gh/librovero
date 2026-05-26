<script lang="ts">
  import { onMount } from "svelte";
  import { allHistory, allSongs } from "./lib/db";
  import type { History, Song } from "./lib/types";
  import ChartView from "./components/ChartView.svelte";
  import Home from "./components/Home.svelte";
  import ImportDialog from "./components/ImportDialog.svelte";
  import SearchList from "./components/SearchList.svelte";

  let songs = $state<Song[]>([]);
  let history = $state<History[]>([]);
  let selected = $state<Song | null>(null);
  let view = $state<"home" | "search">("home");
  let importing = $state(false);

  async function refresh() {
    songs = await allSongs();
    history = await allHistory();
  }

  onMount(refresh);
</script>

<header>
  <strong class="brand">LibroVero</strong>
  <button onclick={() => { selected = null; view = "home"; }}>Home</button>
  <button onclick={() => { selected = null; view = "search"; }}>Search</button>
  <button onclick={() => (importing = true)}>Import</button>
  <span class="count">{songs.length} tunes</span>
</header>

<main>
  {#if selected}
    <ChartView song={selected} onclose={() => (selected = null)} onopened={refresh} />
  {:else if view === "search"}
    <SearchList {songs} onselect={(s) => (selected = s)} />
  {:else}
    <Home {songs} {history} onselect={(s) => (selected = s)} />
  {/if}
</main>

{#if importing}
  <ImportDialog
    onclose={() => (importing = false)}
    onimported={async () => { importing = false; await refresh(); }}
  />
{/if}
