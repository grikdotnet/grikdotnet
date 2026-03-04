export interface Env {
  CONTENT_BUCKET: R2Bucket;
}

interface ManifestFile {
  key: string;
  size: number;
  etag: string;
  lastModified: string;
}

interface ManifestPayload {
  generatedAt: string;
  total: number;
  files: ManifestFile[];
}

function isContentMarkdown(key: string): boolean {
  const lowered = key.toLowerCase();
  if (!lowered.endsWith(".md")) {
    return false;
  }

  const excluded = new Set(["readme.md", "project_plan.md"]);
  return !excluded.has(lowered);
}

async function listMarkdownObjects(bucket: R2Bucket): Promise<ManifestFile[]> {
  const allObjects: ManifestFile[] = [];
  let cursor: string | undefined;

  while (true) {
    const listing = await bucket.list({ cursor });

    for (const object of listing.objects) {
      if (!isContentMarkdown(object.key)) {
        continue;
      }

      allObjects.push({
        key: object.key,
        size: object.size,
        etag: object.etag,
        lastModified: object.uploaded.toISOString()
      });
    }

    if (!listing.truncated || !listing.cursor) {
      break;
    }

    cursor = listing.cursor;
  }

  allObjects.sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified));
  return allObjects;
}

async function rebuildManifest(bucket: R2Bucket): Promise<ManifestPayload> {
  const files = await listMarkdownObjects(bucket);
  const manifest: ManifestPayload = {
    generatedAt: new Date().toISOString(),
    total: files.length,
    files
  };

  await bucket.put("manifest.json", JSON.stringify(manifest, null, 2) + "\n", {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "public, max-age=60"
    }
  });

  return manifest;
}

export default {
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    // Any object-created/object-deleted events in this queue trigger a full rebuild.
    if (batch.messages.length === 0) {
      return;
    }

    await rebuildManifest(env.CONTENT_BUCKET);
    for (const msg of batch.messages) {
      msg.ack();
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/rebuild-manifest") {
      const manifest = await rebuildManifest(env.CONTENT_BUCKET);
      return Response.json({
        ok: true,
        generatedAt: manifest.generatedAt,
        total: manifest.total
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
