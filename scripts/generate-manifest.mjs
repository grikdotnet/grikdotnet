import { readdir, stat, writeFile } from "node:fs/promises";
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
      const info = await stat(fullPath);

      return {
        key: entry.name,
        size: info.size,
        lastModified: info.mtime.toISOString()
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
  const manifest = {
    generatedAt: new Date().toISOString(),
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
