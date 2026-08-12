const categoryScript = document.currentScript;
const categorySiteRoot = categoryScript ? new URL("../../", categoryScript.src) : new URL("../../", window.location.href);
const categoryDataRoot = new URL("assets/data/", categorySiteRoot);

function getCataloguePageSize() {
  if (window.matchMedia("(max-width: 720px)").matches) return 12;
  if (window.matchMedia("(max-width: 980px)").matches) return 8;
  return 10;
}

const pageSize = getCataloguePageSize();
const browseMode = document.body.dataset.browseMode || (document.body.classList.contains("brand-page") ? "brand" : (document.body.dataset.category ? "category" : "search"));
const pageCategorySlug = document.body.dataset.category || "";
const pageCategoryGroup = document.body.dataset.categoryGroup || "";
const pageBrandId = document.body.dataset.brandId || "";
const pageBrandName = document.body.dataset.brand || "";
const pageProductsCategorySlug = (new URLSearchParams(window.location.search).get("category") || "")
  .toLowerCase()
  .trim()
  .replace(/_/g, "-")
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

const categoryGroups = [
  { key: "", label: "ALL PRODUCTS", shortLabel: "ALL" },
  { key: "engine", label: "ENGINE", shortLabel: "ENGINE" },
  { key: "brake", label: "BRAKE", shortLabel: "BRAKE" },
  { key: "cooling", label: "COOLING", shortLabel: "COOLING" },
  { key: "electrical", label: "ELECTRICAL", shortLabel: "ELECTRICAL" },
  { key: "transmission", label: "TRANSMISSION", shortLabel: "TRANSMISSION" },
  { key: "axle", label: "AXLE", shortLabel: "AXLE" },
  { key: "trailer", label: "TRAILER", shortLabel: "TRAILER" },
  { key: "other", label: "OTHER", shortLabel: "OTHER" }
];

const categoryGroupMap = {
  "engine-parts": "engine",
  "brake-system": "brake",
  "cooling-system": "cooling",
  "electrical-system": "electrical",
  "transmission-parts": "transmission",
  "axle-parts": "axle",
  "trailer-parts": "trailer",
  "slack-adjuster": "trailer",
  "rubber-hose": "other",
  other: "other"
};

const fallbackCategories = [
  {
    slug: "engine-parts",
    num: "01",
    title: "Engine Parts",
    desc: "Core components for dependable heavy-duty power.",
    intro: "Heavy-duty engine components for reliable power, efficiency and long-haul durability.",
    thumbnail: "assets/img/categories/engine-parts.svg",
    items: ["Pistons & liners", "Gasket sets", "Oil pumps", "Turbo components"]
  },
  {
    slug: "brake-system",
    num: "03",
    title: "Brake System",
    desc: "Stopping confidence for trucks and trailers.",
    intro: "Pneumatic and friction components for confident heavy-truck and trailer braking.",
    thumbnail: "assets/img/categories/brake-system.svg",
    items: ["Brake linings", "Brake chambers", "Valves", "Air dryers"]
  },
  {
    slug: "cooling-system",
    num: "05",
    title: "Cooling System",
    desc: "Thermal management for long-haul operation.",
    intro: "Cooling and temperature-control parts that help heavy engines perform under load.",
    thumbnail: "assets/img/categories/cooling-system.svg",
    items: ["Water pumps", "Radiators", "Fan clutches", "Thermostats"]
  },
  {
    slug: "electrical-system",
    num: "06",
    title: "Electrical System",
    desc: "Starting, charging and vehicle electronics.",
    intro: "Starting, charging, sensing and control components for modern heavy commercial vehicles.",
    thumbnail: "assets/img/categories/electrical-system.svg",
    items: ["Starters", "Alternators", "Sensors", "Switches"]
  },
  {
    slug: "transmission-parts",
    num: "08",
    title: "Transmission Parts",
    desc: "Gearing components built for heavy torque.",
    intro: "Gearbox internals and shifting components designed for high-torque commercial duty.",
    thumbnail: "assets/img/categories/transmission-parts.svg",
    items: ["Synchronisers", "Gear sets", "Bearings", "Shift components"]
  },
  {
    slug: "axle-parts",
    num: "09",
    title: "Axle Parts",
    desc: "Load-bearing driveline and wheel-end parts.",
    intro: "Differential, shaft and wheel-end components for heavy load-bearing drivetrains.",
    thumbnail: "assets/img/categories/axle-parts.svg",
    items: ["Hub assemblies", "Differential gears", "Axle shafts", "Wheel bearings"]
  },
  {
    slug: "trailer-parts",
    num: "10",
    title: "Trailer Parts",
    desc: "Running gear for trailers and container haulers.",
    intro: "Running gear, braking and coupling components for trailers and container haulage.",
    thumbnail: "assets/img/categories/trailer-parts.svg",
    items: ["Landing gear", "Kingpins", "Slack adjusters", "Suspension parts"]
  },
  {
    slug: "slack-adjuster",
    num: "11",
    title: "Slack Adjuster",
    desc: "Heavy-duty truck air brake slack adjuster components.",
    intro: "Heavy-duty truck air brake slack adjuster components for commercial vehicle braking systems.",
    thumbnail: "",
    categoryImage: "assets/img/categories/slack-adjuster-cover.png",
    futureCategoryImage: "assets/img/categories/slack-adjuster-cover.png",
    productCategory: true,
    items: ["Slack Adjuster"]
  },
  {
    slug: "rubber-hose",
    num: "12",
    title: "RUBBER HOSE",
    desc: "Heavy-duty truck rubber hose components.",
    intro: "Heavy-duty truck rubber hose components.",
    thumbnail: "",
    categoryImage: "assets/img/categories/rubber-hose-cover.png",
    futureCategoryImage: "assets/img/categories/rubber-hose-cover.png",
    productCategory: true,
    items: ["Rubber Hose"]
  }
];

let data = fallbackCategories.find(category => category.slug === pageCategorySlug) || fallbackCategories[0];
let visibleCount = pageSize;
let pendingRender = 0;
let allCatalogueProducts = [];
let allCatalogueRecords = [];
let catalogueProducts = [];
let catalogueRecords = [];
let lastRenderKey = "";
let allCategories = fallbackCategories;
let allBrands = [];
let activeBrand = null;
let brandLogoLookup = new Map();
let catalogueLightboxScrollY = 0;
const catalogueLightboxZoomStep = 0.25;
const catalogueLightboxMinZoom = 1;
const catalogueLightboxMaxZoom = 4;
let catalogueLightboxState = {
  images: [],
  index: 0,
  scale: 1,
  lastFocus: null,
  touchStartX: 0,
  touchStartY: 0,
  touchStartDistance: 0,
  touchStartScale: 1
};

