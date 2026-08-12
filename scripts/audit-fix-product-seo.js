#!/usr/bin/env node

/*
 * Google indexing readiness audit + safe automatic repair for NIHON ASIA.
 *
 * This script intentionally centralizes the production SEO URL in scripts/seo-config.json.
 * Update that config before deployment if the final public HTTPS domain changes.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const configPath = path.join(projectRoot, "scripts", "seo-config.json");
const productsJsonPath = path.join(projectRoot, "assets", "data", "products.generated.json");
const productsJsPath = path.join(projectRoot, "assets", "data", "products.generated.js");
const catalogueJsonPath = path.join(projectRoot, "assets", "data", "catalogue.json");
const brandsJsonPath = path.join(projectRoot, "assets", "data", "brands.json");
const sitemapPath = path.join(projectRoot, "sitemap.xml");
const robotsPath = path.join(projectRoot, "robots.txt");
const reportPath = path.join(projectRoot, "tmp", "google-indexing-audit-report.json");
const writeDetailedReport = process.argv.includes("--write-report");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  if (!raw.trim()) return fallback;
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const config = readJson(configPath, {});
const siteBaseUrl = String(config.productionBaseUrl || "").trim().replace(/\/?$/, "/");
if (!/^https:\/\/[^/]+\/.+\/?$/.test(siteBaseUrl) && !/^https:\/\/[^/]+\/?$/.test(siteBaseUrl)) {
  throw new Error("scripts/seo-config.json must define a productionBaseUrl using a public HTTPS URL.");
}

const company = config.company || {};
const companyName = company.name || "NIHON ASIA ENTERPRISE";
const companyLegalName = company.legalName || "NIHON ASIA ENTERPRISE SDN. BHD.";
const companySubtitle = company.subtitle || "Heavy Duty Truck Parts";
const defaultOgImage = company.defaultOgImage || "assets/img/hero-truck-mountain-banner.png";
const companyLogo = company.logo || "assets/img/nihon-asia-logo.png";

const publicStaticPages = [
  {
    file: "index.html",
    path: "",
    title: "Heavy Duty Truck Parts | NIHON ASIA ENTERPRISE",
    description: "NIHON ASIA ENTERPRISE supplies OEM-quality heavy-duty truck parts and catalog support for commercial vehicles across Malaysia and Asia.",
    ogTitle: "Heavy Duty Truck Parts | NIHON ASIA ENTERPRISE",
    ogDescription: "Search and browse heavy-duty truck replacement parts by product code, description, engine model or brand.",
    indexable: true,
    organizationJsonLd: true,
    priority: "1.0"
  },
  {
    file: "products.html",
    path: "products.html",
    title: "Truck Spare Parts Catalog | NIHON ASIA ENTERPRISE",
    description: "Browse and search the NIHON ASIA heavy-duty truck spare parts catalog by product code, description, engine model, brand and OCR text.",
    ogTitle: "Truck Spare Parts Catalog | NIHON ASIA ENTERPRISE",
    ogDescription: "Search the NIHON ASIA heavy-duty truck parts catalog with crawlable product pages and product images.",
    indexable: true,
    priority: "0.9"
  },
  {
    file: "brands.html",
    path: "brands.html",
    title: "Truck Parts Brands | NIHON ASIA ENTERPRISE",
    description: "Browse NIHON ASIA heavy-duty truck parts brands and open the matching brand product pages.",
    ogTitle: "Truck Parts Brands | NIHON ASIA ENTERPRISE",
    ogDescription: "View heavy-duty truck parts brands supported by the NIHON ASIA catalog framework.",
    indexable: true,
    priority: "0.7"
  },
  {
    file: "about.html",
    path: "about.html",
    title: "About NIHON ASIA | Heavy Duty Truck Parts",
    description: "About NIHON ASIA ENTERPRISE, a Kuala Lumpur heavy-duty truck parts supplier and catalog support website for product identification and sales enquiries.",
    ogTitle: "About NIHON ASIA | Heavy Duty Truck Parts",
    ogDescription: "Learn about NIHON ASIA ENTERPRISE and its heavy-duty truck spare parts catalog support.",
    indexable: true,
    priority: "0.7"
  },
  {
    file: "contact.html",
    path: "contact.html",
    title: "Contact NIHON ASIA | Kuala Lumpur",
    description: "Contact the NIHON ASIA ENTERPRISE sales team directly via WhatsApp for heavy-duty truck parts enquiries.",
    ogTitle: "Contact NIHON ASIA | Kuala Lumpur",
    ogDescription: "Choose a NIHON ASIA sales representative for heavy-duty truck parts enquiries.",
    indexable: true,
    priority: "0.7"
  },
  {
    file: "brands/brand-1/index.html",
    path: "brands/brand-1/",
    title: "Huatai | NIHON ASIA ENTERPRISE",
    description: "Browse Huatai heavy-duty truck parts categories from NIHON ASIA ENTERPRISE.",
    ogTitle: "Huatai | NIHON ASIA ENTERPRISE",
    ogDescription: "Browse Huatai heavy-duty truck parts categories from NIHON ASIA ENTERPRISE.",
    indexable: true,
    priority: "0.6"
  },
  {
    file: "brands/xin-seng/index.html",
    path: "brands/xin-seng/",
    title: "XIN SENG | NIHON ASIA ENTERPRISE",
    description: "Browse XIN SENG heavy-duty truck parts categories from NIHON ASIA ENTERPRISE.",
    ogTitle: "XIN SENG | NIHON ASIA ENTERPRISE",
    ogDescription: "Browse XIN SENG heavy-duty truck parts categories from NIHON ASIA ENTERPRISE.",
    indexable: true,
    priority: "0.6"
  },
  {
    file: "search/index.html",
    path: "search/",
    title: "Internal Product Search | NIHON ASIA ENTERPRISE",
    description: "Internal product search interface for NIHON ASIA ENTERPRISE. Customers use the homepage and products catalog for public browsing.",
    ogTitle: "Internal Product Search | NIHON ASIA ENTERPRISE",
    ogDescription: "Internal product search interface for NIHON ASIA ENTERPRISE.",
    indexable: false,
    noindexReason: "Legacy/internal search page. Search result pages should not be indexed.",
    priority: "0.0"
  }
];

const legacyNoindexPrefixes = [
  "brands/brand-2/",
  "brands/brand-3/",
  "brands/brand-4/",
  "brands/brand-5/",
  "brands/brand-6/",
  "products/",
  "products/engine-parts/",
  "products/brake-system/",
  "products/clutch-system/",
  "products/cooling-system/",
  "products/electrical-system/",
  "products/steering-system/",
  "products/suspension-system/",
  "products/transmission-parts/",
  "products/axle-parts/",
  "products/trailer-parts/",
  "products/other/"
];

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
    const clean = String(value).replace(/\s+/g, " ").trim();
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

function normalizeUrlPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function absoluteUrl(relativePath = "") {
  return new URL(normalizeUrlPath(relativePath), siteBaseUrl).toString();
}

function relativeFromProductPage(assetPath) {
  return `../${normalizeUrlPath(assetPath)}`;
}

function localPath(relativePath) {
  return path.join(projectRoot, normalizeUrlPath(relativePath).replace(/\//g, path.sep));
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
    product.applications
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
  return firstText(product.slug, `${slugify(productCode(product))}-${categorySlug(product)}`);
}

function desiredUrl(product) {
  return normalizeUrlPath(firstText(product.url, `products/${desiredSlug(product)}.html`));
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
    for (const [name, value] of Object.entries(product.specifications)) addValues(name, value);
  }
  return values.slice(0, 40);
}

function jsonLdScript(data) {
  return JSON.stringify(data, null, 4).replace(/</g, "\\u003c");
}

function navHtml(prefix) {
  return `<div class="topline"><div class="container topline-inner"><span>Heavy-duty truck parts catalog</span><span>Search by code, model or brand</span><span>Malaysia</span></div></div>
  <header class="site-header" id="siteHeader">
    <div class="container nav-shell">
      <a class="brand" href="${prefix}index.html" aria-label="NIHON ASIA ENTERPRISE home"><span class="brand-mark"><img src="${prefix}assets/img/nihon-asia-logo.png" alt="NIHON ASIA ENTERPRISE logo"></span><span class="brand-copy"><strong>NIHON ASIA ENTERPRISE</strong><small>Heavy Duty Truck Parts</small></span></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="navMenu" aria-label="Open navigation"><span></span><span></span></button>
      <nav class="nav-menu" id="navMenu" aria-label="Main navigation"><a href="${prefix}index.html">Home</a><a href="${prefix}products.html" aria-current="page">Products</a><a href="${prefix}brands.html">Brands</a><a href="${prefix}about.html">About Us</a><a href="${prefix}contact.html">Contact Us</a></nav>
    </div>
  </header>`;
}

function footerHtml(prefix) {
  const mapsHref = "https://www.google.com/maps/search/?api=1&amp;query=8%2C%20Jalan%203%2F46a%2C%20Jalan%20Selingsing%207%2C%20Taman%20Niaga%20Waris%2C%2051200%20Kuala%20Lumpur%2C%20Federal%20Territory%20of%20Kuala%20Lumpur";
  return `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-company">
        <a class="brand brand-footer" href="${prefix}index.html" aria-label="NIHON ASIA ENTERPRISE home">
          <span class="brand-mark"><img src="${prefix}assets/img/nihon-asia-logo.png" alt="NIHON ASIA ENTERPRISE logo"></span>
          <span class="brand-copy"><strong>NIHON ASIA ENTERPRISE</strong><small>HEAVY DUTY TRUCK PARTS</small></span>
        </a>
      </div>

      <nav class="footer-column footer-links" aria-label="Footer quick links">
        <h2>QUICK LINKS</h2>
        <a href="${prefix}index.html">Home</a>
        <a href="${prefix}products.html">Products</a>
        <a href="${prefix}brands.html">Brands</a>
        <a href="${prefix}about.html">About Us</a>
        <a href="${prefix}contact.html">Contact Us</a>
      </nav>

      <div class="footer-column footer-location">
        <h2>OUR LOCATION</h2>
        <div class="footer-address-row">
          <span class="footer-icon footer-location-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 2.25c-3.86 0-7 3.06-7 6.84 0 5.04 6.17 12.13 6.43 12.43a.77.77 0 0 0 1.14 0C12.83 21.22 19 14.13 19 9.09c0-3.78-3.14-6.84-7-6.84Zm0 9.55a2.77 2.77 0 1 1 0-5.54 2.77 2.77 0 0 1 0 5.54Z"></path></svg></span>
          <address>
            <span>8, Jalan 3/46a,</span>
            <span>Jalan Selingsing 7,</span>
            <span>Taman Niaga Waris,</span>
            <span>51200 Kuala Lumpur,</span>
            <span>Federal Territory of Kuala Lumpur</span>
          </address>
        </div>
        <a class="footer-map-link" href="${mapsHref}" target="_blank" rel="noopener">VIEW ON GOOGLE MAPS <svg class="footer-external" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7"></path><path d="M9 7h8v8"></path></svg></a>
      </div>

      <div class="footer-column footer-whatsapp">
        <h2>WHATSAPP</h2>
        <div class="footer-whatsapp-lead">
          <span class="footer-icon footer-whatsapp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M19.05 4.93A9.84 9.84 0 0 0 12.04 2C6.58 2 2.14 6.42 2.14 11.86c0 1.73.45 3.43 1.31 4.93L2 22l5.33-1.4a9.95 9.95 0 0 0 4.71 1.19h.01c5.45 0 9.89-4.42 9.89-9.86a9.8 9.8 0 0 0-2.89-7zM12.05 20.1h-.01a8.27 8.27 0 0 1-4.22-1.16l-.3-.18-3.16.83.84-3.08-.2-.32a8.13 8.13 0 0 1-1.26-4.33c0-4.51 3.71-8.18 8.28-8.18a8.25 8.25 0 0 1 5.85 2.41 8.13 8.13 0 0 1 2.43 5.82c0 4.51-3.7 8.19-8.25 8.19zm4.54-6.13c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.98-.15.17-.3.19-.55.06-.25-.12-1.06-.39-2.01-1.24-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.3.37-.45.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.88-.2-.49-.41-.42-.57-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.03 2.59c.12.17 1.76 2.67 4.26 3.75.6.26 1.06.41 1.43.52.6.19 1.14.16 1.57.1.48-.07 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.29z"></path></svg></span>
          <span>CONTACT OUR SALES TEAM</span>
        </div>
        <a class="footer-sales-button" href="${prefix}contact.html">CONTACT SALES TEAM <svg class="footer-external" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7"></path><path d="M9 7h8v8"></path></svg></a>
      </div>
    </div>
    <div class="container footer-bottom"><span>&copy; 2026 NIHON ASIA ENTERPRISE SDN. BHD.</span><span>HEAVY-DUTY TRUCK PARTS CATALOG</span></div>
  </footer>`;
}

function productPageHtml(product) {
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
  const properties = additionalProperties(product);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "mpn": code,
    "category": category,
    "description": description,
    "image": imageUrl,
    "url": pageUrl
  };
  if (brand) productLd.brand = { "@type": "Brand", "name": brand };
  if (properties.length) productLd.additionalProperty = properties;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteBaseUrl },
      { "@type": "ListItem", "position": 2, "name": "Products", "item": absoluteUrl("products.html") },
      { "@type": "ListItem", "position": 3, "name": category, "item": absoluteUrl(`products.html?category=${encodeURIComponent(slug)}`) },
      { "@type": "ListItem", "position": 4, "name": code }
    ]
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta name="robots" content="index, follow">
  <!-- Google Search Console verification goes here -->
  <meta name="theme-color" content="#111111">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
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
  ${navHtml("../")}

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

  ${footerHtml("../")}
  <script src="../assets/js/site.js"></script>
</body>
</html>
`.replace(/\n/g, "\r\n");
}

function managedOrganizationJsonLd() {
  const address = company.address || {};
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": companyName,
    "legalName": companyLegalName,
    "description": company.description || "Heavy-duty truck spare parts and product catalog supplier.",
    "url": siteBaseUrl,
    "logo": absoluteUrl(companyLogo),
    "image": absoluteUrl(defaultOgImage),
    "address": {
      "@type": "PostalAddress",
      "streetAddress": address.streetAddress || "8, Jalan 3/46a, Jalan Selingsing 7, Taman Niaga Waris",
      "postalCode": address.postalCode || "51200",
      "addressLocality": address.addressLocality || "Kuala Lumpur",
      "addressRegion": address.addressRegion || "Federal Territory of Kuala Lumpur",
      "addressCountry": address.addressCountry || "MY"
    }
  };
}

function cleanManagedHead(html) {
  return html
    .replace(/\s*<meta\s+name=["']description["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']robots["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']googlebot["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<!--\s*Google Search Console verification goes here\s*-->\s*/gi, "\n")
    .replace(/\s*<!--\s*Intentionally noindex:[\s\S]*?-->\s*/gi, "\n")
    .replace(/\s*<meta\s+property=["']og:title["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+property=["']og:description["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+property=["']og:url["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+property=["']og:image["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<title>[\s\S]*?<\/title>\s*/gi, "\n")
    .replace(/\s*<script\s+type=["']application\/ld\+json["']\s+data-seo-managed=["']organization["']>[\s\S]*?<\/script>\s*/gi, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function managedHeadBlock(spec) {
  const canonical = absoluteUrl(spec.path);
  const robotsContent = spec.indexable ? "index, follow" : "noindex, follow";
  const noindexComment = spec.indexable ? "" : `  <!-- Intentionally noindex: ${escapeHtml(spec.noindexReason || "internal or placeholder page, not a public Google landing page.")} -->\n`;
  const orgJson = spec.organizationJsonLd
    ? `  <script type="application/ld+json" data-seo-managed="organization">\n  ${jsonLdScript(managedOrganizationJsonLd())}\n  </script>\n`
    : "";

  return `  <meta name="description" content="${escapeHtml(spec.description)}">
  <meta name="robots" content="${robotsContent}">
${noindexComment}  <!-- Google Search Console verification goes here -->
  <meta property="og:title" content="${escapeHtml(spec.ogTitle || spec.title)}">
  <meta property="og:description" content="${escapeHtml(spec.ogDescription || spec.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(absoluteUrl(defaultOgImage))}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <title>${escapeHtml(spec.title)}</title>
${orgJson}`;
}

function updateStaticPage(spec) {
  const filePath = localPath(spec.file);
  if (!fs.existsSync(filePath)) return { changed: false, missing: true };
  const before = fs.readFileSync(filePath, "utf8");
  let html = cleanManagedHead(before);
  const block = managedHeadBlock(spec);

  if (/<meta\s+name=["']viewport["'][^>]*>/i.test(html)) {
    html = html.replace(/(<meta\s+name=["']viewport["'][^>]*>\s*)/i, `$1\n${block}`);
  } else {
    html = html.replace(/(<head>\s*)/i, `$1\n${block}`);
  }
  html = html.replace(/\n{3,}/g, "\n\n");
  if (html !== before) fs.writeFileSync(filePath, html, "utf8");
  return { changed: html !== before, missing: false };
}

function inferNoindexSpec(relativeFile) {
  const clean = normalizeUrlPath(relativeFile);
  if (!clean.endsWith("index.html")) return null;
  const urlPath = clean.replace(/index\.html$/, "");
  if (!legacyNoindexPrefixes.includes(urlPath)) return null;

  const title = urlPath.startsWith("brands/")
    ? `${titleCaseFromSlug(path.basename(path.dirname(clean)))} Placeholder | NIHON ASIA ENTERPRISE`
    : `${titleCaseFromSlug(path.basename(path.dirname(clean)))} | NIHON ASIA ENTERPRISE`;

  const description = urlPath.startsWith("brands/")
    ? "Placeholder brand framework page retained for future brand setup. It is intentionally not indexed until real brand content is published."
    : "Legacy category framework page retained for internal compatibility. Customers should use the main products catalog page.";

  return {
    file: clean,
    path: urlPath,
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    indexable: false,
    noindexReason: urlPath.startsWith("brands/")
      ? "hidden placeholder brand framework page."
      : "legacy category framework page superseded by products.html category routing.",
    priority: "0.0"
  };
}

function normalizeProduct(product, existingUrls) {
  const next = { ...product };
  const code = productCode(next);
  if (!code) return { product: next, changes: ["missing product code"], valid: false };

  const changes = [];
  const slug = desiredSlug(next);
  const url = desiredUrl(next);
  const alt = imageAlt(next);

  if (!firstText(next.slug)) {
    next.slug = slug;
    changes.push("slug");
  }
  if (firstText(next.url) !== url) {
    next.url = url;
    changes.push("url");
  }
  if (firstText(next.alt) !== alt) {
    next.alt = alt;
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
  const productDataUpdatedAt = fs.existsSync(productsJsonPath)
    ? fs.statSync(productsJsonPath).mtime.toISOString().slice(0, 19)
    : "";
  const meta = {
    generatedAt: productDataUpdatedAt,
    totalProducts: products.length,
    source: "google-indexing-audit",
    searchIndexRebuilt: true,
    productSeoPagesChecked: report.productPagesChecked,
    productionBaseUrl: siteBaseUrl
  };
  const js = [
    "/* Auto-generated by scripts/audit-fix-product-seo.js. Do not edit by hand. */",
    `window.NAE_IMPORTED_PRODUCTS = ${JSON.stringify(products, null, 2)};`,
    `window.NAE_IMPORT_META = ${JSON.stringify(meta, null, 2)};`,
    ""
  ].join("\n");
  fs.writeFileSync(productsJsPath, js, "utf8");
}

function walkFiles(dir, predicate, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, output);
    } else if (!predicate || predicate(full)) {
      output.push(full);
    }
  }
  return output;
}

function relativeToProject(filePath) {
  return normalizeUrlPath(path.relative(projectRoot, filePath));
}

function htmlFiles() {
  return walkFiles(projectRoot, file => file.toLowerCase().endsWith(".html"))
    .filter(file => !relativeToProject(file).startsWith("tmp/"))
    .sort();
}

function fileMtimeDate(relativePath) {
  const filePath = localPath(relativePath || "index.html");
  if (!fs.existsSync(filePath)) return "";
  return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

function rebuildRobots() {
  const content = [
    "User-agent: *",
    "Disallow: /scripts/",
    "Disallow: /tmp/",
    "Disallow: /whatsapp-import/",
    "Disallow: /Slack%20Adjuster/",
    "Disallow: /Rubber%20Hose/",
    "Disallow: /WhatsApp%20Unknown%202026-07-20%20at%2010.37.03%20PM/",
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl("sitemap.xml")}`,
    ""
  ].join("\n");
  const before = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, "utf8") : "";
  if (before !== content) fs.writeFileSync(robotsPath, content, "utf8");
  return before !== content;
}

function rebuildSitemap(indexableStaticSpecs, products) {
  const sitemapItems = [];
  const add = (pathValue, priority) => {
    const loc = absoluteUrl(pathValue);
    if (sitemapItems.some(item => item.loc === loc)) return;
    sitemapItems.push({ loc, priority, lastmod: fileMtimeDate(pathValue || "index.html") });
  };

  for (const spec of indexableStaticSpecs) {
    if (spec.indexable) add(spec.path, spec.priority || "0.7");
  }
  for (const product of products) {
    add(product.url, "0.7");
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "",
    ...sitemapItems.map(item => [
      "<url>",
      `<loc>${item.loc}</loc>`,
      item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : "",
      `<priority>${item.priority}</priority>`,
      "</url>",
      ""
    ].filter(Boolean).join("\n")),
    "</urlset>",
    ""
  ].join("\n");

  const before = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
  if (before !== sitemap) fs.writeFileSync(sitemapPath, sitemap, "utf8");
  return {
    changed: before !== sitemap,
    urls: sitemapItems.map(item => item.loc)
  };
}

function extractJsonLd(html) {
  const output = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      output.push(JSON.parse(match[1]));
    } catch (error) {
      output.push({ __parseError: error.message });
    }
  }
  return output;
}

function parseAttrs(html, attr) {
  const values = [];
  const regex = new RegExp(`\\s${attr}\\s*=\\s*([\"'])(.*?)\\1`, "gi");
  for (const match of html.matchAll(regex)) values.push(match[2]);
  return values;
}

function resolveInternalReference(fromFile, value) {
  if (!value || /^(https?:|mailto:|tel:|sms:|data:|blob:|javascript:)/i.test(value)) return null;
  if (value.startsWith("#")) return null;
  const raw = value.split("#")[0].split("?")[0];
  if (!raw) return null;
  const fromDir = path.dirname(fromFile);
  const target = raw.startsWith("/")
    ? path.join(projectRoot, raw.replace(/^\/+/, ""))
    : path.resolve(fromDir, raw);
  return target;
}

function existingTarget(target) {
  if (!target) return true;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory() && fs.existsSync(path.join(target, "index.html"))) return true;
  if (fs.existsSync(`${target}.html`)) return true;
  return false;
}

function scanLocalUrls() {
  const textExtensions = new Set([".html", ".xml", ".txt", ".json", ".js", ".css", ".md", ".csv"]);
  const matches = [];
  for (const file of walkFiles(projectRoot, target => textExtensions.has(path.extname(target).toLowerCase()))) {
    const rel = relativeToProject(file);
    if (rel.startsWith("tmp/")) continue;
    if (rel === "scripts/audit-fix-product-seo.js") continue;
    const content = fs.readFileSync(file, "utf8");
    const regex = /file:\/\/|localhost|127\.0\.0\.1|C:\\Users/gi;
    let match;
    while ((match = regex.exec(content))) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      const publicSeo = /\.(html|xml|txt)$/i.test(file) && !rel.startsWith("whatsapp-import/") && !rel.startsWith("tmp/");
      matches.push({ file: rel, line, value: match[0], publicSeo, fixed: false });
    }
  }
  return matches;
}

function validateAll(products, sitemapUrls, indexableMap) {
  const issues = [];
  const warnings = [];
  const titles = new Map();
  const htmls = htmlFiles();
  const sitemapCounts = sitemapUrls.reduce((map, loc) => map.set(loc, (map.get(loc) || 0) + 1), new Map());

  for (const file of htmls) {
    const rel = relativeToProject(file);
    const html = fs.readFileSync(file, "utf8");
    const isProductDetail = rel.startsWith("products/") && rel.endsWith(".html") && !rel.endsWith("/index.html");
    const spec = indexableMap.get(rel);
    const indexable = isProductDetail || Boolean(spec?.indexable);
    const intentionallyNoindex = spec && spec.indexable === false;
    const title = firstText((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
    const desc = firstText((html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || [])[1]);
    const robots = firstText((html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i) || [])[1]);
    const canonical = firstText((html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i) || [])[1]);
    const ogUrl = firstText((html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i) || [])[1]);
    const expectedCanonical = isProductDetail
      ? absoluteUrl(rel)
      : spec ? absoluteUrl(spec.path) : "";

    if (indexable) {
      if (!title) issues.push(`${rel}: missing title`);
      if (!desc) issues.push(`${rel}: missing meta description`);
      if (!robots || /noindex/i.test(robots)) issues.push(`${rel}: missing index/follow robots directive or has noindex`);
      if (canonical !== expectedCanonical) issues.push(`${rel}: canonical mismatch`);
      if (ogUrl !== expectedCanonical) issues.push(`${rel}: og:url mismatch`);
      if (!sitemapUrls.includes(expectedCanonical)) issues.push(`${rel}: missing sitemap URL`);
      if (sitemapCounts.get(expectedCanonical) !== 1) issues.push(`${rel}: duplicate sitemap URL`);
      titles.set(title, (titles.get(title) || 0) + 1);
    } else if (intentionallyNoindex) {
      if (!/noindex/i.test(robots)) issues.push(`${rel}: expected noindex for internal/placeholder page`);
      if (sitemapUrls.includes(expectedCanonical)) issues.push(`${rel}: noindex page is in sitemap`);
    }

    for (const href of parseAttrs(html, "href")) {
      const target = resolveInternalReference(file, href);
      if (target && !existingTarget(target)) issues.push(`${rel}: broken href ${href}`);
    }
    for (const src of parseAttrs(html, "src")) {
      const target = resolveInternalReference(file, src);
      if (target && !existingTarget(target)) issues.push(`${rel}: broken src ${src}`);
    }

    if (/file:\/\/|localhost|127\.0\.0\.1|C:\\Users/i.test(html) && !rel.startsWith("whatsapp-import/")) {
      issues.push(`${rel}: local/development URL found in public HTML`);
    }
  }

  for (const [title, count] of titles.entries()) {
    if (title && count > 1) warnings.push(`Duplicate title among indexable pages: ${title}`);
  }

  const productUrlSet = new Set();
  for (const product of products) {
    const code = productCode(product);
    const rel = normalizeUrlPath(product.url);
    const productFile = localPath(rel);
    const expectedCanonical = absoluteUrl(rel);
    if (!code) issues.push(`Product record missing product code: ${product.id || product.name || "unknown"}`);
    if (productUrlSet.has(rel.toLowerCase())) issues.push(`${code}: duplicate product URL in database`);
    productUrlSet.add(rel.toLowerCase());
    if (!fs.existsSync(productFile)) {
      issues.push(`${code}: missing product detail HTML page ${rel}`);
      continue;
    }
    const html = fs.readFileSync(productFile, "utf8");
    const jsonLd = extractJsonLd(html);
    const productLd = jsonLd.find(item => item && item["@type"] === "Product");
    const breadcrumbLd = jsonLd.find(item => item && item["@type"] === "BreadcrumbList");
    if (!productLd || productLd.__parseError) issues.push(`${code}: invalid Product JSON-LD`);
    if (productLd && productLd.offers) issues.push(`${code}: Product JSON-LD contains unconfirmed offers`);
    if (productLd && productLd.aggregateRating) issues.push(`${code}: Product JSON-LD contains unconfirmed rating`);
    if (!breadcrumbLd || breadcrumbLd.__parseError) issues.push(`${code}: invalid Breadcrumb JSON-LD`);
    if (!html.includes(`rel="canonical" href="${expectedCanonical}"`)) issues.push(`${code}: product canonical mismatch`);
    const img = imagePath(product);
    if (!img || !fs.existsSync(localPath(img))) issues.push(`${code}: missing product image ${img}`);
    if (!html.includes(`alt="${escapeHtml(imageAlt(product))}"`)) issues.push(`${code}: product image alt mismatch`);
  }

  return { issues: unique(issues), warnings: unique(warnings) };
}

function main() {
  const report = {
    productionBaseUrl: siteBaseUrl,
    productionUrlSource: config.productionUrlSource || "scripts/seo-config.json",
    publicPagesChecked: 0,
    productPagesChecked: 0,
    indexablePages: 0,
    intentionalNoindexPages: 0,
    accidentalNoindexTagsFoundOrFixed: 0,
    robotsTxtStatus: "",
    sitemapUrlCount: 0,
    duplicateSitemapUrls: 0,
    brokenInternalUrls: 0,
    missingProductPages: 0,
    canonicalProblems: 0,
    localDevelopmentUrlsFound: 0,
    publicSeoLocalUrlsFound: 0,
    structuredDataProblems: 0,
    imagePathProblems: 0,
    pagesRequiringManualReview: [],
    productDataChanges: 0,
    productSeoPagesGeneratedOrRepaired: 0,
    sitemapChanged: false,
    robotsChanged: false,
    searchIndexRebuilt: false,
    finalAuditPassed: false,
    finalAuditIssues: [],
    finalAuditWarnings: []
  };

  const products = readJson(productsJsonPath, []);
  const existingUrls = new Set();
  const normalizedProducts = [];

  for (const original of products) {
    const normalized = normalizeProduct(original, existingUrls);
    normalizedProducts.push(normalized.product);
    if (normalized.changes.length) report.productDataChanges += 1;
    if (!normalized.valid) report.pagesRequiringManualReview.push(`${productCode(original) || original.id || "Unknown"}: ${normalized.changes.join(", ")}`);
  }

  const originalProductsJson = fs.existsSync(productsJsonPath) ? fs.readFileSync(productsJsonPath, "utf8") : "";
  const normalizedProductsJson = `${JSON.stringify(normalizedProducts, null, 2)}\n`;
  if (originalProductsJson !== normalizedProductsJson) {
    fs.writeFileSync(productsJsonPath, normalizedProductsJson, "utf8");
  }

  for (const product of normalizedProducts) {
    const url = desiredUrl(product);
    product.url = url;
    const filePath = localPath(url);
    const existed = fs.existsSync(filePath);
    const before = existed ? fs.readFileSync(filePath, "utf8") : "";
    const html = productPageHtml(product);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (before !== html) {
      fs.writeFileSync(filePath, html, "utf8");
      report.productSeoPagesGeneratedOrRepaired += 1;
    }
    if (!existed) report.missingProductPages += 1;
  }
  report.productPagesChecked = normalizedProducts.length;
  rebuildGeneratedJs(normalizedProducts, report);
  report.searchIndexRebuilt = true;

  const allSpecs = [...publicStaticPages];
  for (const file of htmlFiles()) {
    const rel = relativeToProject(file);
    if (allSpecs.some(spec => normalizeUrlPath(spec.file) === rel)) continue;
    const noindexSpec = inferNoindexSpec(rel);
    if (noindexSpec) allSpecs.push(noindexSpec);
  }

  const indexableMap = new Map();
  for (const spec of allSpecs) {
    const rel = normalizeUrlPath(spec.file);
    indexableMap.set(rel, spec);
    const before = fs.existsSync(localPath(spec.file)) ? fs.readFileSync(localPath(spec.file), "utf8") : "";
    const hadNoindex = /<meta\s+name=["']robots["'][^>]+noindex/i.test(before);
    const updated = updateStaticPage(spec);
    if (!spec.indexable && !hadNoindex) report.accidentalNoindexTagsFoundOrFixed += 0;
    if (spec.indexable && hadNoindex) report.accidentalNoindexTagsFoundOrFixed += 1;
    if (updated.missing) report.pagesRequiringManualReview.push(`${spec.file}: missing static page`);
  }

  report.robotsChanged = rebuildRobots();
  report.robotsTxtStatus = "Allows intended public pages/assets and blocks internal import/tooling folders; sitemap URL points to production HTTPS sitemap.";
  const sitemap = rebuildSitemap(allSpecs.filter(spec => spec.indexable), normalizedProducts);
  report.sitemapChanged = sitemap.changed;
  report.sitemapUrlCount = sitemap.urls.length;
  report.duplicateSitemapUrls = sitemap.urls.length - new Set(sitemap.urls).size;
  report.publicPagesChecked = htmlFiles().length;
  report.indexablePages = allSpecs.filter(spec => spec.indexable).length + normalizedProducts.length;
  report.intentionalNoindexPages = allSpecs.filter(spec => spec.indexable === false).length;

  const validation = validateAll(normalizedProducts, sitemap.urls, indexableMap);
  report.finalAuditIssues = validation.issues;
  report.finalAuditWarnings = validation.warnings;
  report.brokenInternalUrls = validation.issues.filter(issue => /broken (href|src)/i.test(issue)).length;
  report.canonicalProblems = validation.issues.filter(issue => /canonical/i.test(issue)).length;
  report.structuredDataProblems = validation.issues.filter(issue => /JSON-LD|offers|rating/i.test(issue)).length;
  report.imagePathProblems = validation.issues.filter(issue => /image|broken src/i.test(issue)).length;

  const localUrlMatches = scanLocalUrls();
  report.localDevelopmentUrlsFound = localUrlMatches.length;
  report.publicSeoLocalUrlsFound = localUrlMatches.filter(match => match.publicSeo).length;
  report.localDevelopmentUrlMatches = localUrlMatches;
  if (report.publicSeoLocalUrlsFound > 0) {
    report.finalAuditIssues.push("Public SEO files still contain local/development URLs.");
  }

  report.finalAuditIssues = unique(report.finalAuditIssues);
  report.finalAuditPassed = report.finalAuditIssues.length === 0 && report.duplicateSitemapUrls === 0;

  if (writeDetailedReport) {
    writeJson(reportPath, report);
  }

  const consoleReport = writeDetailedReport
    ? report
    : { ...report, localDevelopmentUrlMatches: `${localUrlMatches.length} internal matches omitted from console output. Run with --write-report for the full local-path detail file.` };
  console.log(JSON.stringify(consoleReport, null, 2));
}

main();
