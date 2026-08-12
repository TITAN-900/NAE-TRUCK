#!/usr/bin/env node

/*
 * Audits and repairs SEO for every imported product in assets/data/products.generated.json.
 *
 * Scope:
 * - Generate/repair crawlable product detail HTML pages.
 * - Ensure title, meta description, canonical, image alt, Product JSON-LD and Breadcrumb JSON-LD.
 * - Ensure sitemap.xml contains every product URL exactly once and no broken product URLs.
 * - Preserve existing product codes, descriptions, brands, vehicle models, OCR/spec/search fields.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const productsJsonPath = path.join(projectRoot, "assets", "data", "products.generated.json");
const productsJsPath = path.join(projectRoot, "assets", "data", "products.generated.js");
const productsDir = path.join(projectRoot, "products");
const sitemapPath = path.join(projectRoot, "sitemap.xml");
const siteBaseUrl = "https://titan-900.github.io/NAE-TRUCK/";

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  if (!raw.trim()) return fallback;
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toArray(value) {
  if (Array.isArray(value)) return value.flatMap(toArray);
  if (value && typeof value === "object") return Object.values(value).flatMap(toArray);
  const text = String(value ?? "").trim();
  return text ? [text] : [];
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of toArray(values)) {
    const clean = value.replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    output.push(clean);
  }
  return output;
}

function firstText(...values) {
  for (const value of values) {
    const text = toArray(value)[0];
    if (text) return text;
  }
  return "";
}

function slugify(value) {
  return String(value || "product")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "product";
}

function absoluteUrl(relativePath) {
  return new URL(String(relativePath || "").replace(/^\/+/, ""), siteBaseUrl).toString();
}

function relativeFromProductPage(assetPath) {
  const clean = String(assetPath || "").replace(/^\/+/, "");
  return `../${clean}`;
}

function localPath(relativePath) {
  return path.join(projectRoot, String(relativePath || "").replace(/^\/+/, "").replace(/\//g, path.sep));
}

function productCode(product) {
  return firstText(product.productNumber, product.partNumber, product.number, product.code, product.id);
}

function categorySlug(product) {
  return String(product.category || product.categorySlug || "other")
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "other";
}

function titleCaseFromSlug(slug) {
  return String(slug || "Product")
    .split("-")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function categoryLabel(product) {
  return firstText(product.categoryLabel, titleCaseFromSlug(categorySlug(product)));
}

function productName(product) {
  const slug = categorySlug(product);
  if (slug === "rubber-hose") {
    return firstText(product.productName, product.name, product.visibleDescription, "Rubber Hose");
  }
  return firstText(product.productName, product.name, product.visibleDescription, categoryLabel(product));
}

function productDescription(product) {
  return firstText(product.description, product.longDescription, product.visibleDescription, productName(product));
}

function visibleSummary(product) {
  if (categorySlug(product) === "rubber-hose") {
    return firstText(product.visibleDescription, productName(product));
  }
  return productDescription(product);
}

function vehicleModel(product) {
  return unique([
    product.vehicleModel,
    product.vehicleModels,
    product.application,
    product.applications,
  ]).join(", ");
}

function cleanBrand(product) {
  const brand = firstText(product.brand);
  if (!brand || /^brand not specified$/i.test(brand)) return "";
  return brand;
}

function imagePath(product) {
  return firstText(product.image, product.thumbnail, product.images?.[0]);
}

function seoTitle(product) {
  const code = productCode(product);
  if (categorySlug(product) === "rubber-hose") {
    return `${code} Rubber Hose | Heavy Truck Parts | NIHON ASIA ENTERPRISE`;
  }
  return `${code} ${productName(product)} | Heavy Truck Parts | NIHON ASIA ENTERPRISE`;
}

function seoMetaDescription(product) {
  const code = productCode(product);
  const name = productName(product);
  const vehicle = vehicleModel(product);
  const category = categoryLabel(product);
  const base = `View product information and catalog image for ${code} ${name} supplied by NIHON ASIA ENTERPRISE`;
  const withVehicle = vehicle ? `${base}, with vehicle reference ${vehicle}.` : `${base}.`;
  if (withVehicle.length <= 165) return withVehicle;
  const categoryBase = `View product information and catalog image for ${code} ${category} supplied by NIHON ASIA ENTERPRISE`;
  const categoryWithVehicle = vehicle ? `${categoryBase}, with vehicle reference ${vehicle}.` : `${categoryBase}.`;
  if (categoryWithVehicle.length <= 165) return categoryWithVehicle;
  const shorter = `${categoryBase}.`;
  if (shorter.length <= 165) return shorter;
  return `View product information and catalog image for ${code} supplied by NIHON ASIA ENTERPRISE.`;
}

function imageAlt(product) {
  const code = productCode(product);
  const vehicle = vehicleModel(product);
  if (categorySlug(product) === "rubber-hose") {
    return `${code} Rubber Hose${vehicle ? ` for ${vehicle}` : ""} heavy duty truck part`;
  }
  return `${code} ${productName(product)}${vehicle ? ` for ${vehicle}` : ""} heavy duty truck part`;
}

function desiredSlug(product) {
  const existingSlug = firstText(product.slug);
  if (existingSlug) return existingSlug;
  return `${slugify(productCode(product))}-${categorySlug(product)}`;
}

function desiredUrl(product) {
  const existingUrl = firstText(product.url);
  if (existingUrl) return existingUrl.replace(/^\/+/, "");
  return `products/${desiredSlug(product)}.html`;
}

function visibleDetailRows(product) {
  const rows = [];
  const addRow = (label, value) => {
    const text = firstText(value);
    if (text) rows.push({ label, value: text });
  };

  addRow("Product Code", productCode(product));
  addRow("Category", categoryLabel(product));
  addRow("Brand", cleanBrand(product));
  addRow("Vehicle / Truck Model", vehicleModel(product));
  return rows;
}

function visibleDetailHtml(product) {
  return visibleDetailRows(product)
    .map(row => `            <div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`)
    .join("\n");
}

function additionalProperties(product) {
  const values = [];
  const addValues = (name, value) => {
    for (const item of unique(value)) {
      if (item) values.push({ "@type": "PropertyValue", name, value: item });
    }
  };

  addValues("Vehicle / Truck Model", [product.vehicleModel, product.vehicleModels, product.application]);
  addValues("Engine Model", [product.engineModel, product.engineModels]);
  addValues("OE Number", [product.oeNumber, product.oeNumbers]);
  addValues("Alternate Part Number", [product.alternateNumbers, product.alternatePartNumbers]);
  addValues("Specification", [product.specs, product.specification]);

  if (product.specifications && typeof product.specifications === "object") {
    for (const [name, value] of Object.entries(product.specifications)) {
      addValues(name, value);
    }
  }

  return values.slice(0, 40);
}

function jsonLdScript(data) {
  return JSON.stringify(data, null, 4).replace(/</g, "\\u003c");
}

function pageHtml(product) {
  const code = productCode(product);
  const name = productName(product);
  const description = productDescription(product);
  const summary = visibleSummary(product);
  const category = categoryLabel(product);
  const slug = categorySlug(product);
  const image = imagePath(product);
  const alt = imageAlt(product);
  const pageUrl = absoluteUrl(product.url);
  const imageUrl = absoluteUrl(image);
  const imageSrc = relativeFromProductPage(image);
  const brand = cleanBrand(product);
  const title = seoTitle(product);
  const metaDescription = seoMetaDescription(product);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: code,
    category,
    description,
    image: imageUrl,
    url: pageUrl,
  };
  if (brand) {
    productLd.brand = { "@type": "Brand", name: brand };
  }
  const properties = additionalProperties(product);
  if (properties.length) {
    productLd.additionalProperty = properties;
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteBaseUrl },
      { "@type": "ListItem", position: 2, name: "Products", item: absoluteUrl("products.html") },
      { "@type": "ListItem", position: 3, name: category, item: absoluteUrl(`products.html?category=${slug}`) },
      { "@type": "ListItem", position: 4, name: code },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta name="theme-color" content="#111111">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <link rel="icon" href="../assets/img/nihon-asia-logo.png">
  <script type="application/ld+json">
  ${jsonLdScript(productLd)}
  </script>
  <script type="application/ld+json">
  ${jsonLdScript(breadcrumbLd)}
  </script>
</head>
<body class="category-page product-detail-page">
  <a class="skip-link" href="#productDetail">Skip to product detail</a>
  <div class="topline"><div class="container topline-inner"><span>Heavy-duty truck parts catalog</span><span>Search by code, model or brand</span><span>Malaysia</span></div></div>
  <header class="site-header" id="siteHeader">
    <div class="container nav-shell">
      <a class="brand" href="../index.html" aria-label="NIHON ASIA ENTERPRISE home"><span class="brand-mark"><img src="../assets/img/nihon-asia-logo.png" alt="NIHON ASIA ENTERPRISE logo"></span><span class="brand-copy"><strong>NIHON ASIA ENTERPRISE</strong><small>Heavy Duty Truck Parts</small></span></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="navMenu" aria-label="Open navigation"><span></span><span></span></button>
      <nav class="nav-menu" id="navMenu" aria-label="Main navigation"><a href="../index.html">Home</a><a href="../products.html" aria-current="page">Products</a><a href="../brands.html">Brands</a><a href="../about.html">About Us</a><a href="../contact.html">Contact Us</a></nav>
    </div>
  </header>

  <main id="productDetail">
    <section class="category-hero product-detail-hero">
      <div class="container">
        <div class="breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="../products.html">Products</a><span>/</span><a href="../products.html?category=${escapeHtml(slug)}">${escapeHtml(category)}</a><span>/</span><span>${escapeHtml(code)}</span></div>
        <div class="category-hero-grid">
          <div class="category-hero-copy"><p class="eyebrow eyebrow-light"><span></span> Product detail</p><h1>${escapeHtml(code)}</h1><p>${escapeHtml(name)}</p></div>
        </div>
      </div>
    </section>

    <section class="product-detail-section">
      <div class="container product-detail-layout">
        <figure class="product-detail-media">
          <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(alt)}" loading="eager" decoding="async">
        </figure>
        <article class="product-detail-panel">
          <p class="eyebrow"><span></span> ${escapeHtml(category)}</p>
          <h2>${escapeHtml(name)}</h2>
          <p class="product-detail-summary">${escapeHtml(summary)}</p>
          <dl class="product-detail-specs">
${visibleDetailHtml(product)}
          </dl>
          <div class="product-detail-actions">
            <a class="button button-orange" href="../contact.html">Enquire <span>&nearr;</span></a>
            <a class="button button-dark" href="../products.html?category=${escapeHtml(slug)}">Back to ${escapeHtml(category)} <span>&nearr;</span></a>
          </div>
        </article>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container footer-grid">
      <a class="brand brand-footer" href="../index.html"><span class="brand-mark"><img src="../assets/img/nihon-asia-logo.png" alt="NIHON ASIA ENTERPRISE logo"></span><span class="brand-copy"><strong>NIHON ASIA ENTERPRISE</strong><small>Heavy Duty Truck Parts</small></span></a>
    </div>
    <div class="container footer-bottom"><span>&copy; <span id="year"></span> NIHON ASIA ENTERPRISE Sdn. Bhd.</span><span>Heavy-duty truck parts catalog</span></div>
  </footer>
  <script src="../assets/js/site.js"></script>
</body>
</html>
`.replace(/\n/g, "\r\n");
}

function normalizeProduct(product, existingUrls) {
  const next = { ...product };
  const code = productCode(next);
  const slug = desiredSlug(next);
  const url = desiredUrl(next);

  if (!code) return { product: next, changes: ["missing product code"], valid: false };

  const changes = [];
  if (!firstText(next.slug)) {
    next.slug = slug;
    changes.push("slug");
  }
  if (!firstText(next.url)) {
    next.url = url;
    changes.push("url");
  }
  if (!firstText(next.alt) || next.alt !== imageAlt(next)) {
    next.alt = imageAlt(next);
    changes.push("image alt");
  }

  const urlKey = next.url.toLowerCase();
  if (existingUrls.has(urlKey)) {
    changes.push("duplicate URL");
    return { product: next, changes, valid: false };
  }
  existingUrls.add(urlKey);

  return { product: next, changes, valid: true };
}

function rebuildGeneratedJs(products, report) {
  const meta = {
    generatedAt: new Date().toISOString().slice(0, 19),
    totalProducts: products.length,
    source: "product-seo-audit",
    searchIndexRebuilt: true,
    seoPagesChecked: report.productSeoPagesChecked,
    seoElementsRepaired: report.seoElementsRepaired,
  };
  const js = [
    "/* Auto-generated by scripts/audit-fix-product-seo.js. Do not edit by hand. */",
    `window.NAE_IMPORTED_PRODUCTS = ${JSON.stringify(products, null, 2)};`,
    `window.NAE_IMPORT_META = ${JSON.stringify(meta, null, 2)};`,
    "",
  ].join("\n");
  fs.writeFileSync(productsJsPath, js, "utf8");
}