let productGrid = document.querySelector("#productGrid");
let search = document.querySelector("#productSearch");
let brand = document.querySelector("#brandFilter");
let stock = document.querySelector("#stockFilter");
let count = document.querySelector("#resultCount");
let catalogueNote = document.querySelector(".catalogue-note");
let categoryFilter = document.querySelector("#categoryFilter");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function assetPath(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return new URL(path.replace(/^\.?\//, ""), categorySiteRoot).href;
}

function contactPath() {
  return new URL("contact.html", categorySiteRoot).href;
}

function productsPath(query = "") {
  const url = new URL("products.html", categorySiteRoot);
  if (query) {
    url.search = query.startsWith("?") ? query : `?${query}`;
  }
  return url.href;
}

function hasProductsCategoryScope() {
  return browseMode === "products" && Boolean(pageProductsCategorySlug);
}

function getProductsCategoryInfo() {
  if (!hasProductsCategoryScope()) return null;
  return allCategories.find(category => category.slug === pageProductsCategorySlug) || null;
}

function getProductsPageCategories(categories) {
  const visibleCategories = (categories || []).filter(category => category.productCategory === true);
  return visibleCategories.length
    ? visibleCategories
    : (categories || []).filter(category => category.slug === "slack-adjuster");
}

function renderProductsCategoryCards(categories) {
  const grid = document.querySelector("[data-product-category-grid]");
  if (!grid) return;

  const productCategories = getProductsPageCategories(categories);
  grid.innerHTML = productCategories.map(category => {
    const slug = String(category.slug || "").trim();
    const title = String(category.title || slug || "Product Category").trim();
    const description = String(category.desc || category.intro || "Browse products in this category.").trim();
    const imagePath = category.categoryImage || category.futureCategoryImage || "";
    const imageAttribute = imagePath ? ` data-category-image="${escapeHtml(imagePath)}"` : "";

    return `<a class="product-category-card" href="${escapeHtml(productsPath(`category=${encodeURIComponent(slug)}`))}" data-product-category-card data-category="${escapeHtml(slug)}"${imageAttribute}>
      <span class="product-category-media" aria-hidden="true"></span>
      <span class="product-category-content">
        <strong>${escapeHtml(title.toUpperCase())}</strong>
        <span>${escapeHtml(description)}</span>
        <em>VIEW PRODUCTS <span>&nearr;</span></em>
      </span>
    </a>`;
  }).join("");
}

function hydrateProductCategoryCards(categories) {
  document.querySelectorAll("[data-product-category-card]").forEach(card => {
    const href = card.getAttribute("href") || "";
    const params = new URLSearchParams((href.split("?")[1] || "").split("#")[0]);
    const slug = params.get("category") || card.dataset.category || "";
    const category = (categories || []).find(item => item.slug === slug);
    const imagePath = card.dataset.categoryImage || category?.categoryImage || "";
    const media = card.querySelector(".product-category-media");
    if (!media) return;

    media.innerHTML = imagePath
      ? `<img loading="lazy" decoding="async" src="${escapeHtml(assetPath(imagePath))}" alt="">`
      : "";
    media.classList.toggle("has-category-image", Boolean(imagePath));
  });
}

function updateProductsCategoryBrowserVisibility(category) {
  const categoryBrowser = document.querySelector(".product-categories-section");
  if (!categoryBrowser) return;

  const shouldShowCategoryBrowser = browseMode === "products" && !category;
  categoryBrowser.hidden = !shouldShowCategoryBrowser;
  categoryBrowser.setAttribute("aria-hidden", String(!shouldShowCategoryBrowser));
}

async function loadJson(fileName, validator) {
  if (!window.fetch) return null;

  try {
    const response = await fetch(new URL(fileName, categoryDataRoot), { cache: "no-cache" });
    if (!response.ok) throw new Error(`${fileName} request failed: ${response.status}`);
    const text = await response.text();
    const json = JSON.parse(text.replace(/^\uFEFF/, ""));
    return validator(json) ? json : null;
  } catch (error) {
    return null;
  }
}

function normalizeSearchValue(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchValue(value) {
  return normalizeSearchValue(value).replace(/\s+/g, "");
}

function flattenSpecificationObject(specifications) {
  if (!specifications || typeof specifications !== "object") return [];

  return Object.entries(specifications).flatMap(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.filter(Boolean).map(item => `${key} ${item}`);
  });
}

function getProductSourceValue(product, name) {
  const source = product?.source;
  if (!source || typeof source !== "object") return "";
  return source[name] || "";
}

function getProductSourceOcrText(product) {
  return getProductSourceValue(product, "ocrText")
    || getProductSourceValue(product, "rawOcrText")
    || getProductSourceValue(product, "cleanText")
    || "";
}

function normalizeSpecs(product) {
  const specs = Array.isArray(product.specs) ? product.specs : [];
  return Array.from(new Set([
    ...specs,
    ...flattenSpecificationObject(product.specifications),
    product.specification
  ].filter(Boolean)));
}

function getCategoryGroup(categorySlug) {
  if (!categorySlug) return "other";
  return categoryGroupMap[categorySlug] || "other";
}

function getGroupLabel(groupKey) {
  return categoryGroups.find(group => group.key === groupKey)?.shortLabel || "OTHER";
}

function getCategoryLabel(categorySlug) {
  if (!categorySlug || categorySlug === "other") return "Other";
  const category = allCategories.find(item => item.slug === categorySlug);
  if (category?.title) return category.title.replace(/\s+Parts$/i, "");
  return getGroupLabel(getCategoryGroup(categorySlug));
}

function buildBrandLogoLookup(brands) {
  const lookup = new Map();

  (brands || []).forEach(brandItem => {
    const terms = [
      brandItem.name,
      brandItem.id,
      ...(brandItem.aliases || [])
    ];

    terms.forEach(term => {
      const normalized = normalizeSearchValue(term);
      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, brandItem);
      }
    });
  });

  return lookup;
}

function resolveBrandLogo(brandName) {
  const normalized = normalizeSearchValue(brandName);
  return normalized ? brandLogoLookup.get(normalized) : null;
}

function getSyntheticCategoryForGroup(groupKey) {
  const group = categoryGroups.find(item => item.key === groupKey) || categoryGroups[categoryGroups.length - 1];
  return {
    slug: group.key || "all",
    title: group.key ? `${group.shortLabel[0]}${group.shortLabel.slice(1).toLowerCase()} Parts` : "All Products",
    intro: group.key === "other"
      ? "Other heavy-duty truck parts from all brands, including clutch, suspension, steering and uncategorised products."
      : `Browse ${group.shortLabel.toLowerCase()} products from every available brand.`,
    desc: "Products from all brands.",
    thumbnail: "",
    items: []
  };
}

function productMatchesBrand(product, brandInfo) {
  if (!brandInfo) return true;

  const brandTerms = [
    brandInfo.name,
    ...(brandInfo.aliases || [])
  ].map(normalizeSearchValue).filter(Boolean);

  const productBrand = normalizeSearchValue(product.brand);
  return brandTerms.some(term => productBrand === term);
}

