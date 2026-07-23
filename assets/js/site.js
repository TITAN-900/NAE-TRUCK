// ===========================
// Shared Catalogue Utilities
// ===========================

const siteScript = document.currentScript;
const siteRoot = siteScript ? new URL("../../", siteScript.src) : new URL("./", window.location.href);
const catalogueDataUrl = new URL("assets/data/catalogue.json", siteRoot);
const brandsDataUrl = new URL("assets/data/brands.json", siteRoot);
const productsDataUrl = new URL("assets/data/products.generated.json", siteRoot);

const fallbackCatalogue = {
  categories: [
    {
      slug: "engine-parts",
      num: "01",
      thumbnail: "assets/img/categories/engine-parts.svg",
      title: "Engine Parts",
      desc: "Core components for dependable heavy-duty power.",
      items: ["Pistons & liners", "Gasket sets", "Oil pumps", "Turbo components"]
    },
    {
      slug: "clutch-system",
      num: "02",
      thumbnail: "assets/img/categories/clutch-system.svg",
      title: "Clutch System",
      desc: "High-load engagement and driveline control.",
      items: ["Clutch discs", "Pressure plates", "Release bearings", "Clutch boosters"]
    },
    {
      slug: "brake-system",
      num: "03",
      thumbnail: "assets/img/categories/brake-system.svg",
      title: "Brake System",
      desc: "Stopping confidence for trucks and trailers.",
      items: ["Brake linings", "Brake chambers", "Valves", "Air dryers"]
    },
    {
      slug: "suspension-system",
      num: "04",
      thumbnail: "assets/img/categories/suspension-system.svg",
      title: "Suspension System",
      desc: "Ride control for demanding roads and payloads.",
      items: ["Leaf springs", "Torque rods", "Shock absorbers", "Air springs"]
    },
    {
      slug: "cooling-system",
      num: "05",
      thumbnail: "assets/img/categories/cooling-system.svg",
      title: "Cooling System",
      desc: "Thermal management for long-haul operation.",
      items: ["Water pumps", "Radiators", "Fan clutches", "Thermostats"]
    },
    {
      slug: "electrical-system",
      num: "06",
      thumbnail: "assets/img/categories/electrical-system.svg",
      title: "Electrical System",
      desc: "Starting, charging and vehicle electronics.",
      items: ["Starters", "Alternators", "Sensors", "Switches"]
    },
    {
      slug: "steering-system",
      num: "07",
      thumbnail: "assets/img/categories/steering-system.svg",
      title: "Steering System",
      desc: "Precise control for heavy commercial chassis.",
      items: ["Steering pumps", "Drag links", "Tie rods", "Repair kits"]
    },
    {
      slug: "transmission-parts",
      num: "08",
      thumbnail: "assets/img/categories/transmission-parts.svg",
      title: "Transmission Parts",
      desc: "Gearing components built for heavy torque.",
      items: ["Synchronisers", "Gear sets", "Bearings", "Shift components"]
    },
    {
      slug: "axle-parts",
      num: "09",
      thumbnail: "assets/img/categories/axle-parts.svg",
      title: "Axle Parts",
      desc: "Load-bearing driveline and wheel-end parts.",
      items: ["Hub assemblies", "Differential gears", "Axle shafts", "Wheel bearings"]
    },
    {
      slug: "trailer-parts",
      num: "10",
      thumbnail: "assets/img/categories/trailer-parts.svg",
      title: "Trailer Parts",
      desc: "Running gear for trailers and container haulers.",
      items: ["Landing gear", "Kingpins", "Slack adjusters", "Suspension parts"]
    }
  ]
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function resolveSiteAsset(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return new URL(path.replace(/^\.?\//, ""), siteRoot).href;
}

async function loadCatalogueData() {
  if (!window.fetch) return fallbackCatalogue;

  try {
    const response = await fetch(catalogueDataUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
    const text = await response.text();
    const catalogue = JSON.parse(text.replace(/^\uFEFF/, ""));
    return Array.isArray(catalogue?.categories) ? catalogue : fallbackCatalogue;
  } catch (error) {
    return fallbackCatalogue;
  }
}

async function loadBrandsData() {
  const fallbackBrands = {
    brands: [
      {
        id: "brand-1",
        name: "Brand 1",
        logo: "",
        page: "brands/brand-1/index.html",
        aliases: ["Huatai"],
        products: [{ partNumber: "WG9100340056", name: "Flywheel Assembly", category: "Clutch" }]
      },
      {
        id: "brand-2",
        name: "Brand 2",
        logo: "",
        page: "brands/brand-2/index.html",
        aliases: [],
        products: [{ partNumber: "WG9100340056", name: "Flywheel Assembly", category: "Clutch" }]
      },
      {
        id: "brand-3",
        name: "Brand 3",
        logo: "",
        page: "brands/brand-3/index.html",
        aliases: [],
        products: [{ partNumber: "CLG-3003", name: "Cooling Hose", category: "Cooling" }]
      },
      {
        id: "brand-4",
        name: "Brand 4",
        logo: "",
        page: "brands/brand-4/index.html",
        aliases: [],
        products: [{ partNumber: "ELE-4004", name: "Electrical Sensor", category: "Electrical" }]
      },
      {
        id: "brand-5",
        name: "Brand 5",
        logo: "",
        page: "brands/brand-5/index.html",
        aliases: [],
        products: [{ partNumber: "TRN-5005", name: "Transmission Gear Set", category: "Transmission" }]
      },
      {
        id: "brand-6",
        name: "Brand 6",
        logo: "",
        page: "brands/brand-6/index.html",
        aliases: [],
        products: [{ partNumber: "AXL-6006", name: "Axle Repair Kit", category: "Axle" }]
      },
      {
        id: "xin-seng",
        name: "XIN SENG",
        logo: "assets/img/brands/xin-seng.png",
        page: "brands/xin-seng/index.html",
        aliases: ["XIN SENG", "Xin Seng", "Xinseng"],
        products: []
      }
    ]
  };

  if (!window.fetch) return fallbackBrands;

  try {
    const response = await fetch(brandsDataUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Brands request failed: ${response.status}`);
    const text = await response.text();
    const data = JSON.parse(text.replace(/^\uFEFF/, ""));
    return Array.isArray(data?.brands) ? data : fallbackBrands;
  } catch (error) {
    return fallbackBrands;
  }
}

async function loadProductData() {
  if (!window.fetch) return Array.isArray(window.NAE_IMPORTED_PRODUCTS) ? window.NAE_IMPORTED_PRODUCTS : [];

  try {
    const response = await fetch(productsDataUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
    const text = await response.text();
    const data = JSON.parse(text.replace(/^\uFEFF/, ""));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return Array.isArray(window.NAE_IMPORTED_PRODUCTS) ? window.NAE_IMPORTED_PRODUCTS : [];
  }
}

function normalizeFinderValue(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactFinderValue(value) {
  return normalizeFinderValue(value).replace(/\s+/g, "");
}

function buildFinderBrandLookup(brands) {
  const lookup = new Map();

  (brands || []).forEach((brand) => {
    [
      brand.id,
      brand.name,
      ...(brand.aliases || [])
    ].forEach((term) => {
      const key = normalizeFinderValue(term);
      if (key && !lookup.has(key)) {
        lookup.set(key, brand);
      }
    });
  });

  return lookup;
}

function bindBrandLogoWarnings() {
  if (document.documentElement.dataset.brandLogoWarnings === "true") return;
  document.documentElement.dataset.brandLogoWarnings = "true";

  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest(".brand-logo-block")) return;

    const failedUrl = image.currentSrc || image.src || image.getAttribute("src") || "";
    console.warn(`NAE brand logo failed to load: ${failedUrl}`);
    image.closest(".brand-logo-block")?.classList.add("missing-logo");
  }, true);
}


// ===========================
// Category Cards
// ===========================

const grid = document.querySelector("#categoryGrid");
const homeCategoryGrid = document.querySelector("#homepageCategoryGrid");

const homepageCategoryShortcuts = [
  { title: "Engine", slug: "engine-parts", query: "engine" },
  { title: "Clutch", slug: "clutch-system", query: "clutch" },
  { title: "Brake", slug: "brake-system", query: "brake" },
  { title: "Cooling", slug: "cooling-system", query: "cooling" },
  { title: "Electrical", slug: "electrical-system", query: "electrical" },
  { title: "Transmission", slug: "transmission-parts", query: "transmission" },
  { title: "Axle", slug: "axle-parts", query: "axle" },
  { title: "Suspension", slug: "suspension-system", query: "suspension" },
  { title: "Steering", slug: "steering-system", query: "steering" },
  { title: "Fuel System", query: "fuel" },
  { title: "Air System", query: "air" },
  { title: "Cabin", query: "cabin" },
  { title: "Body Parts", query: "body" },
  { title: "Trailer", slug: "trailer-parts", query: "trailer" },
  { title: "Other", slug: "other", query: "other" }
];

function renderCategoryCards(catalogue) {
  if (!grid) return;

  const categories = Array.isArray(catalogue?.categories) ? catalogue.categories : [];

  grid.innerHTML = categories
    .map((category) => {
      const thumbnail = category.thumbnail
        ? `<img class="category-thumbnail" loading="lazy" decoding="async" src="${escapeHtml(resolveSiteAsset(category.thumbnail))}" alt="">`
        : `<span class="category-thumbnail-fallback">NAE</span>`;

      return `
<details class="category-card reveal">
    <summary>
        <span class="category-number">${escapeHtml(category.num)}</span>

        <div class="category-title">
            <i class="category-thumbnail-wrap" aria-hidden="true">${thumbnail}</i>

            <div>
                <h3>${escapeHtml(category.title)}</h3>
                <p>${escapeHtml(category.desc)}</p>
            </div>
        </div>

        <span class="category-toggle">+</span>
    </summary>

    <div class="category-detail">
        <ul>
            ${(category.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>

        <a class="button button-dark" href="products/${escapeHtml(category.slug)}/index.html">
            View category
            <span>&nearr;</span>
        </a>
    </div>
</details>
`;
    })
    .join("");

  initCategoryAccordion();
  observeRevealElements();
}

function getHomepageCategoryHref(shortcut) {
  if (shortcut.slug) {
    return resolveSiteAsset(`products/${shortcut.slug}/index.html`);
  }

  return resolveSiteAsset("products/other/index.html");
}

function getHomepageCategoryDescription(shortcut, category) {
  if (category?.desc) return category.desc;

  const descriptions = {
    "Fuel System": "Fuel delivery, filtration and injection-related parts.",
    "Air System": "Air control, compressor and pneumatic service parts.",
    Cabin: "Cabin fittings and driver-area replacement parts.",
    "Body Parts": "Exterior, mounting and body-related heavy truck parts.",
    Other: "Additional parts outside the main systems."
  };

  return descriptions[shortcut.title] || "Browse matching heavy-duty truck products.";
}

function getHomepageCategoryThumbnail(shortcut, category) {
  const thumbnail = category?.thumbnail || "";

  if (thumbnail) {
    return `<img class="category-thumbnail" loading="lazy" decoding="async" src="${escapeHtml(resolveSiteAsset(thumbnail))}" alt="">`;
  }

  const initials = shortcut.title
    .split(/\s+/)
    .map(word => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return `<span class="category-thumbnail-fallback">${escapeHtml(initials || "NAE")}</span>`;
}

function renderHomepageCategoryCards(catalogue) {
  if (!homeCategoryGrid) return;

  const categories = Array.isArray(catalogue?.categories) ? catalogue.categories : [];
  const bySlug = new Map(categories.map(category => [category.slug, category]));

  homeCategoryGrid.innerHTML = homepageCategoryShortcuts.map((shortcut, index) => {
    const category = shortcut.slug ? bySlug.get(shortcut.slug) : null;
    const title = shortcut.title;
    const desc = getHomepageCategoryDescription(shortcut, category);
    const thumbnail = getHomepageCategoryThumbnail(shortcut, category);
    const href = getHomepageCategoryHref(shortcut);

    return `
<a class="category-card homepage-category-card reveal" href="${escapeHtml(href)}">
  <span class="category-number">${String(index + 1).padStart(2, "0")}</span>
  <div class="category-title">
    <i class="category-thumbnail-wrap" aria-hidden="true">${thumbnail}</i>
    <div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(desc)}</p>
    </div>
  </div>
  <span class="category-toggle" aria-hidden="true">&nearr;</span>
</a>`;
  }).join("");

  observeRevealElements();
}

function initCategoryAccordion() {
  document.querySelectorAll(".category-card").forEach((card) => {
    if (card.dataset.accordionReady === "true") return;
    card.dataset.accordionReady = "true";

    card.addEventListener("toggle", () => {
      if (!card.open) return;

      document
        .querySelectorAll(".category-card[open]")
        .forEach((other) => {
          if (other !== card) {
            other.open = false;
          }
        });
    });
  });
}

if (grid) {
  loadCatalogueData().then(renderCategoryCards);
} else {
  initCategoryAccordion();
}


// ===========================
// Homepage Parts Finder
// ===========================

const brandCardGrid = document.querySelector("#brandCardGrid");
const partsSearch = document.querySelector("#partsSearch");
const finderResults = document.querySelector("#finderResults");
const finderToolbar = document.querySelector("#finderToolbar");
const finderStatus = document.querySelector("#finderStatus");
const finderBrandFilter = document.querySelector("#finderBrandFilter");
const finderBackToSearch = document.querySelector("#finderBackToSearch");
const finderLoadMore = document.querySelector("#finderLoadMore");
const finderPageSize = 12;
let finderRecords = [];
let finderVisibleCount = finderPageSize;
let finderCurrentQuery = "";
let finderCurrentMatches = [];
let finderCategoryLabels = new Map();

function renderBrandLogo(brand) {
  if (brand.logo) {
    return `<span class="brand-logo-block has-logo"><img loading="lazy" decoding="async" src="${escapeHtml(resolveSiteAsset(brand.logo))}" alt="${escapeHtml(brand.name)} logo"></span>`;
  }

  return `<span class="brand-logo-block"><span>LOGO</span></span>`;
}

function renderBrandCards(brands) {
  if (!brandCardGrid) return;

  brandCardGrid.innerHTML = brands
    .map((brand, index) => `
<a class="brand-card" href="${escapeHtml(resolveSiteAsset(brand.page))}">
  <small>${String(index + 1).padStart(2, "0")}</small>
  ${renderBrandLogo(brand)}
  <strong>${escapeHtml(brand.name)}</strong>
  <span>View brand categories &nearr;</span>
</a>`)
    .join("");

  observeRevealElements();
}

function getProductNumber(product) {
  return product.productNumber || product.number || product.partNumber || product.id || "";
}

function getProductName(product) {
  return product.productName || product.name || "Catalogue Product";
}

function isInternalCustomerValue(value) {
  const raw = String(value ?? "").trim();
  const normalized = normalizeFinderValue(raw);

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

function flattenFinderValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap(item => flattenFinderValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => [
      key,
      ...flattenFinderValue(item)
    ]);
  }

  return value ? [String(value)] : [];
}

function humanizeFinderSlug(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim();
}

function getFinderCategoryLabel(product) {
  const category = product.category || "";
  return product.categoryLabel
    || finderCategoryLabels.get(category)
    || humanizeFinderSlug(category)
    || "General";
}

function getFinderProductSummary(product) {
  const number = cleanCustomerField(getProductNumber(product), "Part number unavailable");
  const name = cleanCustomerField(getProductName(product) || product.description, "Product image");
  const brandName = cleanCustomerField(product.brand, "Brand not specified");
  const description = cleanCustomerField(
    product.description || product.visibleDescription || product.longDescription || product.application,
    "Heavy-duty replacement part"
  );

  return {
    number,
    name,
    brand: brandName,
    category: getFinderCategoryLabel(product),
    availability: cleanCustomerField(product.availability, "Contact for stock"),
    description,
    image: resolveSiteAsset(product.image || product.thumbnail || ""),
    enquiry: [number, name, brandName].filter(Boolean).join(" / ")
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFinderSearchState(query) {
  const normalized = normalizeFinderValue(query);
  const tokens = normalized ? normalized.split(" ").filter(Boolean) : [];

  return {
    normalized,
    compact: compactFinderValue(query),
    tokens,
    highlightTerms: tokens
      .filter(term => term.length > 1)
      .sort((a, b) => b.length - a.length)
  };
}

function highlightFinderText(value, terms) {
  const escaped = escapeHtml(value);
  const meaningful = (terms || []).filter(Boolean);

  if (!meaningful.length) return escaped;

  const pattern = meaningful.map(escapeRegExp).join("|");
  return escaped.replace(new RegExp(`(${pattern})`, "gi"), "<mark class=\"search-highlight\">$1</mark>");
}

function getFinderRecordFields(product, brandName) {
  return [
    getProductNumber(product),
    product.partNumber,
    getProductName(product),
    product.description,
    product.visibleDescription,
    product.longDescription,
    brandName,
    product.category,
    getFinderCategoryLabel(product),
    product.subcategory,
    product.vehicleModel,
    product.engineModel,
    product.application,
    product.specification,
    product.oeNumber,
    product.searchableText,
    product.availability,
    ...flattenFinderValue(product.specifications),
    ...flattenFinderValue(product.specs),
    ...flattenFinderValue(product.keywords),
    ...flattenFinderValue(product.alternateNumbers),
    ...flattenFinderValue(product.alternatePartNumbers)
  ].filter(Boolean);
}

function recordMatchesFinder(record, searchState) {
  if (!searchState.tokens.length) return false;

  const tokenMatch = searchState.tokens.every(token => (
    record.text.includes(token) || record.compact.includes(token)
  ));
  const compactMatch = searchState.compact.length > 2 && record.compact.includes(searchState.compact);

  return tokenMatch || compactMatch;
}

function buildFinderRecords(brands, products) {
  const brandLookup = buildFinderBrandLookup(brands);

  const productRecords = (Array.isArray(products) ? products : []).map((product) => {
    const brandName = product.brand || "Brand not specified";
    const brandInfo = brandLookup.get(normalizeFinderValue(brandName));
    const fields = getFinderRecordFields(product, brandName);
    const summary = getFinderProductSummary(product);

    return {
      type: "product",
      brand: brandInfo || null,
      product,
      number: summary.number,
      name: summary.name,
      brandName: summary.brand,
      category: summary.category,
      summary,
      text: normalizeFinderValue(fields.join(" ")),
      compact: compactFinderValue(fields.join(" "))
    };
  });

  return productRecords;
}

function populateFinderBrandFilter(records) {
  if (!finderBrandFilter) return;

  const current = finderBrandFilter.value;
  const brands = Array.from(new Set(records.map(record => record.brandName).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  finderBrandFilter.innerHTML = [
    "<option value=\"\">All brands</option>",
    ...brands.map(brand => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`)
  ].join("");

  finderBrandFilter.value = brands.includes(current) ? current : "";
}

function getFilteredFinderMatches(records, query) {
  const searchState = getFinderSearchState(query);
  const selectedBrand = finderBrandFilter?.value || "";

  if (!searchState.tokens.length) {
    return { searchState, matches: [] };
  }

  const matches = records.filter(record => {
    const brandMatches = !selectedBrand || record.brandName === selectedBrand;
    return brandMatches && recordMatchesFinder(record, searchState);
  });

  return { searchState, matches };
}

function renderHomepageResultImage(summary) {
  const alt = `${summary.name} ${summary.number}`.trim();

  if (!summary.image) {
    return "<span class=\"product-image-placeholder\">NAE</span>";
  }

  return `<img class="product-photo" loading="lazy" decoding="async" src="${escapeHtml(summary.image)}" alt="${escapeHtml(alt)}">`;
}

function renderHomepageResultCard(record, searchState) {
  const summary = record.summary;
  const label = `${summary.number} ${summary.name}`.trim();
  const meta = [
    `<span class="product-brand">Brand: ${highlightFinderText(summary.brand, searchState.highlightTerms)}</span>`,
    `<span>Category: ${highlightFinderText(summary.category, searchState.highlightTerms)}</span>`
  ].join("");

  return `<article class="product-card homepage-result-card" role="button" tabindex="0" data-home-lightbox="${summary.image ? "true" : "false"}" data-lightbox-src="${escapeHtml(summary.image)}" data-lightbox-alt="${escapeHtml(label)}" data-lightbox-number="${escapeHtml(summary.number)}" data-lightbox-name="${escapeHtml(summary.name)}" data-lightbox-brand="${escapeHtml(summary.brand)}" aria-label="${escapeHtml(`View product image for ${label}`)}">
    <div class="product-image has-photo">
      <span class="product-badge">Search result</span>
      ${renderHomepageResultImage(summary)}
    </div>
    <div class="product-body">
      <span class="product-code-label">Product Number</span>
      <strong class="product-code">${highlightFinderText(summary.number, searchState.highlightTerms)}</strong>
      <h3>${highlightFinderText(summary.name, searchState.highlightTerms)}</h3>
      <div class="product-meta">${meta}</div>
      <p class="product-description">${highlightFinderText(summary.description, searchState.highlightTerms)}</p>
      <div class="product-action">
        <small class="stock-status">${escapeHtml(summary.availability)}</small>
        <span class="homepage-view-image">View image &nearr;</span>
      </div>
    </div>
  </article>`;
}

function updateFinderLoadMore() {
  if (!finderLoadMore) return;

  const button = finderLoadMore.querySelector("button");
  finderLoadMore.hidden = finderCurrentMatches.length <= finderVisibleCount;

  if (button) {
    button.textContent = "";
    button.append("Load more products ");
    const arrow = document.createElement("span");
    arrow.innerHTML = "&darr;";
    button.append(arrow);
  }
}

function scrollFinderResultsIntoView() {
  const target = finderToolbar && !finderToolbar.hidden ? finderToolbar : finderResults;
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFinderResults(records, query, options = {}) {
  if (!finderResults) return;

  const trimmedQuery = String(query || "").trim();
  finderCurrentQuery = trimmedQuery;

  if (!trimmedQuery) {
    finderResults.innerHTML = "";
    finderResults.hidden = true;
    finderToolbar.hidden = true;
    if (finderLoadMore) finderLoadMore.hidden = true;
    return;
  }

  const { searchState, matches } = getFilteredFinderMatches(records, trimmedQuery);
  finderCurrentMatches = matches;
  const visible = matches.slice(0, finderVisibleCount);

  finderResults.hidden = false;
  finderToolbar.hidden = false;
  finderResults.innerHTML = visible.length
    ? visible.map(record => renderHomepageResultCard(record, searchState)).join("")
    : `<div class="no-results"><strong>No products found</strong><span>Try a product number, product name, brand, engine model, vehicle model, category or keyword.</span></div>`;

  if (finderStatus) {
    finderStatus.textContent = matches.length
      ? `Showing ${visible.length} of ${matches.length} matching products for "${trimmedQuery}".`
      : `No products found for "${trimmedQuery}".`;
  }

  updateFinderLoadMore();

  if (options.scroll) {
    scrollFinderResultsIntoView();
  }
}

function ensureHomepageImageLightbox() {
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
      <img alt="">
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
        <a class="button button-orange" href="#contact" data-lightbox-enquire>Enquire <span>&nearr;</span></a>
      </div>
    </div>
  `;
  document.body.append(lightbox);
}

function setHomepageLightboxProductInfo(lightbox, info) {
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

function openHomepageLightbox(src, alt, productInfo = null) {
  if (!src) return;
  ensureHomepageImageLightbox();

  const lightbox = document.querySelector("#image-lightbox");
  const image = lightbox?.querySelector("img");
  if (!lightbox || !image) return;

  image.src = src;
  image.alt = alt || "Product image preview";
  setHomepageLightboxProductInfo(lightbox, productInfo);
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeHomepageLightbox() {
  const lightbox = document.querySelector("#image-lightbox");
  const image = lightbox?.querySelector("img");
  if (!lightbox) return;

  lightbox.classList.remove("open");
  lightbox.classList.remove("has-product-info");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");

  if (image) image.removeAttribute("src");
  setHomepageLightboxProductInfo(lightbox, null);
}

function bindHomepageFinderEvents() {
  if (document.documentElement.dataset.homepageFinderEvents === "true") return;
  document.documentElement.dataset.homepageFinderEvents = "true";

  finderBrandFilter?.addEventListener("change", () => {
    finderVisibleCount = finderPageSize;
    renderFinderResults(finderRecords, finderCurrentQuery, { scroll: true });
  });

  finderBackToSearch?.addEventListener("click", () => {
    partsSearch?.scrollIntoView({ behavior: "smooth", block: "center" });
    partsSearch?.focus({ preventScroll: true });
  });

  finderLoadMore?.querySelector("button")?.addEventListener("click", () => {
    finderVisibleCount += finderPageSize;
    renderFinderResults(finderRecords, finderCurrentQuery, { scroll: false });
  });

  finderResults?.addEventListener("click", event => {
    const card = event.target.closest("[data-home-lightbox='true']");
    if (!card) return;

    event.preventDefault();
    openHomepageLightbox(card.dataset.lightboxSrc, card.dataset.lightboxAlt, {
      number: card.dataset.lightboxNumber,
      name: card.dataset.lightboxName,
      brand: card.dataset.lightboxBrand
    });
  });

  finderResults?.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = event.target.closest("[data-home-lightbox='true']");
    if (!card) return;

    event.preventDefault();
    openHomepageLightbox(card.dataset.lightboxSrc, card.dataset.lightboxAlt, {
      number: card.dataset.lightboxNumber,
      name: card.dataset.lightboxName,
      brand: card.dataset.lightboxBrand
    });
  });

  document.addEventListener("click", event => {
    const lightbox = document.querySelector("#image-lightbox");
    if (!lightbox?.classList.contains("open")) return;

    const lightboxEnquiry = event.target.closest("[data-lightbox-enquire]");
    if (lightboxEnquiry) {
      const enquiryText = lightboxEnquiry.dataset.lightboxEnquire || "";
      if (enquiryText) {
        sessionStorage.setItem("naeEnquiry", enquiryText);
      }
      closeHomepageLightbox();
      return;
    }

    if (event.target === lightbox || event.target.closest(".close-lightbox")) {
      closeHomepageLightbox();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeHomepageLightbox();
    }
  });
}

async function initHomepageFinder() {
  if (!brandCardGrid && !partsSearch && !homeCategoryGrid) return;

  const [data, products, catalogue] = await Promise.all([
    loadBrandsData(),
    loadProductData(),
    loadCatalogueData()
  ]);
  const brands = Array.isArray(data?.brands) ? data.brands : [];

  renderBrandCards(brands);
  renderHomepageCategoryCards(catalogue);
  bindBrandLogoWarnings();
  finderCategoryLabels = new Map((catalogue?.categories || []).map(category => [category.slug, category.title]));
  finderRecords = buildFinderRecords(brands, products);
  populateFinderBrandFilter(finderRecords);
  bindHomepageFinderEvents();

  partsSearch?.addEventListener("input", () => {
    finderVisibleCount = finderPageSize;
    renderFinderResults(finderRecords, partsSearch.value);
  });

  partsSearch?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !partsSearch.value.trim()) return;
    event.preventDefault();
    finderVisibleCount = finderPageSize;
    renderFinderResults(finderRecords, partsSearch.value, { scroll: true });
  });
}

initHomepageFinder();


// ===========================
// Mobile Navigation
// ===========================

const toggle = document.querySelector(".nav-toggle");
const menu = document.querySelector(".nav-menu");
let lockedScrollY = 0;

function isMenuOpen() {
  return toggle?.getAttribute("aria-expanded") === "true";
}

function lockBodyScroll() {
  lockedScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.classList.add("nav-open");
}

function unlockBodyScroll(restorePosition = true) {
  document.body.classList.remove("nav-open");
  document.body.style.top = "";

  if (restorePosition) {
    window.scrollTo(0, lockedScrollY);
  }
}

function openMobileMenu() {
  if (!toggle || !menu) return;

  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Close navigation");
  menu.classList.add("open");
  lockBodyScroll();
}

function closeMobileMenu(options = {}) {
  if (!toggle || !menu || !isMenuOpen()) return;

  const restorePosition = options.restorePosition !== false;

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  menu.classList.remove("open");
  unlockBodyScroll(restorePosition);
}

if (toggle && menu) {
  toggle.addEventListener("click", () => {
    if (isMenuOpen()) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  menu.addEventListener("click", (event) => {
    const clickedLink = event.target.closest("a");
    const clickedOverlay = event.target === menu;

    if (clickedLink || clickedOverlay) {
      closeMobileMenu({ restorePosition: true });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 721px)").matches) {
      closeMobileMenu();
    }
  });
}


// ===========================
// Sticky Header
// ===========================

const header = document.querySelector("#siteHeader");

if (header) {
  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle(
        "fixed",
        scrollY > 120
      );
    },
    { passive: true }
  );
}


// ===========================
// Reveal Animation
// ===========================

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.12
    }
  )
  : null;

function observeRevealElements() {
  document
    .querySelectorAll(".reveal:not(.is-visible)")
    .forEach((element) => {
      if (element.dataset.revealReady === "true") return;
      element.dataset.revealReady = "true";

      if (revealObserver) {
        revealObserver.observe(element);
      } else {
        element.classList.add("is-visible");
      }
    });
}

observeRevealElements();


// ===========================
// Footer Year
// ===========================

document
  .querySelector("#year")
  ?.append(new Date().getFullYear());


// ===========================
// Enquiry Form
// ===========================

const form = document.querySelector("#enquiryForm");
const toast = document.querySelector("#toast");

if (form) {
  const stored =
    sessionStorage.getItem("naeEnquiry");

  if (stored) {
    form.elements.message.value =
      `I would like to enquire about ${stored}.`;

    sessionStorage.removeItem("naeEnquiry");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = new FormData(form);

    const msg =
      `Enquiry prepared for ${data.get("name")}. Add NAE's final WhatsApp number to connect direct sending.`;

    if (toast) {
      toast.textContent = msg;

      toast.classList.add("show");

      setTimeout(() => {
        toast.classList.remove("show");
      }, 5200);
    }
  });
}