function rebuildSitemap(products) {
  const existing = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
  const existingLocs = [...existing.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  const productLocs = new Set(products.map(product => absoluteUrl(product.url)));
  const seen = new Set();
  const baseUrls = [];
  let duplicateRemoved = 0;
  let brokenRemoved = 0;

  for (const loc of existingLocs) {
    const isProduct = loc.includes("/products/") && loc.endsWith(".html");
    if (isProduct) {
      if (!productLocs.has(loc)) {
        brokenRemoved += 1;
      }
      continue;
    }
    if (seen.has(loc)) {
      duplicateRemoved += 1;
      continue;
    }
    seen.add(loc);
    baseUrls.push(loc);
  }

  const urls = [
    ...baseUrls.map(loc => ({ loc, priority: loc === siteBaseUrl ? "1.0" : loc.endsWith("products.html") ? "0.9" : "0.7" })),
    ...[...productLocs].sort().map(loc => ({ loc, priority: "0.7" })),
  ];

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">',
    "",
    ...urls.map(item => `<url>\n<loc>${item.loc}</loc>\n<priority>${item.priority}</priority>\n</url>\n`),
    "</urlset>",
    "",
  ].join("\n");

  fs.writeFileSync(sitemapPath, sitemap, "utf8");
  return {
    sitemapUrlsAdded: [...productLocs].filter(loc => !existingLocs.includes(loc)).length,
    duplicateSitemapUrlsRemoved: duplicateRemoved + existingLocs.filter((loc, index) => existingLocs.indexOf(loc) !== index && productLocs.has(loc)).length,
    brokenSitemapUrlsRemoved: brokenRemoved,
  };
}

