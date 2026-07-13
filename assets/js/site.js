// ===========================
// Shared Catalogue Utilities
// ===========================

const siteScript = document.currentScript;
const siteRoot = siteScript ? new URL("../../", siteScript.src) : new URL("./", window.location.href);
const catalogueDataUrl = new URL("assets/data/catalogue.json", siteRoot);

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


// ===========================
// Category Cards
// ===========================

const grid = document.querySelector("#categoryGrid");

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
}


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
