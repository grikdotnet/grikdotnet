# Static Markdown Site + Cloudflare R2 Manifest Automation

## Goal
Serve a static website from a public Cloudflare R2 bucket where:
- `index.html` loads `manifest.json`
- The latest markdown files are fetched and shown as preview cards
- `manifest.json` is automatically rebuilt after `.md` objects are added/removed in the bucket

## Current initialization status
- [x] Added local manifest builder script: `scripts/generate-manifest.mjs`
- [x] Added project scripts in `package.json`
- [x] Added Worker scaffold for manifest rebuild: `worker/src/index.ts`
- [x] Added initial `wrangler.toml` with R2 + Queue consumer placeholders
- [x] Reworked `index.html` JS to load manifest and render markdown previews
- [ ] Wire Cloudflare resources (bucket, queue, notifications) with real names
- [ ] Deploy Worker and validate end-to-end automation

## Delivery phases
1. Local content pipeline
- Keep markdown files in bucket root (or one folder and filter by prefix)
- Run `npm run manifest:build` locally for initial `manifest.json`
- Upload `index.html` and `manifest.json` with markdown files

2. Cloudflare event pipeline
- Create Queue (example: `content-events`)
- Configure R2 Event Notifications:
  - Source: your content bucket
  - Events: object created + object deleted
  - Destination: Queue above
- Bind queue consumer + bucket to Worker in `wrangler.toml`

3. Worker deployment
- Set real values in `wrangler.toml`:
  - `bucket_name`
  - `queues.consumers.queue`
- Deploy with `npm run worker:deploy`
- Verify Worker can write `manifest.json` back to bucket

4. Verification
- Add a new `.md` file to the bucket
- Confirm queue event is delivered
- Confirm `manifest.json` `generatedAt` changes and file list updates
- Reload site and confirm new preview card appears

## Operational notes
- Manifest entries are sorted newest-first by upload or file modified time.
- The site currently renders the latest 6 entries (`MAX_PREVIEWS` in `index.html`).
- The Worker includes `/rebuild-manifest` endpoint for manual rebuild/testing.

## Next implementation tasks
1. Add CI step to run `npm run manifest:build` before publishing static files.
2. Optional: move markdown into `posts/` prefix and filter both builder + Worker.
3. Optional: add pagination in `index.html` based on manifest length.
