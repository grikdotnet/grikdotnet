import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const API_BASE = "https://api.cloudflare.com/client/v4";
const DRY_RUN = process.argv.includes("--dry-run");

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
    const content = await readFile(envPath, "utf8");
    loadDotEnv(content);
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

function encodePart(value) {
  return encodeURIComponent(value);
}

async function cfRequest({ token, method, pathName, body, allow404 = false }) {
  const url = `${API_BASE}${pathName}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (allow404 && response.status === 404) {
    return { status: 404, data: null };
  }

  if (!response.ok || data.success === false) {
    const errors = Array.isArray(data?.errors) ? data.errors.map((e) => e.message).join("; ") : "";
    throw new Error(`Cloudflare API ${method} ${pathName} failed (${response.status}). ${errors}`.trim());
  }

  return { status: response.status, data: data.result ?? null };
}

async function ensureBucket({ token, accountId, bucketName }) {
  const bucketPath = `/accounts/${encodePart(accountId)}/r2/buckets/${encodePart(bucketName)}`;
  const existing = await cfRequest({
    token,
    method: "GET",
    pathName: bucketPath,
    allow404: true
  });

  if (existing.status !== 404) {
    console.log(`Bucket exists: ${bucketName}`);
    return;
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would create bucket: ${bucketName}`);
    return;
  }

  await cfRequest({
    token,
    method: "POST",
    pathName: `/accounts/${encodePart(accountId)}/r2/buckets`,
    body: { name: bucketName }
  });
  console.log(`Created bucket: ${bucketName}`);
}

async function ensureCustomDomain({ token, accountId, zoneId, bucketName, domain }) {
  const listPath = `/accounts/${encodePart(accountId)}/r2/buckets/${encodePart(bucketName)}/domains/custom`;
  const listResp = await cfRequest({
    token,
    method: "GET",
    pathName: listPath
  });

  const existing = Array.isArray(listResp.data)
    ? listResp.data.find((item) => String(item.domain).toLowerCase() === domain.toLowerCase())
    : null;

  if (existing) {
    console.log(`Custom domain already attached: ${domain}`);
    return;
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would attach custom domain '${domain}' to bucket '${bucketName}'`);
    return;
  }

  await cfRequest({
    token,
    method: "POST",
    pathName: listPath,
    body: {
      domain,
      enabled: true,
      zoneId
    }
  });
  console.log(`Attached custom domain: ${domain}`);
}

async function getOrCreateEntrypointRuleset({ token, zoneId, phase }) {
  const pathName = `/zones/${encodePart(zoneId)}/rulesets/phases/${encodePart(phase)}/entrypoint`;
  const existing = await cfRequest({
    token,
    method: "GET",
    pathName,
    allow404: true
  });

  if (existing.status !== 404 && existing.data?.id) {
    return existing.data;
  }

  if (DRY_RUN) {
    return { id: `dry-run-${phase}`, rules: [] };
  }

  const created = await cfRequest({
    token,
    method: "PUT",
    pathName,
    body: {
      kind: "zone",
      name: `default-${phase}`,
      phase,
      rules: []
    }
  });

  return created.data;
}

async function upsertRule({ token, zoneId, phase, desiredRule }) {
  const ruleset = await getOrCreateEntrypointRuleset({ token, zoneId, phase });
  const existingRules = Array.isArray(ruleset.rules) ? ruleset.rules : [];
  const existing = existingRules.find((rule) => rule.ref === desiredRule.ref);

  if (existing) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would update rule '${desiredRule.ref}' in phase '${phase}'`);
      return;
    }
    await cfRequest({
      token,
      method: "PATCH",
      pathName: `/zones/${encodePart(zoneId)}/rulesets/${encodePart(ruleset.id)}/rules/${encodePart(existing.id)}`,
      body: desiredRule
    });
    console.log(`Updated rule '${desiredRule.ref}' in phase '${phase}'`);
    return;
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would create rule '${desiredRule.ref}' in phase '${phase}'`);
    return;
  }

  await cfRequest({
    token,
    method: "POST",
    pathName: `/zones/${encodePart(zoneId)}/rulesets/${encodePart(ruleset.id)}/rules`,
    body: desiredRule
  });
  console.log(`Created rule '${desiredRule.ref}' in phase '${phase}'`);
}

function buildApexRedirectRule({ apexDomain, wwwDomain }) {
  return {
    ref: "grik_apex_to_www_redirect",
    description: "grik bootstrap: redirect apex to www",
    enabled: true,
    expression: `(http.host eq "${apexDomain}")`,
    action: "redirect",
    action_parameters: {
      from_value: {
        target_url: {
          expression: `concat("https://${wwwDomain}", http.request.uri.path)`
        },
        status_code: 301,
        preserve_query_string: true
      }
    }
  };
}

function buildRootRewriteRule({ host }) {
  return {
    ref: "grik_root_to_index_rewrite",
    description: "grik bootstrap: rewrite / to /index.html",
    enabled: true,
    expression: `(http.host eq "${host}" and http.request.uri.path eq "/")`,
    action: "rewrite",
    action_parameters: {
      uri: {
        path: {
          value: "/index.html"
        }
      }
    }
  };
}

async function main() {
  await loadEnvFile();

  const token = firstNonEmpty(process.env.CF_API_TOKEN, process.env.CLOUDFLARE_API_TOKEN);
  const accountId = firstNonEmpty(process.env.CF_ACCOUNT_ID, process.env.R2_ACCOUNT_ID);
  const zoneId = firstNonEmpty(process.env.CF_ZONE_ID);
  const bucketName = firstNonEmpty(process.env.R2_BUCKET);
  const wwwDomain = firstNonEmpty(process.env.SITE_WWW_DOMAIN, process.env.R2_CUSTOM_DOMAIN);
  const apexDomain = firstNonEmpty(process.env.SITE_APEX_DOMAIN);

  requireValue("CF_API_TOKEN (or CLOUDFLARE_API_TOKEN)", token);
  requireValue("CF_ACCOUNT_ID (or R2_ACCOUNT_ID)", accountId);
  requireValue("CF_ZONE_ID", zoneId);
  requireValue("R2_BUCKET", bucketName);
  requireValue("SITE_WWW_DOMAIN (or R2_CUSTOM_DOMAIN)", wwwDomain);

  console.log(DRY_RUN ? "Running in dry-run mode" : "Running Cloudflare bootstrap");

  await ensureBucket({ token, accountId, bucketName });
  await ensureCustomDomain({
    token,
    accountId,
    zoneId,
    bucketName,
    domain: wwwDomain
  });

  if (apexDomain) {
    await upsertRule({
      token,
      zoneId,
      phase: "http_request_dynamic_redirect",
      desiredRule: buildApexRedirectRule({ apexDomain, wwwDomain })
    });
  } else {
    console.log("SITE_APEX_DOMAIN not set: skipping apex->www redirect rule.");
  }

  await upsertRule({
    token,
    zoneId,
    phase: "http_request_transform",
    desiredRule: buildRootRewriteRule({ host: wwwDomain })
  });

  console.log("Bootstrap completed.");
}

main().catch((error) => {
  console.error("Bootstrap failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
