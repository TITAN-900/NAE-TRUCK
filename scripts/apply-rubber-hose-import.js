#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const productsJsonPath = path.join(projectRoot, "assets", "data", "products.generated.json");
const productsJsPath = path.join(projectRoot, "assets", "data", "products.generated.js");
const productsDir = path.join(projectRoot, "products");
const imageDir = path.join(projectRoot, "assets", "img", "products");
const sitemapPath = path.join(projectRoot, "sitemap.xml");
const siteBaseUrl = "https://titan-900.github.io/NAE-TRUCK/";

function parseArgs(argv) {
  const args = { dryRun: false, candidates: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--candidates") {
      args.candidates = argv[index + 1] || "";
      index += 1;
    }
  }
  return args;
}

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
  if (value === null || value === undefined) return [];
  const text = String(value).trim();
  return text ? [text] : [];
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values.flatMap(toArray)) {
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
    const first = toArray(value)[0];
    if (first) return first;
  }
  return "";
}

function codeKey(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function safeFileStem(value) {
  return String(value || "rubber-hose")
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "RUBBER-HOSE";
}

function slugify(value) {
  return String(value || "rubber-hose")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "rubber-hose";
}

function absoluteUrl(relativePath) {
  const clean = String(relativePath || "").replace(/^\/+/, "");
  return new URL(clean, siteBaseUrl).toString();
}

function relativeFromProductPage(assetPath) {
  const clean = String(assetPath || "").replace(/^\/+/, "");
  return `../${clean}`;
}

function buildSearchableText(product) {
  const parts = [
    product.id,
    product.code,
    product.number,
    product.productNumber,
    product.partNumber,
    product.name,
    product.productName,
    product.brand,
    product.category,
    product.categoryLabel,
    product.categoryGroup,
    product.description,
    product.visibleDescription,
    product.longDescription,
    product.application,
    product.vehicleModel,
    product.engineModel,
    product.oeNumber,
    product.specification,
    product.availability,
    product.source?.originalFile,
    product.source?.originalPath,
    product.source?.ocrText,
    ...toArray(product.vehicleModels),
    ...toArray(product.engineModels),
    ...toArray(product.oeNumbers),
    ...toArray(product.alternateNumbers),
    ...toArray(product.alternatePartNumbers),
    ...toArray(product.keywords),
    ...toArray(product.specs),
  ];

  if (product.specifications && typeof product.specifications === "object") {
    for (const [key, value] of Object.entries(product.specifications)) {
      for (const item of toArray(value)) {
        parts.push(`${key} ${item}`);
      }
    }
  }

  return unique(parts).join(" ").trim();
}

function makeDestinationImagePath(candidate, existingRelativePaths) {
  const sourcePath = path.resolve(projectRoot, candidate.sourcePath);
  const extension = (path.extname(sourcePath) || ".jpg").toLowerCase();
  const baseStem = safeFileStem(candidate.productCode);
  let stem = baseStem;
  let relative = `assets/img/products/${stem}${extension}`;
  let absolute = path.join(projectRoot, relative.replace(/\//g, path.sep));
  let counter = 2;

  while (fs.existsSync(absolute) || existingRelativePaths.has(relative.toLowerCase())) {
    stem = `${baseStem}-RH-${counter}`;
    relative = `assets/img/products/${stem}${extension}`;
    absolute = path.join(projectRoot, relative.replace(/\//g, path.sep));
    counter += 1;
  }

  return { relative, absolute };
}

function makeProductSlug(candidate, existingUrls) {
  const baseSlug = `${slugify(candidate.productCode)}-rubber-hose`;
  let slug = baseSlug;
  let relativeUrl = `products/${slug}.html`;
  let counter = 2;
  while (existingUrls.has(relativeUrl.toLowerCase())) {
    slug = `${baseSlug}-${counter}`;
    relativeUrl = `products/${slug}.html`;
    counter += 1;
  }
  existingUrls.add(relativeUrl.toLowerCase());
  return { slug, relativeUrl };
}

function buildProductRecord(candidate, imageRelativePath, slugInfo) {
  const productCode = firstText(candidate.productCode);
  const productName = firstText(candidate.productName, "RUBBER HOSE");
  const brand = firstText(candidate.brand);
  const vehicleModels = unique(candidate.vehicleModels || []);
  const engineModels = unique(candidate.engineModels || []);
  const specLabels = unique(candidate.specLabels || []);
  const oeNumbers = unique(candidate.oeNumbers || []);
  const alternateNumbers = unique([
    candidate.alternateNumbers || [],
    productCode.replace(/[^A-Za-z0-9]/g, ""),
    productCode.replace(/[\/]/g, "-"),
  ]).filter(value => codeKey(value) !== codeKey(productCode));
  const keywords = unique([
    "rubber hose",
    "rubber-hose",
    "heavy truck rubber hose",
    "truck hose",
    "hose component",
    productName,
    brand,
    vehicleModels,
    engineModels,
    specLabels,
    candidate.keywords || [],
  ]);
  const application = unique([vehicleModels, engineModels]).join(", ");
  const description = firstText(candidate.description, candidate.visibleDescription, productName);
  const visibleDescription = firstText(candidate.visibleDescription, productName);

  const product = {
    id: productCode,
    code: productCode,
    number: productCode,
    productNumber: productCode,
    partNumber: productCode,
    name: productName,
    productName,
    category: "rubber-hose",
    categoryLabel: "RUBBER HOSE",
    categoryGroup: "other",
    subcategory: "",
    description,
    visibleDescription,
    longDescription: `${description} OCR/source text preserved for search.`,
    application,
    brand,
    vehicleModel: vehicleModels.join(", "),
    vehicleModels,
    engineModel: engineModels.join(", "),
    engineModels,
    oeNumber: oeNumbers.join(", "),
    oeNumbers,
    alternateNumbers,
    alternatePartNumbers: alternateNumbers,
    availability: "Ready stock",
    image: imageRelativePath,
    thumbnail: imageRelativePath,
    images: [imageRelativePath],
    alt: `${productCode} ${productName.toLowerCase()} product image`,
    specifications: candidate.specifications || {},
    specs: specLabels,
    specification: specLabels.join("; "),
    keywords,
    needsManualReview: Boolean(candidate.needsReview),
    needsReview: Boolean(candidate.needsReview),
    reviewReason: Boolean(candidate.needsReview) ? unique(candidate.warnings || []).join("; ") : "",
    confidence: Number(candidate.confidence || 0),
    searchableText: "",
    source: {
      type: "rubber-hose-folder-image",
      originalFile: candidate.sourceFile,
      originalPath: candidate.sourceRelativePath,
      hash: candidate.hash,
      ocrText: candidate.ocrText || "",
      importedAt: new Date().toISOString().slice(0, 19),
      recognitionNote: "Rubber Hose import; product code read from the prominent visible product code in the source image.",
    },
    slug: slugInfo.slug,
    url: slugInfo.relativeUrl,
  };

  product.searchableText = buildSearchableText(product);
  return product;
}

function visibleDetailRows(product) {
  const rows = [];
  const add = (label, value) => {
    const text = firstText(value);
    if (text) rows.push({ label, value: text });
  };
  add("Product Code", product.productNumber || product.number || product.code || product.id);
  add("Category", product.categoryLabel || "RUBBER HOSE");
  add("Brand", product.brand);
  add("Vehicle / Truck Model", product.vehicleModel || product.application);
  return rows;
}

function jsonLdScript(data) {
  return JSON.stringify(data, null, 4).replace(/</g, "\\u003c");
}

function pageHtml(product) {
  const code = firstText(product.productNumber, product.number, product.code, product.id);
  const name = firstText(product.productName, product.name, "RUBBER HOSE");
  const visibleSummary = firstText(product.visibleDescription, name);
  const description = firstText(product.description, visibleSummary);
  const category = firstText(product.categoryLabel, "RUBBER HOSE");
  const image = firstText(product.image, product.thumbnail, product.images?.[0]);
  const alt = firstText(product.alt, `${code} ${name} product image`);
  const pageUrl = absoluteUrl(product.url);
  const imageUrl = absoluteUrl(image);
  const imageSrc = relativeFromProductPage(image);
  const title = `${code} Rubber Hose | Heavy Truck Parts | NIHON ASIA ENTERPRISE`;
  const metaDescription = `View ${code} ${name} specifications and product image from NIHON ASIA ENTERPRISE.`;
  const rows = visibleDetailRows(product)
    .map(row => `            <div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`)
    .join("\n");

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
  if (firstText(product.brand)) {
    productLd.brand = { "@type": "Brand", name: product.brand };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteBaseUrl },
      { "@type": "ListItem", "position": 2, "name": "Products", "item": absoluteUrl("products.html") },
      { "@type": "ListItem", "position": 3, "name": "RUBBER HOSE", "item": absoluteUrl("products.html?category=rubber-hose") },
      { "@type": "ListItem", "position": 4, "name": code },
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
        <div class="breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="../products.html">Products</a><span>/</span><a href="../products.html?category=rubber-hose">RUBBER HOSE</a><span>/</span><span>${escapeHtml(code)}</span></div>
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
          <p class="product-detail-summary">${escapeHtml(visibleSummary)}</p>
          <dl class="product-detail-specs">
${rows}
          </dl>
          <div class="product-detail-actions">
            <a class="button button-orange" href="../contact.html">Enquire <span>&nearr;</span></a>
            <a class="button button-dark" href="../products.html?category=rubber-hose">Back to RUBBER HOSE <span>&nearr;</span></a>
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

function generateProductPages(products, dryRun) {
  const rubberProducts = products.filter(product => product.category === "rubber-hose" && product.url && !product.needsReview);
  if (!dryRun) fs.mkdirSync(productsDir, { recursive: true });
  for (const product of rubberProducts) {
    const outputPath = path.join(projectRoot, product.url.replace(/\//g, path.sep));
    if (!dryRun) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, pageHtml(product), "utf8");
    }
  }
  return rubberProducts.length;
}

function updateSitemap(products, dryRun) {
  if (!fs.existsSync(sitemapPath)) return 0;
  let sitemap = fs.readFileSync(sitemapPath, "utf8");
  const existingLocs = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]));
  const newBlocks = [];
  for (const product of products.filter(item => item.category === "rubber-hose" && item.url && !item.needsReview)) {
    const loc = absoluteUrl(product.url);
    if (existingLocs.has(loc)) continue;
    newBlocks.push(`\n<url>\n<loc>${loc}</loc>\n<priority>0.7</priority>\n</url>\n`);
    existingLocs.add(loc);
  }
  if (newBlocks.length && !dryRun) {
    sitemap = sitemap.replace(/\s*<\/urlset>\s*$/i, `${newBlocks.join("")}\n</urlset>\n`);
    fs.writeFileSync(sitemapPath, sitemap, "utf8");
  }
  return newBlocks.length;
}

function writeGeneratedJs(products, report) {
  const meta = {
    generatedAt: new Date().toISOString().slice(0, 19),
    totalProducts: products.length,
    importedThisRun: report.imported,
    updatedThisRun: 0,
    skippedDuplicates: report.duplicates,
    skippedProducts: report.failed,
    needsReview: report.needsReview,
    cleanedSourceRecords: 0,
    archivedThisRun: 0,
    duplicateProductsMerged: 0,
    searchIndexRebuilt: true,
    source: "rubber-hose-folder-import",
  };
  const js = [
    "/* Auto-generated by scripts/import-rubber-hose-products.ps1. Do not edit by hand. */",
    `window.NAE_IMPORTED_PRODUCTS = ${JSON.stringify(products, null, 2)};`,
    `window.NAE_IMPORT_META = ${JSON.stringify(meta, null, 2)};`,
    "",
  ].join("\n");
  fs.writeFileSync(productsJsPath, js, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.candidates) {
    throw new Error("Missing --candidates path.");
  }

  const candidatesPath = path.resolve(projectRoot, args.candidates);
  const candidates = readJson(candidatesPath, []);
  const products = readJson(productsJsonPath, []);
  const report = {
    imagesFound: candidates.length,
    imported: 0,
    duplicates: 0,
    failed: 0,
    needsReview: 0,
    detailPagesCreated: 0,
    sitemapUrlsAdded: 0,
    skipped: [],
    importedProducts: [],
    warnings: [],
  };

  const existingCodeKeys = new Set();
  const existingHashes = new Set();
  const existingUrls = new Set();
  const existingImagePaths = new Set();

  for (const product of products) {
    for (const value of [product.id, product.code, product.number, product.productNumber, product.partNumber]) {
      const key = codeKey(value);
      if (key) existingCodeKeys.add(key);
    }
    const hash = String(product.source?.hash || "").toLowerCase();
    if (hash) existingHashes.add(hash);
    if (product.url) existingUrls.add(String(product.url).toLowerCase());
    for (const image of [product.image, product.thumbnail, ...(product.images || [])]) {
      if (image) existingImagePaths.add(String(image).toLowerCase());
    }
  }

  const outputProducts = [...products];
  if (!args.dryRun) fs.mkdirSync(imageDir, { recursive: true });

  for (const candidate of candidates) {
    const sourceHash = String(candidate.hash || "").toLowerCase();
    const productCode = firstText(candidate.productCode);
    const productKey = codeKey(productCode);
    if (!productCode || !productKey) {
      report.failed += 1;
      report.skipped.push({ file: candidate.sourceFile, reason: "Missing product code." });
      continue;
    }
    if (sourceHash && existingHashes.has(sourceHash)) {
      report.duplicates += 1;
      report.skipped.push({ file: candidate.sourceFile, code: productCode, reason: "Duplicate image hash." });
      continue;
    }
    if (existingCodeKeys.has(productKey)) {
      report.duplicates += 1;
      report.skipped.push({ file: candidate.sourceFile, code: productCode, reason: "Duplicate product code." });
      continue;
    }

    if (candidate.needsReview) report.needsReview += 1;
    if (candidate.warnings?.length) {
      report.warnings.push({ file: candidate.sourceFile, code: productCode, warnings: candidate.warnings });
    }

    const destination = makeDestinationImagePath(candidate, existingImagePaths);
    const slugInfo = makeProductSlug(candidate, existingUrls);
    const product = buildProductRecord(candidate, destination.relative, slugInfo);

    if (!args.dryRun) {
      fs.copyFileSync(path.resolve(projectRoot, candidate.sourcePath), destination.absolute);
    }

    existingCodeKeys.add(productKey);
    if (sourceHash) existingHashes.add(sourceHash);
    existingImagePaths.add(destination.relative.toLowerCase());
    outputProducts.push(product);
    report.imported += 1;
    report.importedProducts.push({
      code: product.productNumber,
      name: product.productName,
      brand: product.brand,
      vehicleModel: product.vehicleModel,
      image: product.image,
      url: product.url,
      needsReview: product.needsReview,
    });
  }

  if (!args.dryRun) {
    writeJson(productsJsonPath, outputProducts);
    writeGeneratedJs(outputProducts, report);
  }

  report.detailPagesCreated = generateProductPages(outputProducts, args.dryRun);
  report.sitemapUrlsAdded = updateSitemap(outputProducts, args.dryRun);
  report.totalRubberHoseProducts = outputProducts.filter(product => product.category === "rubber-hose").length;
  report.totalProducts = outputProducts.length;

  console.log(JSON.stringify(report, null, 2));
}

main();
