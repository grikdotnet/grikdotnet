import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const EXACT_FILES = new Set(["favicon.svg", "favicon.ico"]);
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"];

function isImageFilename(name) {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function loadDotEnv(content) {
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 1) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");
  try {
    const envRaw = await readFile(envPath, "utf8");
    loadDotEnv(envRaw);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`Missing required value: ${name}`);
  }
}

function isManagedFilename(name) {
  const lower = name.toLowerCase();
  if (lower === "readme.md") {
    return false;
  }
  return (
    name === "manifest.json" ||
    EXACT_FILES.has(name) ||
    lower.endsWith(".html") ||
    lower.endsWith(".md") ||
    IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))
  );
}

function inferFromS3Url(urlString) {
  if (!urlString) {
    return { inferredAccountId: "", inferredBucket: "", inferredOrigin: "" };
  }

  const url = new URL(urlString);
  const hostParts = url.hostname.split(".");
  const inferredAccountId = hostParts.length > 0 ? hostParts[0] : "";
  const pathPart = url.pathname.replace(/^\/+/, "");
  const inferredBucket = pathPart.split("/")[0] || "";

  return {
    inferredAccountId,
    inferredBucket,
    inferredOrigin: `${url.protocol}//${url.host}`
  };
}

async function runNodeScript(scriptPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT_DIR,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script failed: ${scriptPath} (exit ${code})`));
      }
    });
  });
}

async function listLocalManagedFiles() {
  const entries = await readdir(ROOT_DIR, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!isManagedFilename(entry.name)) {
      continue;
    }
    files.push(entry.name);
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readLocalFileInfo(key) {
  const fullPath = path.join(ROOT_DIR, key);
  const body = await readFile(fullPath);
  const info = await stat(fullPath);
  return {
    key,
    body,
    size: info.size,
    sha256: sha256Hex(body)
  };
}

function contentTypeFor(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (lower.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (lower.endsWith(".ico")) {
    return "image/x-icon";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  if (lower.endsWith(".avif")) {
    return "image/avif";
  }
  if (lower.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }
  if (lower.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (lower === "cname") {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

async function uploadFiles(client, bucket, files) {
  for (const file of files) {
    console.log(`Uploading ${file.key} (${file.size} bytes)...`);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: file.key,
        Body: file.body,
        ContentType: contentTypeFor(file.key),
        Metadata: {
          sha256: file.sha256
        }
      })
    );
  }
}

async function loadRemoteManifest(client, bucket) {
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: "manifest.json"
      })
    );
    const text = await response.Body?.transformToString();
    if (!text) {
      return null;
    }
    return JSON.parse(text);
  } catch (error) {
    const status = Number(error?.$metadata?.httpStatusCode || 0);
    const code = String(error?.name || "");
    if (status === 404 || code === "NotFound" || code === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

function manifestHashLookup(manifest) {
  const map = new Map();
  if (!manifest || !Array.isArray(manifest.files)) {
    return map;
  }

  for (const file of manifest.files) {
    const key = typeof file?.key === "string" ? file.key : "";
    const hash = typeof file?.hash === "string" ? file.hash.toLowerCase() : "";
    if (!key || !hash) {
      continue;
    }
    map.set(key, hash);
  }

  return map;
}

async function remoteObjectExists(client, bucket, key) {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    return true;
  } catch (error) {
    const status = Number(error?.$metadata?.httpStatusCode || 0);
    const code = String(error?.name || "");
    if (status === 404 || code === "NotFound" || code === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

async function hasSameRemoteHashAndSize(client, bucket, file) {
  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: file.key
      })
    );
    const remoteSize = Number(head.ContentLength || 0);
    const remoteHash = String(head.Metadata?.sha256 || "").toLowerCase();
    return remoteSize === file.size && remoteHash === file.sha256.toLowerCase();
  } catch (error) {
    const status = Number(error?.$metadata?.httpStatusCode || 0);
    const code = String(error?.name || "");
    if (status === 404 || code === "NotFound" || code === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

async function listRemoteManagedKeys(client, bucket) {
  const keys = [];
  let continuationToken;

  while (true) {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken
      })
    );

    for (const object of response.Contents ?? []) {
      const key = object.Key ?? "";
      if (!key || key.includes("/")) {
        continue;
      }
      if (!isManagedFilename(key)) {
        continue;
      }
      keys.push(key);
    }

    if (!response.IsTruncated) {
      break;
    }
    continuationToken = response.NextContinuationToken;
  }

  return keys;
}

async function deleteKeys(client, bucket, keys) {
  if (keys.length === 0) {
    return;
  }

  const chunkSize = 1000;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize).map((Key) => ({ Key }));
    console.log(`Deleting ${chunk.length} stale object(s)...`);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk, Quiet: false }
      })
    );
  }
}

async function main() {
  await loadEnvFile();

  const s3ApiUrl = firstNonEmpty(process.env.R2_S3_API_URL);
  const { inferredAccountId, inferredBucket, inferredOrigin } = inferFromS3Url(s3ApiUrl);

  const accountId = firstNonEmpty(process.env.R2_ACCOUNT_ID, inferredAccountId);
  const bucket = firstNonEmpty(process.env.R2_BUCKET, inferredBucket);
  const accessKeyId = firstNonEmpty(process.env.R2_ACCESS_KEY_ID, process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = firstNonEmpty(process.env.R2_SECRET_ACCESS_KEY, process.env.AWS_SECRET_ACCESS_KEY);

  requireValue("R2_ACCOUNT_ID or R2_S3_API_URL", accountId);
  requireValue("R2_BUCKET or R2_S3_API_URL", bucket);
  requireValue("R2_ACCESS_KEY_ID (or AWS_ACCESS_KEY_ID)", accessKeyId);
  requireValue("R2_SECRET_ACCESS_KEY (or AWS_SECRET_ACCESS_KEY)", secretAccessKey);

  const endpoint = firstNonEmpty(inferredOrigin, `https://${accountId}.r2.cloudflarestorage.com`);

  console.log("Building manifest.json...");
  await runNodeScript(path.join(ROOT_DIR, "scripts", "generate-manifest.mjs"));

  const localFiles = await listLocalManagedFiles();
  if (localFiles.length === 0) {
    throw new Error("No deployable files found (*.html, *.md, images, manifest.json).");
  }

  console.log(`Preparing upload to bucket '${bucket}' at ${endpoint}`);

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  const filesToUpload = [];
  let skippedCount = 0;
  const remoteManifest = await loadRemoteManifest(client, bucket);
  const remoteManifestHashes = manifestHashLookup(remoteManifest);

  for (const key of localFiles) {
    if (EXACT_FILES.has(key) || isImageFilename(key)) {
      const existsRemotely = await remoteObjectExists(client, bucket, key);
      if (existsRemotely) {
        skippedCount += 1;
        console.log(`Skipping existing ${key} (remote object exists)`);
        continue;
      }
      const local = await readLocalFileInfo(key);
      filesToUpload.push(local);
      continue;
    }

    const local = await readLocalFileInfo(key);
    const remoteHash = remoteManifestHashes.get(local.key);
    if (remoteHash && remoteHash === local.sha256.toLowerCase()) {
      skippedCount += 1;
      console.log(`Skipping unchanged ${key} (remote manifest hash match)`);
      continue;
    }

    if (local.key.toLowerCase() === "index.html" || local.key === "manifest.json") {
      const unchangedByHead = await hasSameRemoteHashAndSize(client, bucket, local);
      if (unchangedByHead) {
        skippedCount += 1;
        console.log(`Skipping unchanged ${key} (remote object hash match)`);
        continue;
      }
    }

    filesToUpload.push(local);
  }

  await uploadFiles(client, bucket, filesToUpload);

  const remoteKeys = await listRemoteManagedKeys(client, bucket);
  const localKeySet = new Set(localFiles);
  const staleKeys = remoteKeys.filter((key) => !localKeySet.has(key));

  await deleteKeys(client, bucket, staleKeys);

  console.log(
    `Deploy complete. Uploaded: ${filesToUpload.length}, skipped: ${skippedCount}, deleted: ${staleKeys.length}, current managed objects: ${localFiles.length}`
  );
}

main().catch((error) => {
  console.error("Deploy failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
