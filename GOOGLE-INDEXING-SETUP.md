# Google Indexing Setup

The project is prepared for normal Google crawling through crawlable pages, internal links, `robots.txt`, `sitemap.xml`, canonical URLs and structured data.

Before deployment, confirm the final public HTTPS URL in:

`scripts/seo-config.json`

If the public domain changes, update `productionBaseUrl` and rerun:

```powershell
node scripts/audit-fix-product-seo.js
```

If `node` is not available in your normal terminal, run the same script with the Node.js runtime bundled in your website maintenance environment.

## STEP 1

Deploy the website to the final public HTTPS domain.

## STEP 2

Open the public site and verify:

- homepage
- `robots.txt`
- `sitemap.xml`
- representative product pages

## STEP 3

Create or add the website property in Google Search Console.

## STEP 4

Verify ownership. Add the Google Search Console verification meta tag inside the marked placeholder in the page `<head>` files.

## STEP 5

Submit:

`https://FINAL-DOMAIN/sitemap.xml`

in Google Search Console.

## STEP 6

Use URL Inspection on:

- homepage
- Products page
- one Slack Adjuster product
- one Rubber Hose product
- important newly added pages

Run Live Test and request indexing where appropriate.

## STEP 7

Monitor:

- Page Indexing
- Sitemaps
- Crawl issues
- structured data issues

Google indexing is not guaranteed, but this setup removes known technical blockers that would prevent Google from crawling the intended public pages.
