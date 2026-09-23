<script lang="ts">
  import {
    addSongToPlaylist,
    createPlaylistWithSong,
    extractIrealUrl,
    importPlaylistUrl,
    importSingleSong,
  } from "../lib/import";
  import type { Playlist, Song } from "../lib/types";

  let {
    playlists,
    onclose,
    onimported,
  }: {
    playlists: Playlist[];
    onclose: () => void;
    onimported: () => void;
  } = $props();

  let text = $state("");
  let status = $state("");
  let busy = $state(false);
  let song = $state<Song | null>(null);
  let playlistId = $state("");
  let newPlaylistName = $state("");

  async function doImport(url: string) {
    busy = true;
    status = "Importing…";
    try {
      try {
        const { playlist, count } = await importPlaylistUrl(url);
        status = `Imported ${count} tunes from “${playlist.name}”.`;
        onimported();
      } catch (playlistError) {
        try {
          song = await importSingleSong(url);
          status = `Choose a playlist for “${song.title}”.`;
        } catch (songError) {
          if (
            playlistError instanceof Error &&
            !playlistError.message.includes("does not contain any tunes")
          ) {
            throw playlistError;
          }
          if (songError instanceof Error) throw songError;
          throw playlistError;
        }
      }
    } catch (e) {
      status = "Failed: " + (e as Error).message;
    } finally {
      busy = false;
    }
  }

  async function saveSingleSong() {
    if (!song) return;
    const existingPlaylist = playlists.find((playlist) => playlist.id === playlistId);
    const name = newPlaylistName.trim();
    if (!existingPlaylist && !name) {
      status = "Choose an existing playlist or name a new one.";
      return;
    }

    busy = true;
    try {
      if (existingPlaylist) {
        await addSongToPlaylist(song, existingPlaylist);
        status = `Added “${song.title}” to “${existingPlaylist.name}”.`;
      } else {
        const playlist = await createPlaylistWithSong(name, song);
        status = `Added “${song.title}” to new playlist “${playlist.name}”.`;
      }
      onimported();
    } catch (e) {
      status = "Failed: " + (e as Error).message;
    } finally {
      busy = false;
    }
  }

  function submit() {
    const trimmed = text.trim();
    const url = trimmed.startsWith("irealb://") ? trimmed : extractIrealUrl(trimmed);
    if (!url) {
      status = "No irealb:// link found.";
      return;
    }
    void doImport(url);
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const url = extractIrealUrl(await file.text());
    if (url) void doImport(url);
    else status = "No irealb:// link in that file.";
  }
</script>

<div class="overlay">
  <button class="backdrop" aria-label="Close" onclick={onclose}></button>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-label="Import iReal playlist"
    tabindex="-1"
    ondragover={(e) => e.preventDefault()}
    ondrop={onDrop}
  >
    <h2>Import iReal</h2>
    {#if song}
      <p>Add <strong>{song.title}</strong> to a playlist.</p>
      {#if playlists.length > 0}
        <label>
          Existing playlist
          <select bind:value={playlistId} onchange={() => (newPlaylistName = "")}>
            <option value="">Choose a playlist</option>
            {#each playlists as playlist (playlist.id)}
              <option value={playlist.id}>{playlist.name}</option>
            {/each}
          </select>
        </label>
        <p class="or">or</p>
      {/if}
      <label>
        New playlist name
        <input bind:value={newPlaylistName} oninput={() => (playlistId = "")} placeholder="Playlist name" />
      </label>
      <div class="row">
        <button onclick={saveSingleSong} disabled={busy}>Add tune</button>
        <button onclick={() => (song = null)} disabled={busy}>Back</button>
        <button onclick={onclose}>Close</button>
      </div>
    {:else}
      <p>
        Paste an <code>irealb://</code> link, or drop an iReal-exported
        <code>.html</code> file here.
      </p>
      <textarea bind:value={text} rows="4" placeholder="irealb://..."></textarea>
      <div class="row">
        <button onclick={submit} disabled={busy}>Import</button>
        <button onclick={onclose}>Close</button>
      </div>
    {/if}
    {#if status}<p class="status">{status}</p>{/if}
  </div>
</div>
