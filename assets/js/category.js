const categoryScript = document.currentScript;
const categorySiteRoot = categoryScript ? new URL("../../", categoryScript.src) : new URL("../../", window.location.href);
const categoryDataRoot = new URL("assets/data/", categorySiteRoot);
const slug = document.body.dataset.category;

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
    slug: "clutch-system",
    num: "02",
    title: "Clutch System",
    desc: "High-load engagement and driveline control.",
    intro: "Engagement, release and actuation parts engineered for heavy commercial drivetrains.",
    thumbnail: "assets/img/categories/clutch-system.svg",
    items: ["Clutch discs", "Pressure plates", "Release bearings", "Clutch boosters"]
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
    slug: "suspension-system",
    num: "04",
    title: "Suspension System",
    desc: "Ride control for demanding roads and payloads.",
    intro: "Load-control and ride components for prime movers, container haulers and trailers.",
    thumbnail: "assets/img/categories/suspension-system.svg",
    items: ["Leaf springs", "Torque rods", "Shock absorbers", "Air springs"]
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
    slug: "steering-system",
    num: "07",
    title: "Steering System",
    desc: "Precise control for heavy commercial chassis.",
    intro: "Hydraulic and mechanical steering components for accurate, dependable road control.",
    thumbnail: "assets/img/categories/steering-system.svg",
    items: ["Steering pumps", "Drag links", "Tie rods", "Repair kits"]
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

const pageSize = 24;

let data = fallbackCategories.find(category => category.slug === slug) || fallbackCategories[0];
let visibleCount = pageSize;
let pendingRender = 0;
let catalogueProducts = [];
let catalogueRecords = [];
let lastRenderKey = "";

const productGrid = document.querySelector("#productGrid");
const search = document.querySelector("#productSearch");
const brand = document.querySelector("#brandFilter");
const stock = document.querySelector("#stockFilter");
const count = document.querySelector("#resultCount");
const catalogueNote = document.querySelector(".catalogue-note");

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
    ...flattenSpecificationObject(product.specifications)
  ].filter(Boolean)));
}

function normalizeProduct(product, category) {
  const categorySlug = product.category || category.slug;
  const productNumber = product.number || product.partNumber || product.id || "";
  const vehicleBrand = product.vehicleBrand || product.brand || product.applicationBrand || "Brand not specified";

  return {
    id: product.id || productNumber,
    number: productNumber,
    name: product.name || product.productName || "Catalogue Product",
    category: categorySlug,
    description: product.shortDescription || product.description || product.application || "Heavy-duty replacement part",
    application: product.application || "",
    brand: vehicleBrand,
    availability: product.availability || product.stockStatus || product.stock || "Ready stock",
    specs: normalizeSpecs(product),
    specifications: product.specifications || {},
    image: product.image || category.thumbnail || "",
    confidence: product.confidence || "",
    isImported: Boolean(product.isImported),
    isStarter: Boolean(product.isStarter)
  };
}

