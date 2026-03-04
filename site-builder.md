## Static Markdown Site

This is a static site that shows markdown files.
The source is on [github](https://github.com/grikdotnet/grikdotnet/tree/main)

### Any free hosting

Works from any free hosting and locally without a web server:
* Github pages
* Vercel
* Cloudflare
* Google cloud
* Any provider
* On your computer - just click `index.html`

No web server, no TLS certificates, no CMS to set up.

### Edit your pages in any text editor

Edit pages in a notepad, or your favorite text editor. They all support markdown.
Click `index.html`, and see how the page looks on your site.
Publish updates to Cloudflare with a click on `deploy-r2.cmd`.


### How to make it work

Create a local `.env` file (never commit it) based on `.env.example`.

Install dependencies once:

```powershell
npm install
```

### Publish flow

1. Edit or add local markdown files.
2. To deploy changes click `deploy-r2.cmd` or run in a terminal.

What it does:
- Runs `scripts/generate-manifest.mjs`
- Uploads `*.html`, `*.md`, `manifest.json` to the bucket
- Uses `--delete` so removed files are removed from bucket

### Cloudflare bucket and redirect setup

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
- `SITE_APEX_DOMAIN` (enables redirect rule)

Run:

```powershell
npm run bootstrap:cf:dry-run
npm run bootstrap:cf
```
