## Static Markdown Site

This repository is initialized as a static site that renders preview cards from markdown files via `manifest.json`.

### Commands

- `npm run manifest:build` generates `manifest.json` from local `*.md` files.
- `npm run deploy:r2` rebuilds `manifest.json` and syncs static files to Cloudflare R2.
- `npm run bootstrap:cf:dry-run` previews Cloudflare API changes (no writes).
- `npm run bootstrap:cf` creates/updates bucket, domain mapping, and rules.

### Local deploy to R2 (no CI required)

Create a local `.env` file (never commit it) based on `.env.example`.

Install dependencies once:

```powershell
npm install
```

You can still set values directly in PowerShell if preferred:

```powershell
$env:R2_ACCOUNT_ID = "your_account_id"
$env:R2_BUCKET = "your_bucket_name"
$env:R2_ACCESS_KEY_ID = "your_r2_access_key_id"
$env:R2_SECRET_ACCESS_KEY = "your_r2_secret_access_key"
```

Deploy:

```powershell
npm run deploy:r2
```

Or run with one click in Windows Explorer:

- Double-click `deploy-r2.cmd` in the repo root.

What it does:
- Runs `scripts/generate-manifest.mjs`
- Uploads `*.html`, `*.md`, `manifest.json`, and `CNAME` to your bucket
- Uses `--delete` so removed files are removed from bucket
- Uses Node AWS SDK (no AWS CLI required)

### Publish flow

1. Edit or add local markdown files.
2. Run `npm run deploy:r2`.
3. The script rebuilds `manifest.json` and uploads site content to the bucket.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full rollout plan.

### Cloudflare bootstrap automation

The script `scripts/bootstrap-cloudflare.mjs` can configure:
- R2 bucket creation (if missing)
- R2 custom domain attachment for `SITE_WWW_DOMAIN`
- Redirect rule from `SITE_APEX_DOMAIN` -> `SITE_WWW_DOMAIN` (if apex is provided)
- Transform rewrite rule for `https://SITE_WWW_DOMAIN/` -> `/index.html`

Required `.env` values:
- `CF_API_TOKEN`
- `CF_ZONE_ID`
- `R2_BUCKET`
- `R2_ACCOUNT_ID` (or `CF_ACCOUNT_ID`)
- `SITE_WWW_DOMAIN`

Optional:
- `SITE_APEX_DOMAIN` (enables apex redirect rule)

Run:

```powershell
npm run bootstrap:cf:dry-run
npm run bootstrap:cf
```