function getCatalogueProducts(category, importedProducts) {
  const importedForCategory = (Array.isArray(importedProducts) ? importedProducts : [])
    .filter(product => product && product.category === category.slug)
    .map(product => normalizeProduct({ ...product, isImported: true }, category));

  const seen = new Set();
  return importedForCategory.filter(product => {
    const key = normalizeSearchValue(product.number || product.id || product.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getProductSearchFields(product) {
  return [
    product.number,
    product.name,
    product.description,
    product.application,
    product.brand,
    product.availability,
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

function updateSearchChrome() {
  const clear = document.querySelector("#clearProductSearch");
  if (clear) clear.hidden = !(search?.value || "").length;
}

function enhanceSearchBar() {
  if (!search) return;

  const label = search.closest("label");
  if (!label || label.classList.contains("catalogue-search")) return;

  label.classList.add("catalogue-search");
  search.placeholder = "Search part number, product name, brand, OD, ID, HI or PIN...";
  search.setAttribute("autocomplete", "off");
  search.setAttribute("spellcheck", "false");
  search.setAttribute("aria-label", "Search products by part number, name, vehicle brand, description or specifications");

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

function hydrateFilterOptions(select, values) {
  if (!select) return;

  const existing = new Set(Array.from(select.options).map(option => option.value || option.textContent));
  values
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .forEach(value => {
      if (existing.has(value)) return;

      const option = document.createElement("option");
      option.textContent = value;
      select.append(option);
      existing.add(value);
    });
}

function updatePageChrome(category) {
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

function renderProductCard(product, highlightTerms) {
  const meta = [
    product.application,
    ...(product.specs || [])
  ].filter(Boolean).slice(0, 4);

  const badge = product.isImported ? "Imported product" : "Catalogue preview";
  const description = product.description || product.application || "Heavy-duty replacement part";

  return `<article class="product-card">
    <div class="product-image has-photo">
      <span class="product-badge">${escapeHtml(badge)}</span>
      ${renderProductImage(product)}
    </div>
    <div class="product-body">
      <span class="product-code">Part No. ${highlightText(product.number, highlightTerms)}</span>
      <h3>${highlightText(product.name, highlightTerms)}</h3>
      <p class="product-description">${highlightText(description, highlightTerms)}</p>
      <div class="product-meta">
        <span class="product-brand">Vehicle Brand: ${highlightText(product.brand, highlightTerms)}</span>
        ${meta.map(item => `<span>${highlightText(item, highlightTerms)}</span>`).join("")}
      </div>
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
  const selectedBrand = brand?.selectedIndex ? brand.value : "";
  const selectedStock = stock?.selectedIndex ? stock.value : "";
  const renderKey = [
    searchState.normalized,
    selectedBrand,
    selectedStock,
    visibleCount,
    catalogueRecords.length
  ].join("|");

  if (renderKey === lastRenderKey) return;
  lastRenderKey = renderKey;

  const filtered = catalogueRecords
    .filter(record => {
      const product = record.product;
      const brandMatches = !selectedBrand || product.brand === selectedBrand;
      const stockMatches = !selectedStock || product.availability === selectedStock;
      return brandMatches && stockMatches && matchesSearch(record, searchState);
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
      ? visible.map(product => renderProductCard(product, searchState.highlightTerms)).join("")
      : "<div class=\"no-results\"><strong>No products found</strong><span>Try another product number, product name, vehicle brand, OD, ID, HI, PIN or specification.</span></div>";
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
      sessionStorage.setItem("naeEnquiry", `${data.title}: ${enquiry.dataset.enquire}`);
      location.href = "../../index.html#contact";
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

async function initCataloguePage() {
  if (!slug || !productGrid) return;

  const [catalogue, importedJson] = await Promise.all([
    loadJson("catalogue.json", json => Array.isArray(json?.categories)),
    loadJson("products.generated.json", json => Array.isArray(json))
  ]);

  const categories = Array.isArray(catalogue?.categories) ? catalogue.categories : fallbackCategories;
  data = categories.find(category => category.slug === slug) || categories[0];
  const importedProducts = Array.isArray(importedJson)
    ? importedJson
    : (Array.isArray(window.NAE_IMPORTED_PRODUCTS) ? window.NAE_IMPORTED_PRODUCTS : []);

  updatePageChrome(data);

  catalogueProducts = getCatalogueProducts(data, importedProducts);
  catalogueRecords = catalogueProducts.map((product, index) => buildSearchRecord(product, index));

  hydrateFilterOptions(brand, Array.from(new Set(catalogueProducts.map(product => product.brand))));
  hydrateFilterOptions(stock, Array.from(new Set(catalogueProducts.map(product => product.availability))));
  enhanceSearchBar();
  ensureImageLightbox();
  bindCatalogueEvents();
  render();
}

initCataloguePage();
