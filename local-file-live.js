(function () {
  function hashStringFNV1a(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

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
      const content = await file.text();
      files.push({
        key: name,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString(),
        contentHash: hashStringFNV1a(content)
      });
    }

    files.sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified));
    return files;
  }

  function buildManifest(files) {
    return {
      generatedAt: new Date().toISOString(),
      total: files.length,
      files: files.map((file) => ({
        key: file.key,
        size: file.size,
        lastModified: file.lastModified
      }))
    };
  }

  function signatures(files) {
    const listSig = files.map((f) => f.key).join("|");
    const metaSig = files.map((f) => `${f.key}:${f.size}:${f.contentHash}`).join("|");
    return { listSig, metaSig };
  }

  function metaMapFromFiles(files) {
    const map = new Map();
    for (const file of files) {
      map.set(file.key, `${file.size}:${file.contentHash}`);
    }
    return map;
  }

  function changedKeysFromMeta(prevMetaMap, files) {
    const changed = [];
    for (const file of files) {
      const nextMeta = `${file.size}:${file.contentHash}`;
      if (prevMetaMap.get(file.key) !== nextMeta) {
        changed.push(file.key);
      }
    }
    return changed;
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
    manifestWriteDebounceMs = 2500,
    onListChanged = () => {},
    onContentChanged = () => {},
    onError = () => {}
  }) {
    let timer = null;
    let busy = false;
    let listSig = "";
    let metaSig = "";
    let metaByKey = new Map();
    let knownKeys = new Set();
    let pendingManifest = null;
    let manifestWriteTimer = null;

    async function scan() {
      const files = await collectMarkdownFiles(dirHandle);
      const manifest = buildManifest(files);
      const sig = signatures(files);
      return { files, manifest, ...sig };
    }

    async function rebuildNow() {
      if (manifestWriteTimer) {
        clearTimeout(manifestWriteTimer);
        manifestWriteTimer = null;
      }
      pendingManifest = null;

      const result = await scan();
      await writeManifestFile(dirHandle, result.manifest);
      listSig = result.listSig;
      metaSig = result.metaSig;
      metaByKey = metaMapFromFiles(result.files);
      knownKeys = new Set(result.files.map((file) => file.key));
      return result.manifest;
    }

    function scheduleManifestWrite(manifest) {
      pendingManifest = manifest;
      if (manifestWriteTimer) {
        clearTimeout(manifestWriteTimer);
      }

      manifestWriteTimer = setTimeout(async () => {
        manifestWriteTimer = null;
        const manifestToWrite = pendingManifest;
        pendingManifest = null;
        if (!manifestToWrite) {
          return;
        }
        try {
          await writeManifestFile(dirHandle, manifestToWrite);
        } catch (error) {
          onError(error);
        }
      }, manifestWriteDebounceMs);
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
          const nextKeys = new Set(result.files.map((file) => file.key));
          const addedKeys = [];
          const removedKeys = [];
          for (const key of nextKeys) {
            if (!knownKeys.has(key)) {
              addedKeys.push(key);
            }
          }
          for (const key of knownKeys) {
            if (!nextKeys.has(key)) {
              removedKeys.push(key);
            }
          }

          scheduleManifestWrite(result.manifest);
          onListChanged({
            type: "list",
            manifest: result.manifest,
            files: result.files,
            addedKeys,
            removedKeys
          });
        } else if (contentChanged) {
          const changedKeys = changedKeysFromMeta(metaByKey, result.files);
          onContentChanged({
            type: "content",
            files: result.files,
            changedKeys
          });
        }

        listSig = result.listSig;
        metaSig = result.metaSig;
        metaByKey = metaMapFromFiles(result.files);
        knownKeys = new Set(result.files.map((file) => file.key));
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
        if (manifestWriteTimer) {
          clearTimeout(manifestWriteTimer);
          manifestWriteTimer = null;
        }
        pendingManifest = null;
        return;
      }
      clearInterval(timer);
      timer = null;
      if (manifestWriteTimer) {
        clearTimeout(manifestWriteTimer);
        manifestWriteTimer = null;
      }
      pendingManifest = null;
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
