# AGENTS.md

This file gives operational instructions to coding agents working in this repository.

## Scope
- Applies to the entire repo rooted at this folder.

## Project Summary
- Static blog site.
- Main app shell: `index.html`.
- Articles are root-level `.md` files rendered by `index.html`.
- Deployment script: `scripts/deploy-r2.mjs`.
- Manifest generator: `scripts/generate-manifest.mjs`.

## File Access
- Read and edit files directly in this workspace.
- Prefer fast search:
  - `rg --files` to list files.
  - `rg "<pattern>"` to find usages.
- Key files:
  - `index.html` for frontend behavior.
  - `feed.xml`, `sitemap.xml` for metadata.
  - `scripts/*.mjs` for deploy/build logic.
  - `.env.example` for required environment variables.

## Edit Workflow
1. Locate relevant code with `rg`.
2. Make minimal, focused changes.
3. Preserve existing style and structure.
4. Avoid unrelated refactors.
5. Verify behavior with targeted checks.

## Caching/HTTP Notes
- `index.html` should generally be cacheable with revalidation strategy defined by deploy headers.
- Markdown article fetches must not force `no-store` unless explicitly required.
- Response headers are controlled during upload in `scripts/deploy-r2.mjs` via:
  - `cacheControlFor(filename)`
  - `contentTypeFor(filename)`

## Deployment Notes
- Deploy command: `npm run deploy:r2`
- Manifest build command: `npm run manifest:build`
- Deployment reads env vars from `.env` (if present), including:
  - `R2_S3_API_URL`
  - `R2_ACCOUNT_ID`
  - `R2_BUCKET`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`

## Safety Rules
- Do not delete or rewrite unrelated files.
- Do not run destructive git commands unless explicitly requested.
- If unexpected unrelated diffs appear, stop and ask before proceeding.

## Done Criteria for Changes
- Code updated in the smallest correct location.
- No obvious regressions in related flows.
- Any behavior-impacting change is explained in the final response with file path references.
