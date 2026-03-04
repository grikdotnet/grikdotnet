## Static Markdown Site

This repository is initialized as a static site that renders preview cards from markdown files via `manifest.json`.

### Commands

- `npm run manifest:build` generates `manifest.json` from local `*.md` files.
- `npm run worker:dev` runs the Cloudflare Worker locally.
- `npm run worker:deploy` deploys the Worker.

### Cloudflare flow

1. Host static files (`index.html`, markdown files, `manifest.json`) in a public R2 bucket.
2. Configure R2 object create/delete events to publish to a Cloudflare Queue.
3. Worker queue consumer rebuilds and writes `manifest.json` to the bucket.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full rollout plan.
