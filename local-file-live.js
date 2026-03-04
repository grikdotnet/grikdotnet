(function () {
  function isMarkdown(name) {
    return String(name).toLowerCase().endsWith(".md");
  }

  async function collectMarkdownFiles(dirHandle) {
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind !== "file" || !isMarkdown(name)) {
        continue;
      }

      const file = await handle.getFile();
      files.push({
        key: name,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
    }

    files.sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified));
    return files;
  }

  function buildManifest(files) {
    return {
      generatedAt: new Date().toISOString(),
      total: files.length,
      files
    };
  }

  function signatures(files) {
    const listSig = files.map((f) => f.key).join("|");
    const metaSig = files.map((f) => `${f.key}:${f.size}:${f.lastModified}`).join("|");
    return { listSig, metaSig };
  }

  async function writeManifestFile(dirHandle, manifest) {
    const fileHandle = await dirHandle.getFileHandle("manifest.json", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(manifest, null, 2) + "\n");
    await writable.close();
  }

  function createWatcher({
    dirHandle,
    pollIntervalMs = 1500,
    onListChanged = () => {},
    onContentChanged = () => {},
    onError = () => {}
  }) {
    let timer = null;
    let busy = false;
    let listSig = "";
    let metaSig = "";

    async function scan() {
      const files = await collectMarkdownFiles(dirHandle);
      const manifest = buildManifest(files);
      const sig = signatures(files);
      return { files, manifest, ...sig };
    }

    async function rebuildNow() {
      const result = await scan();
      await writeManifestFile(dirHandle, result.manifest);
      listSig = result.listSig;
      metaSig = result.metaSig;
      return result.manifest;
    }

    async function tick() {
      if (busy) {
        return;
      }
      busy = true;
      try {
        const result = await scan();
        const listChanged = result.listSig !== listSig;
        const contentChanged = result.metaSig !== metaSig;

        if (listChanged) {
          await writeManifestFile(dirHandle, result.manifest);
          onListChanged(result.manifest);
        } else if (contentChanged) {
          onContentChanged(result.manifest);
        }

        listSig = result.listSig;
        metaSig = result.metaSig;
      } catch (error) {
        onError(error);
      } finally {
        busy = false;
      }
    }

    function start() {
      if (timer) {
        return;
      }
      timer = setInterval(tick, pollIntervalMs);
      tick();
    }

    function stop() {
      if (!timer) {
        return;
      }
      clearInterval(timer);
      timer = null;
    }

    return {
      start,
      stop,
      rebuildNow
    };
  }

  window.LocalFileLive = {
    createWatcher
  };
})();