function extractJsonLd(html) {
  const output = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    output.push(JSON.parse(match[1]));
  }
  return output;
}

function finalAudit(products) {
  const issues = [];
  const titles = new Map();
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  const locCounts = locs.reduce((map, loc) => map.set(loc, (map.get(loc) || 0) + 1), new Map());

  for (const product of products) {
    const code = productCode(product);
    const filePath = localPath(product.url);
    const expectedCanonical = absoluteUrl(product.url);
    if (!fs.existsSync(filePath)) {
      issues.push(`${code}: missing HTML page`);
      continue;
    }
    const html = fs.readFileSync(filePath, "utf8");
    const title = firstText((html.match(/<title>(.*?)<\/title>/is) || [])[1]);
    const meta = firstText((html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || [])[1]);
    const canonical = firstText((html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1]);
    const figure = firstText((html.match(/<figure class="product-detail-media">([\s\S]*?)<\/figure>/i) || [])[1]);
    const alt = firstText((figure.match(/<img[^>]+alt="([^"]*)"/i) || [])[1]);
    const jsonLd = extractJsonLd(html);
    const productLd = jsonLd.find(item => item && item["@type"] === "Product");
    const breadcrumbLd = jsonLd.find(item => item && item["@type"] === "BreadcrumbList");

    if (!title || !title.includes(code)) issues.push(`${code}: weak/missing title`);
    if (!meta || !meta.includes(code)) issues.push(`${code}: weak/missing meta description`);
    if (canonical !== expectedCanonical) issues.push(`${code}: invalid canonical`);
    if (!alt || !alt.includes(code)) issues.push(`${code}: weak/missing image alt`);
    if (!productLd || productLd.sku !== code || productLd.url !== expectedCanonical) issues.push(`${code}: invalid Product JSON-LD`);
    if (!breadcrumbLd || !Array.isArray(breadcrumbLd.itemListElement) || breadcrumbLd.itemListElement.length < 4) issues.push(`${code}: invalid Breadcrumb JSON-LD`);
    if (!locs.includes(expectedCanonical)) issues.push(`${code}: missing sitemap URL`);
    if (locCounts.get(expectedCanonical) !== 1) issues.push(`${code}: duplicate sitemap URL`);
    if (/noindex/i.test(html)) issues.push(`${code}: noindex present`);
    titles.set(title, (titles.get(title) || 0) + 1);
  }

  for (const [title, count] of titles.entries()) {
    if (title && count > 1) issues.push(`duplicate title: ${title}`);
  }

  return issues;
}

function main() {
  const originalProducts = readJson(productsJsonPath, []);
  const report = {
    totalProductsChecked: originalProducts.length,
    productSeoPagesChecked: 0,
    missingSeoElementsFound: 0,
    seoElementsRepaired: 0,
    brokenLinksRepaired: 0,
    missingHtmlPagesGenerated: 0,
    productJsonLdAddedOrFixed: 0,
    breadcrumbJsonLdAddedOrFixed: 0,
    sitemapUrlsAdded: 0,
    duplicateSitemapUrlsRemoved: 0,
    productsRequiringManualReview: 0,
    remainingSeoErrors: [],
    categories: {},
    repairedProducts: [],
  };

  const existingUrls = new Set();
  const normalizedProducts = [];

  for (const original of originalProducts) {
    report.categories[categorySlug(original)] = (report.categories[categorySlug(original)] || 0) + 1;
    if (original.needsReview || original.needsManualReview) report.productsRequiringManualReview += 1;

    const beforeUrl = firstText(original.url);
    const normalized = normalizeProduct(original, existingUrls);
    normalizedProducts.push(normalized.product);

    if (!normalized.valid) {
      report.remainingSeoErrors.push(`${productCode(original) || original.id || "Unknown"}: ${normalized.changes.join(", ")}`);
      continue;
    }

    const filePath = localPath(normalized.product.url);
    const existed = fs.existsSync(filePath);
    const beforeHtml = existed ? fs.readFileSync(filePath, "utf8") : "";
    const nextHtml = pageHtml(normalized.product);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, nextHtml, "utf8");

    report.productSeoPagesChecked += 1;

    const changes = [...normalized.changes];
    if (!existed) {
      report.missingHtmlPagesGenerated += 1;
      report.brokenLinksRepaired += beforeUrl ? 1 : 0;
      changes.push("missing HTML page");
    }
    if (!beforeHtml.includes('rel="canonical"') || !beforeHtml.includes(absoluteUrl(normalized.product.url))) changes.push("canonical");
    if (!beforeHtml.includes('type="application/ld+json"') || !beforeHtml.includes('"@type": "Product"')) {
      report.productJsonLdAddedOrFixed += 1;
      changes.push("Product JSON-LD");
    } else if (beforeHtml !== nextHtml) {
      report.productJsonLdAddedOrFixed += 1;
      changes.push("Product JSON-LD");
    }
    if (!beforeHtml.includes('"@type": "BreadcrumbList"')) {
      report.breadcrumbJsonLdAddedOrFixed += 1;
      changes.push("Breadcrumb JSON-LD");
    } else if (beforeHtml !== nextHtml) {
      report.breadcrumbJsonLdAddedOrFixed += 1;
      changes.push("Breadcrumb JSON-LD");
    }

    if (beforeHtml !== nextHtml || normalized.changes.length) {
      report.seoElementsRepaired += 1;
      report.missingSeoElementsFound += 1;
      report.repairedProducts.push(productCode(normalized.product));
    }
  }

  writeJson(productsJsonPath, normalizedProducts);
  rebuildGeneratedJs(normalizedProducts, report);
  const sitemapReport = rebuildSitemap(normalizedProducts);
  Object.assign(report, sitemapReport);

  report.remainingSeoErrors.push(...finalAudit(normalizedProducts));
  report.remainingSeoErrors = unique(report.remainingSeoErrors);

  console.log(JSON.stringify(report, null, 2));
}

main();
