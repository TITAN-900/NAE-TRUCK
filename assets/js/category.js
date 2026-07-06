const productData = {
  'engine-parts': {
   title: 'Engine Parts',
    icon: '\u2b21',
    intro: 'Heavy-duty engine components for reliable power, efficiency and long-haul durability.',
    products: [
      ['Piston & Liner Kit', 'Engine internal', 'HOWO / SHACMAN'],
      ['Cylinder Head Assembly', 'Top end', 'Heavy-duty diesel'],
      ['Full Gasket Set', 'Sealing', 'Multiple applications'],
      ['Engine Oil Pump', 'Lubrication', 'High-flow replacement'],
      ['Turbocharger Assembly', 'Air induction', 'Commercial duty'],
      ['Connecting Rod Bearing', 'Engine internal', 'Standard size']
    ]
  },
  'clutch-system': {
    title: 'Clutch System',
    icon: '\u25c9',
    intro: 'Engagement, release and actuation parts engineered for heavy commercial drivetrains.',
    products: [
      ['Clutch Disc Assembly', '430 mm class', 'Prime mover'],
      ['Clutch Pressure Plate', 'High clamp load', 'Heavy-duty'],
      ['Release Bearing', 'Clutch release', 'Multiple applications'],
      ['Clutch Booster', 'Air-assisted', 'Cab-over truck'],
      ['Clutch Master Cylinder', 'Hydraulic', 'Replacement'],
      ['Clutch Fork Assembly', 'Actuation', 'Commercial duty']
    ]
  },
  'brake-system': {
    title: 'Brake System',
    icon: '\u25eb',
    intro: 'Pneumatic and friction components for confident heavy-truck and trailer braking.',
    products: [
      ['Brake Lining Set', 'Friction', 'Truck axle'],
      ['Spring Brake Chamber', 'Air brake', 'Truck / trailer'],
      ['Four-Circuit Valve', 'Air management', 'Heavy-duty'],
      ['Air Dryer Assembly', 'Air treatment', 'Prime mover'],
      ['Relay Valve', 'Air brake', 'Trailer compatible'],
      ['Brake Drum', 'Wheel end', 'Commercial duty']
    ]
  },
  'suspension-system': {
    title: 'Suspension System',
    icon: '\u2301',
    intro: 'Load-control and ride components for prime movers, container haulers and trailers.',
    products: [
      ['Front Leaf Spring', 'Steel suspension', 'Heavy axle'],
      ['Torque Rod Assembly', 'Axle location', 'Prime mover'],
      ['Cab Shock Absorber', 'Cab suspension', 'Front / rear'],
      ['Air Spring Bellows', 'Air suspension', 'Truck / trailer'],
      ['Stabiliser Bar Link', 'Chassis control', 'Heavy-duty'],
      ['Spring Shackle Kit', 'Suspension mount', 'Replacement']
    ]
  },
  'cooling-system': {
    title: 'Cooling System',
    icon: '\u2723',
    intro: 'Cooling and temperature-control parts that help heavy engines perform under load.',
    products: [
      ['Engine Water Pump', 'Coolant circulation', 'Heavy diesel'],
      ['Radiator Assembly', 'Heat exchange', 'Prime mover'],
      ['Fan Clutch', 'Thermal control', 'Heavy-duty'],
      ['Thermostat Kit', 'Temperature control', 'Multiple ratings'],
      ['Expansion Tank', 'Coolant reserve', 'Cab-over truck'],
      ['Radiator Hose Set', 'Coolant transfer', 'Model specific']
    ]
  },
  'electrical-system': {
    title: 'Electrical System',
    icon: '\u03df',
    intro: 'Starting, charging, sensing and control components for modern heavy commercial vehicles.',
    products: [
      ['Starter Motor', '24V system', 'Heavy diesel'],
      ['Alternator Assembly', 'Charging', '24V commercial'],
      ['Crankshaft Sensor', 'Engine sensing', 'Electronic diesel'],
      ['Combination Switch', 'Cab controls', 'Model specific'],
      ['Headlamp Assembly', 'Lighting', 'Left / right'],
      ['Relay & Fuse Module', 'Electrical control', 'Heavy truck']
    ]
  },
  'steering-system': {
    title: 'Steering System',
    icon: '\u25ce',
    intro: 'Hydraulic and mechanical steering components for accurate, dependable road control.',
    products: [
      ['Power Steering Pump', 'Hydraulic assist', 'Heavy-duty'],
      ['Drag Link Assembly', 'Steering linkage', 'Model specific'],
      ['Tie Rod End', 'Front axle', 'Left / right'],
      ['Steering Gear Repair Kit', 'Hydraulic steering', 'Seal set'],
      ['Steering Column Joint', 'Cab linkage', 'Replacement'],
      ['Kingpin Repair Kit', 'Steer axle', 'Commercial duty']
    ]
  },
  'transmission-parts': {
    title: 'Transmission Parts',
    icon: '\u21b9',
    intro: 'Gearbox internals and shifting components designed for high-torque commercial duty.',
    products: [
      ['Synchroniser Assembly', 'Gear engagement', 'Manual transmission'],
      ['Main Shaft Gear', 'Gear train', 'Heavy-duty'],
      ['Countershaft Bearing', 'Transmission internal', 'Precision fit'],
      ['Gear Selector Fork', 'Shift system', 'Model specific'],
      ['Input Shaft', 'Power transfer', 'Prime mover'],
      ['Transmission Seal Kit', 'Sealing', 'Complete set']
    ]
  },
  'axle-parts': {
    title: 'Axle Parts',
    icon: '\u2194',
    intro: 'Differential, shaft and wheel-end components for heavy load-bearing drivetrains.',
    products: [
      ['Wheel Hub Assembly', 'Wheel end', 'Front / rear'],
      ['Differential Gear Set', 'Final drive', 'Heavy axle'],
      ['Rear Axle Shaft', 'Power transfer', 'Model specific'],
      ['Hub Bearing Kit', 'Wheel end', 'Commercial duty'],
      ['Oil Seal Kit', 'Axle sealing', 'Multiple sizes'],
      ['Crown Wheel & Pinion', 'Final drive', 'Matched set']
    ]
  },
  'trailer-parts': {
    title: 'Trailer Parts',
    icon: '\u25b0',
    intro: 'Running gear, braking and coupling components for trailers and container haulage.',
    products: [
      ['Landing Gear Set', 'Trailer support', 'Two-speed'],
      ['Kingpin Assembly', 'Fifth-wheel coupling', 'Container trailer'],
      ['Slack Adjuster', 'Brake actuation', 'Manual / automatic'],
      ['Trailer Air Spring', 'Suspension', 'Heavy load'],
      ['Twist Lock Assembly', 'Container securement', 'Heavy-duty'],
      ['Trailer Axle Bearing', 'Wheel end', 'Commercial trailer']
    ]
  }
};

