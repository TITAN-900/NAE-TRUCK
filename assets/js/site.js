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
        id: "yusheng",
        name: "Yusheng",
        logo: "assets/img/brands/yusheng.png",
        page: "brands/yusheng/index.html",
        aliases: ["Yusheng", "Yu Sheng", "宇胜", "宇勝"],
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

  return new URL(`search/index.html?q=${encodeURIComponent(shortcut.query || shortcut.title)}`, siteRoot).href;
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
let finderRecords = [];

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

function getProductSearchUrl(product, query) {
  const value = query || getProductNumber(product) || getProductName(product);
  return new URL(`search/index.html?q=${encodeURIComponent(value)}`, siteRoot).href;
}

function buildFinderRecords(brands, products) {
  const brandLookup = buildFinderBrandLookup(brands);

  const brandRecords = brands.flatMap((brand) => {
    const brandTerms = [brand.name, ...(brand.aliases || [])];
    return (brand.products || []).map((product) => {
      const fields = [
        product.partNumber,
        product.name,
        product.category,
        ...brandTerms
      ].filter(Boolean);

      return {
        type: "placeholder",
        brand,
        product,
        number: product.partNumber,
        name: product.name,
        brandName: brand.name,
        text: normalizeFinderValue(fields.join(" ")),
        compact: compactFinderValue(fields.join(" "))
      };
    });
  });

  const productRecords = (Array.isArray(products) ? products : []).map((product) => {
    const brandName = product.brand || "Brand not specified";
    const brandInfo = brandLookup.get(normalizeFinderValue(brandName));
    const fields = [
      getProductNumber(product),
      product.partNumber,
      getProductName(product),
      product.description,
      product.brand,
      product.category,
      product.subcategory,
      product.vehicleModel,
      product.application,
      product.specification,
      product.searchableText,
      ...(product.specs || [])
    ].filter(Boolean);

    return {
      type: "product",
      brand: brandInfo || null,
      product,
      number: getProductNumber(product),
      name: getProductName(product),
      brandName,
      text: normalizeFinderValue(fields.join(" ")),
      compact: compactFinderValue(fields.join(" "))
    };
  });

  return [...productRecords, ...brandRecords];
}

function renderFinderResults(records, query) {
  if (!finderResults) return;

  const normalized = normalizeFinderValue(query);
  const compact = compactFinderValue(query);
  const tokens = normalized ? normalized.split(" ").filter(Boolean) : [];

  if (!tokens.length) {
    finderResults.innerHTML = "";
    finderResults.hidden = true;
    return;
  }

  const matches = records.filter((record) => {
    const tokenMatch = tokens.every(token => record.text.includes(token));
    const compactMatch = compact.length > 2 && record.compact.includes(compact);
    return tokenMatch || compactMatch;
  });

  finderResults.hidden = false;
  finderResults.innerHTML = matches.length
    ? matches.slice(0, 10).map((record) => `
<a class="finder-result" href="${escapeHtml(getProductSearchUrl(record.product, query))}">
  ${record.brand ? renderBrandLogo(record.brand) : `<span class="brand-logo-block"><span>${escapeHtml((record.brandName || "NAE").slice(0, 4))}</span></span>`}
  <span>
    <small>${escapeHtml(record.number)}</small>
    <strong>${escapeHtml(record.name)}</strong>
    <em>${escapeHtml(record.brandName)}</em>
  </span>
</a>`).join("")
    : `<div class="finder-empty"><strong>No products found</strong><span>Try a product number, product name, brand, model or specification.</span></div>`;
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
  finderRecords = buildFinderRecords(brands, products);

  partsSearch?.addEventListener("input", () => {
    renderFinderResults(finderRecords, partsSearch.value);
  });

  partsSearch?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !partsSearch.value.trim()) return;
    event.preventDefault();
    window.location.href = new URL(`search/index.html?q=${encodeURIComponent(partsSearch.value.trim())}`, siteRoot).href;
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
