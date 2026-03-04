import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, "manifest.json");
const verbose = process.argv.includes("--verbose");

function isMarkdownFile(name) {
  return name.toLowerCase().endsWith(".md");
}

function isContentMarkdown(name) {
  const lowered = name.toLowerCase();
  const excluded = new Set(["readme.md", "project_plan.md"]);
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
        lastModified: info.mtime.toISOString(),
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

  if (verbose) {
    console.log(`Manifest written to ${OUTPUT_FILE}`);
    console.log(`Markdown files indexed: ${files.length}`);
    for (const file of files) {
      console.log(`- ${file.key} (${file.lastModified}, ${file.size} bytes)`);
    }
  } else {
    console.log(`manifest.json updated (${files.length} markdown file(s))`);
  }
}

main().catch((error) => {
  console.error("Failed to generate manifest.json");
  console.error(error);
  process.exit(1);
});
