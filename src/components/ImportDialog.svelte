<script lang="ts">
  import { extractIrealUrl, importPlaylistUrl } from "../lib/import";

  let { onclose, onimported }: { onclose: () => void; onimported: () => void } =
    $props();

  let text = $state("");
  let status = $state("");
  let busy = $state(false);

  async function doImport(url: string) {
    busy = true;
    status = "Importing…";
    try {
      const { playlist, count } = await importPlaylistUrl(url);
      status = `Imported ${count} tunes from “${playlist.name}”.`;
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
    <h2>Import iReal playlist</h2>
    <p>
      Paste an <code>irealb://</code> link, or drop an iReal-exported
      <code>.html</code> file here.
    </p>
    <textarea bind:value={text} rows="4" placeholder="irealb://..."></textarea>
    <div class="row">
      <button onclick={submit} disabled={busy}>Import</button>
      <button onclick={onclose}>Close</button>
    </div>
    {#if status}<p class="status">{status}</p>{/if}
  </div>
</div>