function normalizeProduct(product) {
  const productNumber = product.productNumber || product.number || product.partNumber || product.id || "";
  const productName = product.productName || product.name || "Catalogue Product";
  const rawCategorySlug = product.category || "";
  const categorySlug = rawCategorySlug || "other";
  const categoryGroup = product.categoryGroup || getCategoryGroup(categorySlug);
  const vehicleModel = product.vehicleModel || product.application || "";
  const specification = product.specification || normalizeSpecs(product).join("; ");

  return {
    ...product,
    id: product.id || productNumber,
    number: productNumber,
    productNumber,
    partNumber: product.partNumber || productNumber,
    name: productName,
    productName,
    category: categorySlug,
    hasCategory: Boolean(rawCategorySlug),
    categoryGroup,
    categoryLabel: getCategoryLabel(categorySlug),
    subcategory: product.subcategory || "",
    description: product.shortDescription || product.description || product.application || "Heavy-duty replacement part",
    application: product.application || "",
    vehicleModel,
    brand: product.brand || "Brand not specified",
    availability: product.availability || product.stockStatus || product.stock || "Ready stock",
    specs: normalizeSpecs(product),
    specifications: product.specifications || {},
    specification,
    image: product.image || "",
    confidence: product.confidence || "",
    searchableText: product.searchableText || "",
    isImported: product.isImported !== false
  };
}

function getProductSearchFields(product) {
  return [
    product.number,
    product.productNumber,
    product.partNumber,
    product.name,
    product.productName,
    product.description,
    product.brand,
    product.category,
    product.categoryLabel,
    product.categoryGroup,
    product.subcategory,
    product.application,
    product.vehicleModel,
    product.availability,
    product.specification,
    product.searchableText,
    getProductSourceOcrText(product),
    getProductSourceValue(product, "originalFile"),
    getProductSourceValue(product, "originalPath"),
    product.engineModel,
    product.engineModels,
    product.vehicleModels,
    product.oeNumbers,
    ...(product.keywords || []),
    ...(product.specs || []),
    ...(product.alternateNumbers || []),
    ...(product.alternatePartNumbers || []),
    ...flattenSpecificationObject(product.specifications)
  ].filter(Boolean);
}

function getProductScoringFields(product) {
  const description = [
    product.description,
    product.visibleDescription,
    product.longDescription,
    product.application,
    product.searchableText
  ].filter(Boolean).join(" ");
  const engineVehicle = [
    product.engineModel,
    product.engineModels,
    product.vehicleModel,
    product.vehicleModels,
    product.application
  ].flat().filter(Boolean).join(" ");
  const brandTags = [
    product.brand,
    product.category,
    product.categoryLabel,
    product.categoryGroup,
    product.subcategory,
    product.keywords,
    product.tags,
    getProductSourceValue(product, "originalFile"),
    getProductSourceValue(product, "originalPath")
  ].flatMap(item => Array.isArray(item) ? item : [item]).filter(Boolean).join(" ");

  return {
    number: normalizeSearchValue(product.number || product.productNumber || product.partNumber || product.id),
    numberCompact: compactSearchValue(product.number || product.productNumber || product.partNumber || product.id),
    name: normalizeSearchValue(product.name || product.productName),
    description: normalizeSearchValue(description),
    ocr: normalizeSearchValue(getProductSourceOcrText(product)),
    engineVehicle: normalizeSearchValue(engineVehicle),
    brandTags: normalizeSearchValue(brandTags)
  };
}

function buildSearchRecord(product, index) {
  const fields = getProductSearchFields(product);
  const joined = fields.join(" ");
  return {
    product,
    index,
    scoreFields: getProductScoringFields(product),
    text: normalizeSearchValue(joined),
    compact: compactSearchValue(joined)
  };
}

function getSearchState() {
  const raw = search?.value || "";
  const normalized = normalizeSearchValue(raw);
  const tokens = normalized ? normalized.split(" ").filter(Boolean) : [];

  return {
    raw,
    normalized,
    tokens,
    compact: compactSearchValue(raw),
    highlightTerms: Array.from(new Set(raw.match(/[a-z0-9]+/gi) || []))
      .filter(term => term.length > 0)
      .sort((a, b) => b.length - a.length)
  };
}

function matchesSearch(record, state) {
  if (!state.tokens.length) return true;

  const tokenMatch = state.tokens.every(token => record.text.includes(token));
  const compactMatch = state.compact.length > 2 && record.compact.includes(state.compact);
  return tokenMatch || compactMatch;
}

