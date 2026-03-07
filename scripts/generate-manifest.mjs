import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, "manifest.json");
const SITEMAP_FILE = path.join(ROOT_DIR, "sitemap.xml");
const BOTS_FILE = path.join(ROOT_DIR, "bots.html");
const FEED_FILE = path.join(ROOT_DIR, "feed.xml");
const SITE_URL = "https://www.grik.net";
const verbose = process.argv.includes("--verbose");

function articleTokenFromKey(key) {
  return String(key)
    .replace(/\.md$/i, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractTitle(key) {
  return String(key).replace(/\.md$/i, "");
}

function buildSitemap(files) {
  const articleUrls = files
    .map((f) => {
      const token = articleTokenFromKey(f.key);
      const loc = `${SITE_URL}/?${encodeURIComponent(token)}`;
      const lastmod = f.lastModified.slice(0, 10);
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${articleUrls}
</urlset>
`;
}

function buildBotsHtml(files) {
  const items = files
    .map((f) => {
      const token = articleTokenFromKey(f.key);
      const spaHref = `/?${encodeURIComponent(token)}`;
      const mdHref = `/${f.key}`;
      const title = extractTitle(f.key);
      return `    <li><a href="${spaHref}">${title}</a> (<a href="${mdHref}">source</a>)</li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Article Index — The Repository of Notes</title>
  <meta name="robots" content="noindex, follow">
</head>
<body>
  <h1>Article Index</h1>
  <ul>
${items}
  </ul>
</body>
</html>
`;
}

function buildFeed(files) {
  const items = files
    .map((f) => {
      const token = articleTokenFromKey(f.key);
      const link = `${SITE_URL}/?${encodeURIComponent(token)}`;
      const title = extractTitle(f.key);
      const pubDate = new Date(f.lastModified).toUTCString();
      return `  <item>\n    <title>${title}</title>\n    <link>${link}</link>\n    <guid>${link}</guid>\n    <pubDate>${pubDate}</pubDate>\n  </item>`;
    })
    .join("\n");

  const buildDate = files.length > 0 ? new Date(files[0].lastModified).toUTCString() : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Repository of Notes</title>
    <link>${SITE_URL}/</link>
    <description>Digital craft, business, and the complexity of convenience.</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function isMarkdownFile(name) {
  return name.toLowerCase().endsWith(".md");
}

function isContentMarkdown(name) {
  const lowered = name.toLowerCase();
  const excluded = new Set(["readme.md", "project_plan.md", "claude.md"]);
  return isMarkdownFile(name) && !excluded.has(lowered);
}

async function collectMarkdownFiles() {
  const entries = await readdir(ROOT_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && isContentMarkdown(entry.name));

  const detailed = await Promise.all(
    files.map(async (entry) => {
      const fullPath = path.join(ROOT_DIR, entry.name);
      const body = await readFile(fullPath);
      const info = await stat(fullPath);
      const hash = createHash("sha256").update(body).digest("hex");

      return {
        key: entry.name,
        size: info.size,
        lastModified: info.birthtime.toISOString(),
        hash
      };
    })
  );

  detailed.sort((a, b) => {
    return Date.parse(b.lastModified) - Date.parse(a.lastModified);
  });

  return detailed;
}

async function main() {
  const files = await collectMarkdownFiles();
  const latestFileModified =
    files.length > 0
      ? files.reduce((latest, file) => (file.lastModified > latest ? file.lastModified : latest), files[0].lastModified)
      : null;
  const manifest = {
    generatedAt: latestFileModified ?? "1970-01-01T00:00:00.000Z",
    total: files.length,
    files
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  await writeFile(SITEMAP_FILE, buildSitemap(files), "utf8");
  await writeFile(BOTS_FILE, buildBotsHtml(files), "utf8");
  await writeFile(FEED_FILE, buildFeed(files), "utf8");

  if (verbose) {
    console.log(`Manifest written to ${OUTPUT_FILE}`);
    console.log(`Sitemap written to ${SITEMAP_FILE}`);
    console.log(`Bots index written to ${BOTS_FILE}`);
    console.log(`RSS feed written to ${FEED_FILE}`);
    console.log(`Markdown files indexed: ${files.length}`);
    for (const file of files) {
      console.log(`- ${file.key} (${file.lastModified}, ${file.size} bytes)`);
    }
  } else {
    console.log(`manifest.json, sitemap.xml, bots.html, feed.xml updated (${files.length} markdown file(s))`);
  }
}

main().catch((error) => {
  console.error("Failed to generate manifest.json");
  console.error(error);
  process.exit(1);
});