const slug = document.body.dataset.category;
const data = productData[slug] || productData['engine-parts'];
const importedProducts = Array.isArray(window.NAE_IMPORTED_PRODUCTS) ? window.NAE_IMPORTED_PRODUCTS : [];
const brands = ['SINOTRUK HOWO', 'SHACMAN', 'FAW', 'DONGFENG', 'FOTON', 'JAC HEAVY'];
const pageSize = 24;
let visibleCount = pageSize;
let pendingRender = 0;

document.title = `${data.title} | NAE Enterprise Heavy Truck Parts`;
document.querySelectorAll('[data-category-title]').forEach(el => { el.textContent = data.title; });
document.querySelectorAll('[data-category-icon]').forEach(el => { el.textContent = data.icon; });
document.querySelector('[data-category-intro]').textContent = data.intro;

const productGrid = document.querySelector('#productGrid');
const search = document.querySelector('#productSearch');
const brand = document.querySelector('#brandFilter');
const stock = document.querySelector('#stockFilter');
const count = document.querySelector('#resultCount');
const catalogueNote = document.querySelector('.catalogue-note');

const starterProducts = data.products.map((p, i) => ({
  number: `NAE-${slug.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
  name: p[0],
  category: slug,
  description: p[1],
  application: p[2],
  brand: brands[i % brands.length],
  availability: i % 3 === 2 ? 'On request' : 'Ready stock',
  specs: [p[2]],
  specifications: {},
  image: '',
  isStarter: true
}));

const importedForCategory = importedProducts
  .filter(product => product && product.category === slug)
  .map(product => ({
    number: product.number || product.id || '',
    name: product.name || 'Imported Product',
    category: product.category || slug,
    description: product.description || '',
    application: product.application || '',
    brand: product.brand || 'Imported catalogue',
    availability: product.availability || 'Ready stock',
    specs: Array.isArray(product.specs) ? product.specs : [],
    specifications: product.specifications || {},
    image: product.image || '',
    confidence: product.confidence || '',
    isImported: true
  }));

const catalogueProducts = [...importedForCategory, ...starterProducts];
const catalogueRecords = catalogueProducts.map((product, index) => buildSearchRecord(product, index));

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function assetPath(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
  return `../../${path.replace(/^\.?\//, '')}`;
}

function normalizeSearchValue(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactSearchValue(value) {
  return normalizeSearchValue(value).replace(/\s+/g, '');
}

function flattenSpecificationObject(specifications) {
  if (!specifications || typeof specifications !== 'object') return [];
  return Object.entries(specifications).flatMap(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.filter(Boolean).map(item => `${key} ${item}`);
  });
}

function getProductSearchFields(product) {
  return [
    product.number,
    product.name,
    product.description,
    product.application,
    product.brand,
    ...(product.specs || []),
    ...flattenSpecificationObject(product.specifications)
  ].filter(Boolean);
}

function buildSearchRecord(product, index) {
  const fields = getProductSearchFields(product);
  const joined = fields.join(' ');
  return {
    product,
    index,
    text: normalizeSearchValue(joined),
    compact: compactSearchValue(joined)
  };
}

function getSearchState() {
  const raw = search?.value || '';
  const normalized = normalizeSearchValue(raw);
  const tokens = normalized ? normalized.split(' ').filter(Boolean) : [];
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
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(value, terms) {
  const escaped = escapeHtml(value);
  if (!terms || !terms.length) return escaped;
  const pattern = terms.map(escapeRegExp).join('|');
  if (!pattern) return escaped;
  return escaped.replace(new RegExp(`(${pattern})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

function updateSearchChrome() {
  const clear = document.querySelector('#clearProductSearch');
  if (clear) clear.hidden = !(search?.value || '').length;
}

function enhanceSearchBar() {
  if (!search) return;
  const label = search.closest('label');
  if (!label || label.classList.contains('catalogue-search')) return;
  label.classList.add('catalogue-search');
  search.placeholder = 'Search product number, name, OD, ID, HI or PIN...';
  search.setAttribute('autocomplete', 'off');
  search.setAttribute('spellcheck', 'false');
  search.setAttribute('aria-label', 'Search products by product number, name, description or specifications');

  const icon = document.createElement('span');
  icon.className = 'search-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '\u2315';

  const clear = document.createElement('button');
  clear.id = 'clearProductSearch';
  clear.className = 'search-clear';
  clear.type = 'button';
  clear.textContent = 'Clear';
  clear.hidden = true;
  clear.addEventListener('click', () => {
    search.value = '';
    visibleCount = pageSize;
    scheduleRender();
    search.focus();
  });

  label.append(icon, clear);
}

function renderProductCard(product, highlightTerms) {
  const meta = [
    ...(product.specs || []),
    product.application,
    product.brand
  ].filter(Boolean).slice(0, 4);
  const imageMarkup = product.image
  ? `<img
      class="product-photo"
      loading="lazy"
      src="${escapeHtml(assetPath(product.image))}"
      alt="${escapeHtml(`${product.name} ${product.number}`)}">`
  : `<i>${escapeHtml(data.icon)}</i>`;
  const badge = product.isImported ? 'Imported product' : 'Catalogue preview';
  const description = product.description || product.application || 'Heavy-duty replacement part';

  return `<article class="product-card">
    <div class="product-image${product.image ? ' has-photo' : ''}">
      <span class="product-badge">${badge}</span>
      ${imageMarkup}
    </div>
    <div class="product-body">
    <h3>${highlightText(product.number, highlightTerms)}</h3>
    <span class="product-name">${highlightText(product.name, highlightTerms)}</span>
<p class="product-code">${highlightText(description, highlightTerms)}</p>
      <div class="product-meta">${meta.map(item => `<span>${highlightText(item, highlightTerms)}</span>`).join('')}</div>
      <div class="product-action">
        <small>${escapeHtml(product.availability)}</small>
        <button data-enquire="${escapeHtml(`${product.number} ${product.name}`)}">Enquire &nearr;</button>
      </div>
    </div>
  </article>`;
}

function ensureLoadMoreButton() {
  let shell = document.querySelector('#loadMoreProducts');
  if (!shell && catalogueNote) {
    shell = document.createElement('div');
    shell.id = 'loadMoreProducts';
    shell.className = 'load-more-products';
    shell.innerHTML = '<button class="button button-dark" type="button">Load more products <span>&darr;</span></button>';
    catalogueNote.parentNode.insertBefore(shell, catalogueNote);
    shell.querySelector('button').addEventListener('click', () => {
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
  const selectedBrand = brand?.selectedIndex ? brand.value : '';
  const selectedStock = stock?.selectedIndex ? stock.value : '';

  const filtered = catalogueRecords.filter(record => {
    const product = record.product;
    const brandMatches = !selectedBrand || product.brand === selectedBrand;
    const stockMatches = !selectedStock || product.availability === selectedStock;
    return brandMatches && stockMatches && matchesSearch(record, searchState);
  }).map(record => record.product);

  const visible = filtered.slice(0, visibleCount);
  count.textContent = searchState.tokens.length
    ? `${visible.length} of ${filtered.length} matching products shown`
    : `${visible.length} of ${filtered.length} catalogue items shown`;
  productGrid.innerHTML = visible.length
    ? visible.map(product => renderProductCard(product, searchState.highlightTerms)).join('')
    : '<div class="no-results"><strong>No products found</strong><span>Try another product number, part name, OD, ID, HI, PIN or specification.</span></div>';

  const loadMore = ensureLoadMoreButton();
  if (loadMore) {
    loadMore.hidden = filtered.length <= visibleCount;
  }

  productGrid.querySelectorAll('[data-enquire]').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.setItem('naeEnquiry', `${data.title}: ${btn.dataset.enquire}`);
      location.href = '../../index.html#contact';
    });
  });
  initLightbox();
}

function scheduleRender() {
  if (pendingRender) return;
  pendingRender = requestAnimationFrame(render);
}

[search, brand, stock].forEach(el => {
  el?.addEventListener('input', () => {
    visibleCount = pageSize;
    scheduleRender();
  });
  el?.addEventListener('change', () => {
    visibleCount = pageSize;
    scheduleRender();
  });
});

enhanceSearchBar();
render();
initLightbox();

const lightbox = document.createElement("div");
lightbox.id = "image-lightbox";
lightbox.innerHTML = `<img src="">`;
document.body.appendChild(lightbox);

const lightboxImg = lightbox.querySelector("img");

function initLightbox() {

  document.querySelectorAll(".product-photo").forEach(img => {

    img.onclick = () => {

      lightbox.style.display = "flex";

      lightboxImg.src = img.src;

    };

  });

}

lightbox.onclick = () => {

  lightbox.style.display = "none";

};

