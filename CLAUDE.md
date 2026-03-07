# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A lightweight static site for displaying Markdown articles. One HTML file renders all content; Node.js scripts handle deployment to Cloudflare R2.

## Commands

```bash
npm install                        # Install dependencies (one-time)
npm run manifest:build             # Regenerate manifest.json from local .md files
npm run manifest:build:verbose     # Same with per-file details
npm run deploy:r2                  # Deploy changed files to Cloudflare R2
npm run bootstrap:cf:dry-run       # Preview Cloudflare infrastructure setup
npm run bootstrap:cf               # Apply Cloudflare infrastructure setup
```

There are no tests.

## Architecture

**index.html** — the entire SPA. Loads `manifest.json` to discover articles, fetches individual `.md` files on demand, renders them via `marked.js` (CDN). Supports two content sources:
- Remote: fetches from same origin (deployed to R2/CDN)
- Local: uses the File System Access API (Chrome/Edge) to read files directly — no web server needed

**scripts/generate-manifest.mjs** — scans root directory for `.md` files (excludes README.md, PROJECT_PLAN.md), writes `manifest.json` with SHA256 hashes and modification dates, sorted newest-first.

**scripts/deploy-r2.mjs** — syncs files to Cloudflare R2 (via AWS SDK v3 S3Client). Uses SHA256 hashes from `manifest.json` to skip unchanged files. Deletes stale remote objects. Handles exact files (`favicon.svg`, `favicon.ico`) separately — only uploads if missing remotely.

**scripts/bootstrap-cloudflare.mjs** — one-time infrastructure setup: creates R2 bucket, attaches custom domain, configures Cloudflare redirect rules (apex → www) and URL rewrite (`/` → `/index.html`).

**local-file-live.js** — file watcher for local editing mode. Uses polling + FNV-1a hashing to detect changes and trigger manifest updates without a build step.

## Configuration

Create `.env` from `.env.example` (never commit it):

```
R2_ACCOUNT_ID          # Cloudflare account ID
R2_BUCKET              # R2 bucket name
R2_ACCESS_KEY_ID       # S3 API key
R2_SECRET_ACCESS_KEY   # S3 API secret
```

Optional:
```
R2_S3_API_URL          # Alternative: full S3 endpoint URL
CF_API_TOKEN           # Cloudflare API token (for bootstrap only)
CF_ZONE_ID             # Cloudflare DNS zone ID (for bootstrap only)
SITE_WWW_DOMAIN        # e.g. www.example.com
SITE_APEX_DOMAIN       # Optional: example.com (enables apex redirect rule)
```

## Content

Markdown files in the root directory are articles. They are picked up automatically by `generate-manifest.mjs`. To add an article: create a `.md` file in the root, then run `npm run deploy:r2` (the deploy script calls manifest generation internally).

## Local Development

Open `index.html` directly in Chrome/Edge — no web server needed. The File System Access API allows the browser to read local `.md` files, and `local-file-live.js` watches for changes.
