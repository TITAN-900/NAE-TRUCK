#!/usr/bin/env node

/*
 * Generates Slack Adjuster product detail pages from assets/data/products.generated.json.
 *
 * Customer-facing detail fields are intentionally whitelisted. Keep search/SEO data in
 * the product database, but only show Product Code, Category, Brand and Vehicle / Truck
 * Model in the visible information table. Vehicle / Truck Model must remain the final row.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const productDataPath = path.join(projectRoot, "assets", "data", "products.generated.json");
const productsDir = path.join(projectRoot, "products");
const siteBaseUrl = "https://titan-900.github.io/NAE-TRUCK/";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.flatMap(toArray);
  }
  if (value === null || value === undefined) {
    return [];
  }
  const text = String(value).trim();
  return text ? [text] : [];
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.flatMap(toArray)) {
    const normalized = value.replace(/\s+/g, " ").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function firstText(...values) {
  for (const value of values) {
    const text = toArray(value)[0];
    if (text) {
      return text;
    }
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
  const clean = String(relativePath || "").replace(/^\/+/, "");
  return new URL(clean, siteBaseUrl).toString();
}

function relativeFromProductPage(assetPath) {
  const clean = String(assetPath || "").replace(/^\/+/, "");
  return `../${clean}`;
}

function productCode(product) {
  return firstText(product.productNumber, product.partNumber, product.number, product.code, product.id);
}

function productName(product) {
  return firstText(product.productName, product.name, product.visibleDescription, "Slack Adjuster");
}

function productDescription(product) {
  return firstText(product.description, product.longDescription, product.visibleDescription, productName(product));
}

function categoryLabel(product) {
  return firstText(product.categoryLabel, "Slack Adjuster");
}

function vehicleModel(product) {
  return unique([
    product.vehicleModel,
    product.vehicleModels,
    product.application,
    product.applications,
  ]).join(", ");
}

function visibleDetailRows(product) {
  const rows = [];
  const addRow = (label, value) => {
    const text = firstText(value);
    if (text) {
      rows.push({ label, value: text });
    }
  };

  addRow("Product Code", productCode(product));
  addRow("Category", categoryLabel(product));
  addRow("Brand", product.brand);

  const vehicle = vehicleModel(product);
  if (vehicle) {
    rows.push({ label: "Vehicle / Truck Model", value: vehicle });
  }

  return rows;
}

function visibleDetailHtml(product) {
  return visibleDetailRows(product)
    .map(row => `            <div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`)
    .join("\n");
}

function jsonLdScript(data) {
  return JSON.stringify(data, null, 4).replace(/</g, "\\u003c");
}

function pagePathForProduct(product) {
  const existingUrl = firstText(product.url);
  if (existingUrl) {
    return path.join(projectRoot, existingUrl.replace(/\//g, path.sep));
  }

  const slug = firstText(product.slug, `${slugify(productCode(product))}-slack-adjuster`);
  return path.join(productsDir, `${slug}.html`);
}

function pageUrlForProduct(product) {
  const existingUrl = firstText(product.url);
  if (existingUrl) {
    return absoluteUrl(existingUrl);
  }
  const slug = firstText(product.slug, `${slugify(productCode(product))}-slack-adjuster`);
  return absoluteUrl(`products/${slug}.html`);
}

function pageHtml(product) {
  const code = productCode(product);
  const name = productName(product);
  const description = productDescription(product);
  const category = categoryLabel(product);
  const image = firstText(product.image, product.thumbnail, toArray(product.images)[0]);
  const alt = firstText(product.alt, `${code} ${name} product image`);
  const pageUrl = pageUrlForProduct(product);
  const imageUrl = absoluteUrl(image);
  const imageSrc = relativeFromProductPage(image);
  const brand = firstText(product.brand);
  const title = `${code} ${category} | Heavy Truck Parts | NIHON ASIA ENTERPRISE`;
  const metaDescription = `View ${code} ${name} specifications and product image from NIHON ASIA ENTERPRISE.`;

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "sku": code,
    "mpn": code,
    "category": category,
    "description": description,
    "image": imageUrl,
  };
  if (brand) {
    productLd.brand = { "@type": "Brand", name: brand };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteBaseUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": absoluteUrl("products.html"),
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": category,
        "item": absoluteUrl("products.html?category=slack-adjuster"),
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": code,
      },
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
  <meta property="og:description" content="${escapeHtml(description)}">
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
        <div class="breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="../products.html">Products</a><span>/</span><a href="../products.html?category=slack-adjuster">${escapeHtml(category)}</a><span>/</span><span>${escapeHtml(code)}</span></div>
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
          <p class="product-detail-summary">${escapeHtml(description)}</p>
          <dl class="product-detail-specs">
${visibleDetailHtml(product)}
          </dl>
          <div class="product-detail-actions">
            <a class="button button-orange" href="../contact.html">Enquire <span>&nearr;</span></a>
            <a class="button button-dark" href="../products.html?category=slack-adjuster">Back to ${escapeHtml(category)} <span>&nearr;</span></a>
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
`;
}

function main() {
  if (!fs.existsSync(productDataPath)) {
    throw new Error(`Missing product data: ${productDataPath}`);
  }

  const products = JSON.parse(fs.readFileSync(productDataPath, "utf8"));
  const slackProducts = products.filter(product => product.category === "slack-adjuster");

  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
  }

  let generated = 0;
  for (const product of slackProducts) {
    const outputPath = pagePathForProduct(product);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, pageHtml(product).replace(/\n/g, "\r\n"), "utf8");
    generated += 1;
  }

  console.log(`Generated ${generated} Slack Adjuster product detail pages.`);
}

main();
