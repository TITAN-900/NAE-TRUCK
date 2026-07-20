const categoryScript = document.currentScript;
const categorySiteRoot = categoryScript ? new URL("../../", categoryScript.src) : new URL("../../", window.location.href);
const categoryDataRoot = new URL("assets/data/", categorySiteRoot);

const pageSize = 24;
const browseMode = document.body.dataset.browseMode || (document.body.classList.contains("brand-page") ? "brand" : (document.body.dataset.category ? "category" : "search"));
const pageCategorySlug = document.body.dataset.category || "";
const pageCategoryGroup = document.body.dataset.categoryGroup || "";
const pageBrandId = document.body.dataset.brandId || "";
const pageBrandName = document.body.dataset.brand || "";

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
  return new URL("index.html#contact", categorySiteRoot).href;
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
  const categorySlug = product.category || "other";
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
    ...(product.keywords || []),
    ...(product.specs || []),
    ...flattenSpecificationObject(product.specifications)
  ].filter(Boolean);
}

function buildSearchRecord(product, index) {
  const fields = getProductSearchFields(product);
  const joined = fields.join(" ");
  return {
    product,
    index,
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
  return categoryFilter?.querySelector("[aria-pressed='true']")?.dataset.categoryFilter || "";
}

function renderCategoryFilter() {
  if (!categoryFilter) return;

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

  document.title = `${brandInfo.name} Products | NAE Enterprise Heavy Truck Parts`;
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
  document.title = `${category.title} | NAE Enterprise Heavy Truck Parts`;

  document.querySelectorAll("[data-category-title]").forEach(el => {
    el.textContent = category.title;
  });

  document.querySelectorAll("[data-category-icon]").forEach(el => {
    const image = category.thumbnail
      ? `<img class="category-symbol-image" loading="lazy" decoding="async" src="${escapeHtml(assetPath(category.thumbnail))}" alt="">`
      : "<span class=\"category-symbol-fallback\">NAE</span>";

    el.innerHTML = image;
    el.setAttribute("aria-hidden", "true");
  });

  const intro = document.querySelector("[data-category-intro]");
  if (intro) intro.textContent = category.intro || category.desc || "";
}

function updateSearchPageChrome() {
  if (browseMode !== "search") return;
  document.title = "Global Product Search | NAE Enterprise Heavy Truck Parts";
}

function renderProductImage(product) {
  const imageSrc = assetPath(product.image || data.thumbnail);
  const alt = `${product.name} ${product.number}`.trim();

  if (!imageSrc) {
    return "<span class=\"product-image-placeholder\">NAE</span>";
  }

  return `<button class="product-photo-button" type="button" data-lightbox-src="${escapeHtml(imageSrc)}" data-lightbox-alt="${escapeHtml(alt)}">
      <img class="product-photo" loading="lazy" decoding="async" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(alt)}">
    </button>`;
}

function renderProductCard(product, searchState) {
  const vehicleModel = product.vehicleModel || product.application;
  const meta = [
    `<span class="product-brand">Brand: ${highlightText(product.brand, searchState.highlightTerms)}</span>`,
    `<span>Category: ${highlightText(product.categoryLabel, searchState.highlightTerms)}</span>`,
    vehicleModel ? `<span class="product-vehicle">Vehicle Model: ${highlightText(vehicleModel, searchState.highlightTerms)}</span>` : "",
    product.subcategory ? `<span>Subcategory: ${highlightText(product.subcategory, searchState.highlightTerms)}</span>` : "",
    ...(product.specs || []).slice(0, 3).map(item => `<span>${highlightText(item, searchState.highlightTerms)}</span>`)
  ].filter(Boolean);

  const badge = product.isImported ? "Imported product" : "Catalogue preview";
  const description = product.description || product.application || "Heavy-duty replacement part";

  return `<article class="product-card">
    <div class="product-image has-photo">
      <span class="product-badge">${escapeHtml(badge)}</span>
      ${renderProductImage(product)}
    </div>
    <div class="product-body">
      <span class="product-code-label">Product Number</span>
      <strong class="product-code">${highlightProductNumber(product.number, searchState)}</strong>
      <h3>${highlightText(product.name, searchState.highlightTerms)}</h3>
      <div class="product-meta">${meta.join("")}</div>
      <p class="product-description">${highlightText(description, searchState.highlightTerms)}</p>
      <div class="product-action">
        <small class="stock-status">${escapeHtml(product.availability)}</small>
        <button data-enquire="${escapeHtml(`${product.number} ${product.name}`)}">Enquire &nearr;</button>
      </div>
    </div>
  </article>`;
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

  const sourceRecords = searchState.tokens.length ? allCatalogueRecords : catalogueRecords;
  const filtered = sourceRecords
    .filter(record => {
      const product = record.product;
      const brandMatches = !selectedBrand || product.brand === selectedBrand;
      const stockMatches = !selectedStock || product.availability === selectedStock;
      const categoryMatches = !selectedCategory || product.categoryGroup === selectedCategory;
      return brandMatches && stockMatches && categoryMatches && matchesSearch(record, searchState);
    })
    .map(record => record.product);

  const visible = filtered.slice(0, visibleCount);

  if (count) {
    count.textContent = searchState.tokens.length
      ? `${visible.length} of ${filtered.length} matching products shown`
      : `${visible.length} of ${filtered.length} catalogue items shown`;
  }

  if (productGrid) {
    productGrid.innerHTML = visible.length
      ? visible.map(product => renderProductCard(product, searchState)).join("")
      : "<div class=\"no-results\"><strong>No products found</strong><span>Try another product number, product name, brand, category, vehicle model, OD, ID, HI, PIN or specification.</span></div>";
  }

  const loadMore = ensureLoadMoreButton();
  if (loadMore) {
    loadMore.hidden = filtered.length <= visibleCount;
  }
}

function scheduleRender() {
  if (pendingRender) return;
  pendingRender = requestAnimationFrame(render);
}

function ensureImageLightbox() {
  if (document.querySelector("#image-lightbox")) return;

  const lightbox = document.createElement("div");
  lightbox.id = "image-lightbox";
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML = `
    <button class="close-lightbox" type="button" aria-label="Close image preview">&times;</button>
    <img alt="">
  `;
  document.body.append(lightbox);
}

function openLightbox(src, alt) {
  ensureImageLightbox();

  const lightbox = document.querySelector("#image-lightbox");
  const image = lightbox?.querySelector("img");
  if (!lightbox || !image) return;

  image.src = src;
  image.alt = alt || "Product image preview";
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  const lightbox = document.querySelector("#image-lightbox");
  const image = lightbox?.querySelector("img");
  if (!lightbox) return;

  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");

  if (image) image.removeAttribute("src");
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
    const preview = event.target.closest("[data-lightbox-src]");
    if (preview) {
      openLightbox(preview.dataset.lightboxSrc, preview.dataset.lightboxAlt);
      return;
    }

    const enquiry = event.target.closest("[data-enquire]");
    if (enquiry) {
      sessionStorage.setItem("naeEnquiry", `${data.title || "Product"}: ${enquiry.dataset.enquire}`);
      location.href = contactPath();
    }
  });

  document.addEventListener("click", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open")) return;

    if (event.target === lightbox || event.target.closest(".close-lightbox")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });
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