function scoreSearchRecord(record, state) {
  if (!state.tokens.length) return 0;

  const fields = record.scoreFields || {};
  const query = state.normalized;
  const compactQuery = state.compact;
  let score = 0;

  if (query && fields.number === query) score += 1200;
  if (compactQuery && fields.numberCompact === compactQuery) score += 1200;
  if (query && fields.number?.startsWith(query)) score += 900;
  if (compactQuery && fields.numberCompact?.startsWith(compactQuery)) score += 900;
  if (query && fields.number?.includes(query)) score += 700;
  if (compactQuery && fields.numberCompact?.includes(compactQuery)) score += 700;

  state.tokens.forEach(token => {
    if (fields.number?.includes(token) || fields.numberCompact?.includes(token)) score += 180;
    if (fields.name?.includes(token)) score += 120;
    if (fields.description?.includes(token)) score += 80;
    if (fields.ocr?.includes(token)) score += 60;
    if (fields.engineVehicle?.includes(token)) score += 45;
    if (fields.brandTags?.includes(token)) score += 25;
  });

  return score;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(value, terms) {
  const escaped = escapeHtml(value);
  if (!terms || !terms.length) return escaped;

  const pattern = terms.map(escapeRegExp).join("|");
  if (!pattern) return escaped;

  return escaped.replace(new RegExp(`(${pattern})`, "gi"), "<mark class=\"search-highlight\">$1</mark>");
}

function highlightProductNumber(value, state) {
  const escaped = escapeHtml(value);
  if (state?.compact?.length > 2 && compactSearchValue(value).includes(state.compact)) {
    return `<mark class="search-highlight">${escaped}</mark>`;
  }

  return highlightText(value, state?.highlightTerms || []);
}

function refreshCatalogueElements() {
  productGrid = document.querySelector("#productGrid");
  search = document.querySelector("#productSearch");
  brand = document.querySelector("#brandFilter");
  stock = document.querySelector("#stockFilter");
  count = document.querySelector("#resultCount");
  catalogueNote = document.querySelector(".catalogue-note");
  categoryFilter = document.querySelector("#categoryFilter");
}

function ensureBrandProductScaffold() {
  if (browseMode !== "brand" || document.querySelector("#productGrid")) return;

  const hero = document.querySelector(".category-hero");
  const main = document.querySelector("main");
  const section = document.querySelector(".catalogue-section");
  const container = section?.querySelector(".container");
  if (!main || !hero || !section || !container) return;

  if (!document.querySelector(".catalogue-bar")) {
    hero.insertAdjacentHTML("afterend", `
    <div class="catalogue-bar">
      <div class="container catalogue-toolbar brand-product-toolbar">
        <label><span>Global product search</span><input id="productSearch" type="search" placeholder="Product number, product name, brand, model or specification..."></label>
        <label><span>Availability</span><select id="stockFilter"><option value="">All availability</option></select></label>
      </div>
    </div>`);
  }

  container.innerHTML = `
    <div class="catalogue-head">
      <div><p class="eyebrow"><span></span> Browse by brand</p><h2>All <em>products</em></h2></div>
      <p id="resultCount"></p>
    </div>
    <div class="filter-pills" id="categoryFilter" aria-label="Filter products by category"></div>
    <div class="product-grid" id="productGrid"></div>
    <div class="catalogue-note"><p>Use the category filter or search by part number to identify the exact product faster.</p><a class="button button-orange" href="${escapeHtml(contactPath())}">Ask the parts team <span>&nearr;</span></a></div>`;

  refreshCatalogueElements();
}

function updateSearchChrome() {
  const clear = document.querySelector("#clearProductSearch");
  if (clear) clear.hidden = !(search?.value || "").length;
}

function enhanceSearchBar() {
  if (!search) return;

  const label = search.closest("label");
  if (!label || label.classList.contains("catalogue-search")) return;

  label.classList.add("catalogue-search");
  search.placeholder = "Search product number, name, brand, category, model, OD, ID, HI or PIN...";
  search.setAttribute("autocomplete", "off");
  search.setAttribute("spellcheck", "false");
  search.setAttribute("aria-label", "Search products by part number, name, brand, category, vehicle model, description or specifications");

  const icon = document.createElement("span");
  icon.className = "search-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = "<svg viewBox=\"0 0 24 24\" focusable=\"false\"><circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"></circle><path d=\"M16 16l5 5\"></path></svg>";

  const clear = document.createElement("button");
  clear.id = "clearProductSearch";
  clear.className = "search-clear";
  clear.type = "button";
  clear.textContent = "Clear";
  clear.hidden = true;
  clear.addEventListener("click", () => {
    search.value = "";
    visibleCount = pageSize;
    scheduleRender();
    search.focus();
  });

  label.append(icon, clear);
}

function hydrateFilterOptions(select, values, firstLabel) {
  if (!select) return;

  select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>`;
  values
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
}

function getSelectedCategoryFilter() {
  if (browseMode === "search" || browseMode === "products") return "";
  return categoryFilter?.querySelector("[aria-pressed='true']")?.dataset.categoryFilter || "";
}

function renderCategoryFilter() {
  if (!categoryFilter || browseMode === "search" || browseMode === "products") return;

  if (!catalogueProducts.length) {
    categoryFilter.hidden = true;
    categoryFilter.innerHTML = "";
    return;
  }

  categoryFilter.hidden = false;

  categoryFilter.innerHTML = categoryGroups
    .map(group => `<button class="filter-pill${group.key ? "" : " active"}" type="button" data-category-filter="${escapeHtml(group.key)}" aria-pressed="${group.key ? "false" : "true"}">${escapeHtml(group.label)}</button>`)
    .join("");

  if (categoryFilter.dataset.bound === "true") return;
  categoryFilter.dataset.bound = "true";
  categoryFilter.addEventListener("click", event => {
    const button = event.target.closest("[data-category-filter]");
    if (!button) return;

    categoryFilter.querySelectorAll("[data-category-filter]").forEach(item => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    visibleCount = pageSize;
    scheduleRender();
  });
}

function updateBrandPageChrome(brandInfo) {
  if (!brandInfo) return;

  document.title = `${brandInfo.name} Products | NIHON ASIA ENTERPRISE Heavy Duty Truck Parts`;
  document.querySelector(".category-hero-copy h1")?.replaceChildren(document.createTextNode(brandInfo.name));

  const intro = document.querySelector(".category-hero-copy p:last-child");
  if (intro) {
    intro.textContent = `Browse all ${brandInfo.name} products immediately. Use the category filters below only when you want to narrow the list.`;
  }

  const breadcrumbLast = document.querySelector(".breadcrumb span:last-child");
  if (breadcrumbLast) breadcrumbLast.textContent = brandInfo.name;

  const small = document.querySelector(".category-symbol small");
  if (small) small.textContent = "All products / optional category filter";

  const symbol = document.querySelector(".category-symbol i");
  if (symbol && brandInfo.logo) {
    symbol.innerHTML = `<img class="brand-page-logo" loading="lazy" decoding="async" src="${escapeHtml(assetPath(brandInfo.logo))}" alt="${escapeHtml(brandInfo.name)} logo">`;
  }
}

function updateCategoryPageChrome(category) {
  document.title = `${category.title} | NIHON ASIA ENTERPRISE Heavy Duty Truck Parts`;

  document.querySelectorAll("[data-category-title]").forEach(el => {
    el.textContent = category.title;
  });

  document.querySelectorAll("[data-category-icon]").forEach(el => {
    const image = category.thumbnail
      ? `<img class="category-symbol-image" loading="lazy" decoding="async" src="${escapeHtml(assetPath(category.thumbnail))}" alt="">`
      : "<span class=\"category-symbol-fallback\">NIHON ASIA</span>";

    el.innerHTML = image;
    el.setAttribute("aria-hidden", "true");
  });

  const intro = document.querySelector("[data-category-intro]");
  if (intro) intro.textContent = category.intro || category.desc || "";
}

function updateSearchPageChrome() {
  if (browseMode !== "search") return;
  document.title = "Global Product Search | NIHON ASIA ENTERPRISE Heavy Duty Truck Parts";
}

function updateProductsPageChrome() {
  if (browseMode !== "products") return;
  const category = getProductsCategoryInfo();
  updateProductsCategoryBrowserVisibility(category);

  if (!category) {
    data = { title: "Products", thumbnail: "" };
    return;
  }

  data = category;
  document.title = `${category.title} Products | NIHON ASIA ENTERPRISE Heavy Duty Truck Parts`;

  document.querySelector(".category-hero-copy h1")?.replaceChildren(document.createTextNode(category.title));

  const intro = document.querySelector(".category-hero-copy p:last-child");
  if (intro) {
    intro.textContent = `Browse ${category.title} products. Use search and filters to narrow the catalog.`;
  }

  const breadcrumbLast = document.querySelector(".breadcrumb span:last-child");
  if (breadcrumbLast) breadcrumbLast.textContent = category.title;

  const headEyebrow = document.querySelector(".catalogue-head .eyebrow");
  if (headEyebrow) headEyebrow.innerHTML = "<span></span> Product category";

  const headTitle = document.querySelector(".catalogue-head h2");
  if (headTitle) headTitle.innerHTML = `${escapeHtml(category.title)} <em>products</em>`;

  const noteCopy = document.querySelector(".catalogue-note p");
  if (noteCopy) noteCopy.textContent = "Return to all products at any time or contact the parts team for model confirmation.";

  const noteAction = document.querySelector(".catalogue-note .button");
  if (noteAction) {
    noteAction.href = productsPath();
    noteAction.innerHTML = "Back to products <span>&nearr;</span>";
  }
}

function flattenCatalogueValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap(item => flattenCatalogueValue(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(item => flattenCatalogueValue(item));
  }

  return value ? [String(value)] : [];
}

function getProductGalleryImages(product) {
  const imageValues = [
    product.image,
    product.thumbnail,
    ...flattenCatalogueValue(product.images),
    ...flattenCatalogueValue(product.gallery),
    ...flattenCatalogueValue(product.photos),
    ...flattenCatalogueValue(product.productImages),
    ...flattenCatalogueValue(product.imageList),
    ...flattenCatalogueValue(product.additionalImages)
  ];
  const seen = new Set();

  return imageValues
    .map(value => String(value || "").trim())
    .filter(Boolean)
    .map(value => assetPath(value))
    .filter(value => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function getProductDetailHref(product) {
  return product.url
    ? assetPath(product.url)
    : (product.slug ? assetPath(`products/${product.slug}.html`) : "");
}

function renderProductImage(product, detailHref = "", options = {}) {
  const images = getProductGalleryImages(product);
  const imageSrc = images[0] || getProductImageSrc(product);
  const encodedImages = escapeHtml(JSON.stringify(images.length ? images : (imageSrc ? [imageSrc] : [])));
  const alt = `${product.name} ${product.number}`.trim();
  const summary = getCustomerProductSummary(product);

  if (!imageSrc) {
    return "<span class=\"product-image-placeholder\">PART</span>";
  }

  if (options.staticOnly) {
    return `<span class="product-photo-button" aria-hidden="true">
      <img class="product-photo" loading="lazy" decoding="async" src="${escapeHtml(imageSrc)}" alt="">
    </span>`;
  }

  if (detailHref) {
    return `<a class="product-photo-button" href="${escapeHtml(detailHref)}" aria-label="${escapeHtml(`View details for ${summary.number || alt}`)}">
      <img class="product-photo" loading="lazy" decoding="async" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(alt)}">
    </a>`;
  }

  return `<button class="product-photo-button" type="button" data-lightbox-src="${escapeHtml(imageSrc)}" data-lightbox-images="${encodedImages}" data-lightbox-alt="${escapeHtml(alt)}" data-lightbox-number="${escapeHtml(summary.number)}" data-lightbox-name="${escapeHtml(summary.name)}" data-lightbox-brand="${escapeHtml(summary.brand)}">
      <img class="product-photo" loading="lazy" decoding="async" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(alt)}">
    </button>`;
}

function getProductImageSrc(product) {
  return assetPath(product.image || product.thumbnail || data.thumbnail);
}

function isInternalCustomerValue(value) {
  const raw = String(value ?? "").trim();
  const normalized = normalizeSearchValue(raw);

  return !raw
    || normalized.startsWith("review")
    || normalized.includes("manual review")
    || normalized.includes("needs review")
    || normalized.includes("ocr")
    || normalized.includes("confidence")
    || normalized.includes("import status")
    || normalized.includes("internal");
}

function cleanCustomerField(value, fallback = "") {
  const text = String(value ?? "").trim();
  return isInternalCustomerValue(text) ? fallback : text;
}

function getCustomerProductSummary(product) {
  const number = cleanCustomerField(product.number || product.productNumber || product.partNumber || product.id, "Part number unavailable");
  const name = cleanCustomerField(product.productName || product.name || product.description, "Product image");
  const brandName = cleanCustomerField(product.brand, "Brand not specified");

  return {
    number,
    name,
    brand: brandName,
    enquiry: [number, name, brandName].filter(Boolean).join(" / ")
  };
}

function renderSearchBrandLogo(product) {
  const brandName = product.brand || "Brand not specified";
  const brandInfo = resolveBrandLogo(brandName);
  const logo = brandInfo?.logo || "";
  const label = logo ? `${brandInfo.name || brandName} logo` : "Brand logo placeholder";

  return `<span class="search-result-logo${logo ? " has-logo" : ""}" aria-label="${escapeHtml(label)}">
    ${logo ? `<img loading="lazy" decoding="async" src="${escapeHtml(assetPath(logo))}" alt="">` : ""}
    <span class="search-result-logo-placeholder" aria-hidden="true">BRAND</span>
  </span>`;
}

function renderSearchResultCard(product, searchState) {
  const images = getProductGalleryImages(product);
  const imageSrc = images[0] || getProductImageSrc(product);
  const encodedImages = escapeHtml(JSON.stringify(images.length ? images : (imageSrc ? [imageSrc] : [])));
  const summary = getCustomerProductSummary(product);
  const detailHref = getProductDetailHref(product);
  const productNumber = summary.number || "PART NUMBER UNAVAILABLE";
  const productName = summary.name || "PRODUCT DESCRIPTION UNAVAILABLE";
  const brandName = summary.brand || "Brand not specified";
  const categoryName = product.hasCategory ? product.categoryLabel : "";
  const meta = [
    brandName ? `<span>${highlightText(brandName, searchState.highlightTerms)}</span>` : "",
    categoryName ? `<span>${highlightText(categoryName, searchState.highlightTerms)}</span>` : ""
  ].filter(Boolean).join("<span class=\"search-result-separator\" aria-hidden=\"true\">&middot;</span>");
  const label = `${productNumber} ${productName}`.trim();
  const href = detailHref || imageSrc || contactPath();
  const opensLightbox = !detailHref && Boolean(imageSrc);

  return `<a class="product-card search-result-card" href="${escapeHtml(href)}" data-result-lightbox="${opensLightbox ? "true" : "false"}" data-lightbox-src="${escapeHtml(imageSrc)}" data-lightbox-images="${encodedImages}" data-lightbox-alt="${escapeHtml(label)}" data-lightbox-number="${escapeHtml(productNumber)}" data-lightbox-name="${escapeHtml(productName)}" data-lightbox-brand="${escapeHtml(brandName)}" data-lightbox-enquiry="${escapeHtml(summary.enquiry)}" aria-label="${escapeHtml(detailHref ? `View details for ${label}` : `View product image for ${label}`)}">
    ${renderSearchBrandLogo(product)}
    <span class="search-result-content">
      <strong class="search-result-code">${highlightProductNumber(productNumber, searchState)}</strong>
      <span class="search-result-name">${highlightText(productName, searchState.highlightTerms)}</span>
      ${meta ? `<span class="search-result-meta">${meta}</span>` : ""}
    </span>
  </a>`;
}

function renderProductCard(product, searchState) {
  if (browseMode === "search") {
    return renderSearchResultCard(product, searchState);
  }

  const description = product.description || product.application || "Heavy-duty replacement part";
  const brandLabel = product.brand || "Brand not specified";
  const brandMeta = `<div class="product-meta"><span class="product-brand">${highlightText(brandLabel, searchState.highlightTerms)}</span></div>`;
  const detailHref = getProductDetailHref(product);
  const content = `
    <div class="product-image has-photo">
      ${renderProductImage(product, "", { staticOnly: Boolean(detailHref) })}
    </div>
    <div class="product-body${detailHref ? " product-detail-link" : ""}">
      <span class="product-code-label">Product Code</span>
      <strong class="product-code">${highlightProductNumber(product.number, searchState)}</strong>
      <h3>${highlightText(product.name, searchState.highlightTerms)}</h3>
      <p class="product-description">${highlightText(description, searchState.highlightTerms)}</p>
      ${brandMeta}
    </div>`;

  return detailHref
    ? `<a class="product-card product-card-link" href="${escapeHtml(detailHref)}" aria-label="${escapeHtml(`View details for ${product.number || product.name}`)}">${content}</a>`
    : `<article class="product-card">${content}</article>`;
}

function ensureLoadMoreButton() {
  let shell = document.querySelector("#loadMoreProducts");

  if (!shell && catalogueNote) {
    shell = document.createElement("div");
    shell.id = "loadMoreProducts";
    shell.className = "load-more-products";
    shell.innerHTML = "<button class=\"button button-dark\" type=\"button\">Load more products <span>&darr;</span></button>";
    catalogueNote.parentNode.insertBefore(shell, catalogueNote);
    shell.querySelector("button").addEventListener("click", () => {
      visibleCount += pageSize;
      render();
    });
  }

  return shell;
}

function render() {
  pendingRender = 0;
  updateSearchChrome();

  const searchState = getSearchState();
  const selectedBrand = brand?.value || "";
  const selectedStock = stock?.value || "";
  const selectedCategory = getSelectedCategoryFilter();
  const renderKey = [
    browseMode,
    pageProductsCategorySlug,
    searchState.normalized,
    selectedBrand,
    selectedStock,
    selectedCategory,
    visibleCount,
    catalogueRecords.length,
    allCatalogueRecords.length
  ].join("|");

  if (renderKey === lastRenderKey) return;
  lastRenderKey = renderKey;

  const sourceRecords = searchState.tokens.length && !hasProductsCategoryScope()
    ? allCatalogueRecords
    : catalogueRecords;
  const filteredRecords = sourceRecords
    .filter(record => {
      const product = record.product;
      const brandMatches = !selectedBrand || product.brand === selectedBrand;
      const stockMatches = !selectedStock || product.availability === selectedStock;
      const categoryMatches = !selectedCategory || product.categoryGroup === selectedCategory;
      return brandMatches && stockMatches && categoryMatches && matchesSearch(record, searchState);
    });

  if (searchState.tokens.length) {
    filteredRecords.sort((a, b) => {
      const scoreDiff = scoreSearchRecord(b, searchState) - scoreSearchRecord(a, searchState);
      return scoreDiff || a.index - b.index;
    });
  }

  const filtered = filteredRecords.map(record => record.product);

  const renderLimit = hasProductsCategoryScope() ? filtered.length : visibleCount;
  const visible = filtered.slice(0, renderLimit);

  const hasAnyProducts = allCatalogueProducts.length > 0;
  const hasBaseProducts = catalogueProducts.length > 0;
  const hasSearch = searchState.tokens.length > 0;

  if (count) {
    count.textContent = browseMode === "brand" && !hasBaseProducts
      ? "No products available for this brand yet."
      : hasAnyProducts
      ? (searchState.tokens.length
        ? `${visible.length} of ${filtered.length} matching products shown`
        : `${visible.length} of ${filtered.length} catalogue items shown`)
      : "No products available yet.";
  }

  if (productGrid) {
    const emptyState = getCatalogueEmptyState({
      hasAnyProducts,
      hasBaseProducts,
      hasSearch
    });
    productGrid.innerHTML = visible.length
      ? visible.map(product => renderProductCard(product, searchState)).join("")
      : `<div class="no-results"><strong>${emptyState.title}</strong><span>${emptyState.copy}</span></div>`;
  }

  const loadMore = ensureLoadMoreButton();
  if (loadMore) {
    loadMore.hidden = hasProductsCategoryScope() || filtered.length <= visibleCount;
  }
}

function getCatalogueEmptyState(state) {
  if (state.hasSearch && state.hasAnyProducts) {
    return {
      title: "No matching products found.",
      copy: "Try another product code, description, engine model, vehicle model, brand, OCR keyword or file name."
    };
  }

  if (browseMode === "brand" && !state.hasBaseProducts) {
    return {
      title: "No products available for this brand yet.",
      copy: "Imported products assigned to this brand will appear here after the next catalog sync."
    };
  }

  if (browseMode === "products") {
    return {
      title: "No products available yet.",
      copy: "New catalog items will appear here after import."
    };
  }

  return {
    title: "No products available yet.",
    copy: "New catalog items will appear here after import."
  };
}

function scheduleRender() {
  if (pendingRender) return;
  pendingRender = requestAnimationFrame(render);
}

function ensureImageLightbox() {
  if (document.querySelector("#image-lightbox")) return;

  const lightbox = document.createElement("div");
  lightbox.id = "image-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-label", "Product image viewer");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML = `
    <button class="close-lightbox" type="button" aria-label="Close image preview">&times;</button>
    <div class="lightbox-panel">
      <div class="lightbox-stage" data-lightbox-stage>
        <button class="lightbox-nav lightbox-prev" type="button" data-lightbox-prev aria-label="Previous product image">&larr;</button>
        <img class="lightbox-image" alt="">
        <button class="lightbox-nav lightbox-next" type="button" data-lightbox-next aria-label="Next product image">&rarr;</button>
      </div>
      <div class="lightbox-tools" aria-label="Image preview controls">
        <span class="lightbox-counter" data-lightbox-count hidden></span>
        <div class="lightbox-zoom-controls">
          <button type="button" data-lightbox-zoom-out aria-label="Zoom out">Zoom Out</button>
          <button type="button" data-lightbox-zoom-reset aria-label="Reset zoom">Reset</button>
          <button type="button" data-lightbox-zoom-in aria-label="Zoom in">Zoom In</button>
        </div>
      </div>
      <div class="lightbox-product-info" hidden>
        <div>
          <span>Product Number</span>
          <strong data-lightbox-product-number></strong>
        </div>
        <div>
          <span>Product Name</span>
          <strong data-lightbox-product-name></strong>
        </div>
        <div>
          <span>Brand</span>
          <strong data-lightbox-product-brand></strong>
        </div>
        <a class="button button-orange" href="${escapeHtml(contactPath())}" data-lightbox-enquire>Enquire <span>&nearr;</span></a>
      </div>
    </div>
  `;
  document.body.append(lightbox);
}

function getCatalogueLightboxImage() {
  return document.querySelector("#image-lightbox .lightbox-image")
    || document.querySelector("#image-lightbox .lightbox-panel>img");
}

function setLightboxProductInfo(lightbox, info) {
  const panel = lightbox.querySelector(".lightbox-product-info");
  const number = cleanCustomerField(info?.number, "");
  const name = cleanCustomerField(info?.name, "");
  const brandName = cleanCustomerField(info?.brand, "");
  const hasInfo = Boolean(number || name || brandName);

  lightbox.classList.toggle("has-product-info", hasInfo);
  if (!panel) return;

  panel.hidden = !hasInfo;

  if (!hasInfo) {
    panel.querySelector("[data-lightbox-product-number]").textContent = "";
    panel.querySelector("[data-lightbox-product-name]").textContent = "";
    panel.querySelector("[data-lightbox-product-brand]").textContent = "";
    panel.querySelector("[data-lightbox-enquire]").dataset.lightboxEnquire = "";
    return;
  }

  panel.querySelector("[data-lightbox-product-number]").textContent = number || "Part number unavailable";
  panel.querySelector("[data-lightbox-product-name]").textContent = name || "Product image";
  panel.querySelector("[data-lightbox-product-brand]").textContent = brandName || "Brand not specified";
  panel.querySelector("[data-lightbox-enquire]").dataset.lightboxEnquire = [number, name, brandName].filter(Boolean).join(" / ");
}

function lockCatalogueLightboxScroll() {
  catalogueLightboxScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = `-${catalogueLightboxScrollY}px`;
  document.body.classList.add("lightbox-open");
}

function unlockCatalogueLightboxScroll() {
  const scrollY = catalogueLightboxScrollY || 0;
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.body.classList.remove("lightbox-open");
  document.body.style.top = "";
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, scrollY);
  requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  });
  catalogueLightboxScrollY = 0;
}

function clampCatalogueLightboxZoom(value) {
  return Math.min(catalogueLightboxMaxZoom, Math.max(catalogueLightboxMinZoom, Number(value) || 1));
}

function updateCatalogueLightboxZoom() {
  const image = getCatalogueLightboxImage();
  const lightbox = document.querySelector("#image-lightbox");
  if (!image || !lightbox) return;

  const scale = clampCatalogueLightboxZoom(catalogueLightboxState.scale);
  catalogueLightboxState.scale = scale;
  image.style.transform = `scale(${scale})`;
  lightbox.classList.toggle("is-zoomed", scale > 1.01);
}

function setCatalogueLightboxZoom(value) {
  catalogueLightboxState.scale = clampCatalogueLightboxZoom(value);
  updateCatalogueLightboxZoom();
}

function resetCatalogueLightboxZoom() {
  setCatalogueLightboxZoom(1);
}

function updateCatalogueLightboxControls(lightbox) {
  const hasMultiple = catalogueLightboxState.images.length > 1;
  const counter = lightbox.querySelector("[data-lightbox-count]");
  const prev = lightbox.querySelector("[data-lightbox-prev]");
  const next = lightbox.querySelector("[data-lightbox-next]");

  lightbox.classList.toggle("has-multiple-images", hasMultiple);
  [prev, next].forEach(button => {
    if (button) button.hidden = !hasMultiple;
  });

  if (counter) {
    counter.hidden = !hasMultiple;
    counter.textContent = hasMultiple
      ? `${catalogueLightboxState.index + 1} / ${catalogueLightboxState.images.length}`
      : "";
  }
}

function setCatalogueLightboxImage(index) {
  const lightbox = document.querySelector("#image-lightbox");
  const image = getCatalogueLightboxImage();
  if (!lightbox || !image || !catalogueLightboxState.images.length) return;

  const length = catalogueLightboxState.images.length;
  catalogueLightboxState.index = ((index % length) + length) % length;
  image.src = catalogueLightboxState.images[catalogueLightboxState.index];
  image.alt = lightbox.dataset.lightboxAlt || "Product image preview";
  resetCatalogueLightboxZoom();
  updateCatalogueLightboxControls(lightbox);
}

function moveCatalogueLightboxImage(direction) {
  if (catalogueLightboxState.images.length <= 1) return;
  setCatalogueLightboxImage(catalogueLightboxState.index + direction);
}

function parseCatalogueLightboxImages(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    return String(value).trim() ? [String(value).trim()] : [];
  }
}

function getCatalogueLightboxFocusable(lightbox) {
  return Array.from(lightbox.querySelectorAll("button:not([hidden]):not(:disabled), a[href]:not([hidden])"))
    .filter(element => element.offsetParent !== null || element === document.activeElement);
}

function openLightbox(imagesOrSrc, alt, productInfo = null, options = {}) {
  ensureImageLightbox();

  const lightbox = document.querySelector("#image-lightbox");
  const image = getCatalogueLightboxImage();
  if (!lightbox || !image) return;
  const images = Array.isArray(imagesOrSrc)
    ? imagesOrSrc.filter(Boolean)
    : [imagesOrSrc].filter(Boolean);
  if (!images.length) return;

  const wasOpen = lightbox.classList.contains("open");
  catalogueLightboxState.images = Array.from(new Set(images));
  catalogueLightboxState.index = Math.min(Math.max(Number(options.startIndex) || 0, 0), catalogueLightboxState.images.length - 1);
  catalogueLightboxState.scale = 1;
  catalogueLightboxState.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  lightbox.dataset.lightboxAlt = alt || "Product image preview";

  setCatalogueLightboxImage(catalogueLightboxState.index);
  setLightboxProductInfo(lightbox, productInfo);
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");

  if (!wasOpen) {
    lockCatalogueLightboxScroll();
  }

  requestAnimationFrame(() => {
    lightbox.querySelector(".close-lightbox")?.focus({ preventScroll: true });
  });
}

function closeLightbox() {
  const lightbox = document.querySelector("#image-lightbox");
  const image = getCatalogueLightboxImage();
  if (!lightbox) return;
  if (!lightbox.classList.contains("open")) return;
  const focusTarget = catalogueLightboxState.lastFocus;

  lightbox.classList.remove("open");
  lightbox.classList.remove("has-product-info");
  lightbox.classList.remove("has-multiple-images");
  lightbox.classList.remove("is-zoomed");
  lightbox.setAttribute("aria-hidden", "true");
  unlockCatalogueLightboxScroll();

  if (image) {
    image.removeAttribute("src");
    image.style.transform = "";
  }
  catalogueLightboxState.images = [];
  catalogueLightboxState.index = 0;
  catalogueLightboxState.scale = 1;
  setLightboxProductInfo(lightbox, null);

  if (focusTarget?.focus) {
    focusTarget.focus({ preventScroll: true });
  }
}

function bindCatalogueEvents() {
  [search, brand, stock].forEach(el => {
    el?.addEventListener("input", () => {
      visibleCount = pageSize;
      scheduleRender();
    });
    el?.addEventListener("change", () => {
      visibleCount = pageSize;
      scheduleRender();
    });
  });

  productGrid?.addEventListener("click", event => {
    const resultCard = event.target.closest("[data-result-lightbox='true']");
    if (resultCard) {
      event.preventDefault();
      const images = parseCatalogueLightboxImages(resultCard.dataset.lightboxImages)
        .concat(resultCard.dataset.lightboxSrc || "")
        .filter(Boolean);
      openLightbox(Array.from(new Set(images)), resultCard.dataset.lightboxAlt, {
        number: resultCard.dataset.lightboxNumber,
        name: resultCard.dataset.lightboxName,
        brand: resultCard.dataset.lightboxBrand
      });
      return;
    }

    const preview = event.target.closest("[data-lightbox-src]");
    if (preview?.dataset.lightboxSrc) {
      const images = parseCatalogueLightboxImages(preview.dataset.lightboxImages)
        .concat(preview.dataset.lightboxSrc || "")
        .filter(Boolean);
      openLightbox(Array.from(new Set(images)), preview.dataset.lightboxAlt, {
        number: preview.dataset.lightboxNumber,
        name: preview.dataset.lightboxName,
        brand: preview.dataset.lightboxBrand
      });
      return;
    }

    const enquiry = event.target.closest("[data-enquire]");
    if (enquiry) {
      sessionStorage.setItem("nihonAsiaEnquiry", `${data.title || "Product"}: ${enquiry.dataset.enquire}`);
      location.href = contactPath();
    }
  });

  productGrid?.addEventListener("error", event => {
    const image = event.target;
    const logo = event.target.closest?.(".search-result-logo");
    if (!logo) return;

    const failedUrl = image?.currentSrc || image?.src || image?.getAttribute?.("src") || "";
    console.warn(`Brand logo failed to load: ${failedUrl}`);
    logo.classList.add("missing-logo");
    image.remove();
  }, true);

  document.addEventListener("click", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open")) return;

    const zoomIn = event.target.closest("[data-lightbox-zoom-in]");
    if (zoomIn) {
      event.preventDefault();
      setCatalogueLightboxZoom(catalogueLightboxState.scale + catalogueLightboxZoomStep);
      return;
    }

    const zoomOut = event.target.closest("[data-lightbox-zoom-out]");
    if (zoomOut) {
      event.preventDefault();
      setCatalogueLightboxZoom(catalogueLightboxState.scale - catalogueLightboxZoomStep);
      return;
    }

    const zoomReset = event.target.closest("[data-lightbox-zoom-reset]");
    if (zoomReset) {
      event.preventDefault();
      resetCatalogueLightboxZoom();
      return;
    }

    if (event.target.closest("[data-lightbox-prev]")) {
      event.preventDefault();
      moveCatalogueLightboxImage(-1);
      return;
    }

    if (event.target.closest("[data-lightbox-next]")) {
      event.preventDefault();
      moveCatalogueLightboxImage(1);
      return;
    }

    const lightboxEnquiry = event.target.closest("[data-lightbox-enquire]");
    if (lightboxEnquiry) {
      const enquiryText = lightboxEnquiry.dataset.lightboxEnquire || "";
      if (enquiryText) {
        sessionStorage.setItem("nihonAsiaEnquiry", enquiryText);
      }
      closeLightbox();
      return;
    }

    if (event.target === lightbox || event.target.closest(".close-lightbox")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open")) return;

    if (event.key === "Escape") {
      closeLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveCatalogueLightboxImage(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveCatalogueLightboxImage(1);
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getCatalogueLightboxFocusable(lightbox);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("wheel", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open")) return;
    if (!event.target.closest("#image-lightbox")) return;

    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    setCatalogueLightboxZoom(catalogueLightboxState.scale + direction * catalogueLightboxZoomStep);
  }, { passive: false });

  document.addEventListener("touchstart", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open") || !event.target.closest("[data-lightbox-stage]")) return;

    if (event.touches.length === 2) {
      const [first, second] = event.touches;
      catalogueLightboxState.touchStartDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      catalogueLightboxState.touchStartScale = catalogueLightboxState.scale;
      return;
    }

    if (event.touches.length === 1) {
      catalogueLightboxState.touchStartX = event.touches[0].clientX;
      catalogueLightboxState.touchStartY = event.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener("touchmove", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open") || !event.target.closest("[data-lightbox-stage]")) return;

    if (event.touches.length === 2 && catalogueLightboxState.touchStartDistance) {
      event.preventDefault();
      const [first, second] = event.touches;
      const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      const ratio = distance / catalogueLightboxState.touchStartDistance;
      setCatalogueLightboxZoom(catalogueLightboxState.touchStartScale * ratio);
    }
  }, { passive: false });

  document.addEventListener("touchend", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open")) return;

    if (event.changedTouches.length !== 1 || catalogueLightboxState.scale > 1.05) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - catalogueLightboxState.touchStartX;
    const deltaY = touch.clientY - catalogueLightboxState.touchStartY;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25 && catalogueLightboxState.images.length > 1) {
      moveCatalogueLightboxImage(deltaX > 0 ? -1 : 1);
      return;
    }

    if (deltaY > 90 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      closeLightbox();
    }
  }, { passive: true });
}

function getBrandFromPage(brands) {
  if (pageBrandId) {
    const byId = brands.find(item => item.id === pageBrandId);
    if (byId) return byId;
  }

  const explicitName = pageBrandName || document.querySelector(".category-hero-copy h1")?.textContent?.trim() || "";
  return brands.find(item => normalizeSearchValue(item.name) === normalizeSearchValue(explicitName)) || {
    id: normalizeSearchValue(explicitName).replace(/\s+/g, "-"),
    name: explicitName || "Brand",
    aliases: explicitName ? [explicitName] : [],
    logo: ""
  };
}

function getBaseProducts(products) {
  if (browseMode === "brand") {
    return products.filter(product => productMatchesBrand(product, activeBrand));
  }

  if (browseMode === "category") {
    if (pageCategoryGroup) {
      return products.filter(product => product.categoryGroup === pageCategoryGroup);
    }

    return products.filter(product => product.category === pageCategorySlug);
  }

  if (hasProductsCategoryScope()) {
    return products.filter(product => product.category === pageProductsCategorySlug);
  }

  return products;
}

function applyInitialSearchFromUrl() {
  if (!search) return;

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) {
    search.value = query;
  }
}

async function initCataloguePage() {
  if (!document.querySelector("#productGrid") && browseMode !== "brand") return;

  const [catalogue, importedJson, brandsJson] = await Promise.all([
    loadJson("catalogue.json", json => Array.isArray(json?.categories)),
    loadJson("products.generated.json", json => Array.isArray(json)),
    loadJson("brands.json", json => Array.isArray(json?.brands))
  ]);

  allCategories = Array.isArray(catalogue?.categories) ? catalogue.categories : fallbackCategories;
  allBrands = Array.isArray(brandsJson?.brands) ? brandsJson.brands : [];
  brandLogoLookup = buildBrandLogoLookup(allBrands);
  renderProductsCategoryCards(allCategories);
  hydrateProductCategoryCards(allCategories);

  if (browseMode === "brand") {
    activeBrand = getBrandFromPage(allBrands);
    updateBrandPageChrome(activeBrand);
    ensureBrandProductScaffold();
  }

  refreshCatalogueElements();

  if (browseMode === "category") {
    data = pageCategoryGroup
      ? getSyntheticCategoryForGroup(pageCategoryGroup)
      : (allCategories.find(category => category.slug === pageCategorySlug) || getSyntheticCategoryForGroup("other"));
    updateCategoryPageChrome(data);
  } else if (browseMode === "search") {
    data = { title: "Global Product Search", thumbnail: "" };
    updateSearchPageChrome();
  } else if (browseMode === "products") {
    updateProductsPageChrome();
  } else if (activeBrand) {
    data = { title: activeBrand.name, thumbnail: activeBrand.logo || "" };
  }

  const importedProducts = Array.isArray(importedJson)
    ? importedJson
    : (Array.isArray(window.NAE_IMPORTED_PRODUCTS) ? window.NAE_IMPORTED_PRODUCTS : []);

  const seen = new Set();
  allCatalogueProducts = importedProducts.map(product => normalizeProduct({ ...product, isImported: true })).filter(product => {
    const key = `${normalizeSearchValue(product.brand)}|${normalizeSearchValue(product.number || product.id || product.name)}`;
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  allCatalogueRecords = allCatalogueProducts.map((product, index) => buildSearchRecord(product, index));

  catalogueProducts = getBaseProducts(allCatalogueProducts);
  catalogueRecords = catalogueProducts.map((product, index) => buildSearchRecord(product, index));

  hydrateFilterOptions(brand, Array.from(new Set(allCatalogueProducts.map(product => product.brand))), "All brands");
  hydrateFilterOptions(stock, Array.from(new Set(allCatalogueProducts.map(product => product.availability))), "All availability");
  renderCategoryFilter();
  enhanceSearchBar();
  ensureImageLightbox();
  bindCatalogueEvents();
  applyInitialSearchFromUrl();
  render();
}

initCataloguePage();
