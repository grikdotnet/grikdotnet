This is a static site that displays Markdown files.
The source code is available on GitHub:
https://github.com/grikdotnet/grikdotnet/tree/main

It works like a lightweight alternative to Obsidian:

* instant preview as you type
* links work when you publish files to web sites
* no dedicated application needed

Publish your pages with a mouse click for free.

### Free hosting

No web server, no TLS certificates, no CMS.

Works on any static hosting provider and locally without a web server:

* Cloudflare
* Github pages
* Vercel
* Google cloud
* Any static hosting provider
* Your local machine — just open index.html


### Edit Pages in Any Text Editor

Edit your pages in Notepad or any text editor. All modern editors support Markdown.

Open index.html locally to preview your pages instantly while writing — no web server, no build step, no additional software required.


### Setup

Create a local `.env` file based on `.env.example` (never commit it).

Install dependencies once:

```
npm install
```

### Editing pages

1. Edit or add local Markdown files.
2. Deploy changes to Clouflare by running deploy-r2.cmd or executing `npm run deploy:r2` in a terminal.

### What the deploy script does:

- Generates a per-file sha256 hash to skip uploading unchanged Markdown files
- For exact files (`favicon.svg`, `favicon.ico`), uploads only if missing remotely
- Uploads changed files
- Deletes stale files from the remote bucket

### Cloudflare Bucket and Redirect Setup

There is a script to assist setting up a Cloudflare Bucket for your site.

The script `scripts/bootstrap-cloudflare.mjs` can configure:
- Create R2 bucket
- Attach your domain to the bucket
- Set a redirect rule from the Top-Level Domain to www subdomain
- Configure it to serve index.html when accessing the site root

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
