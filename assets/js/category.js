const productData = {
  'engine-parts': {
    title: 'Engine Parts',
    icon: '⬡',
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
    icon: '◉',
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
    icon: '◫',
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
    icon: '⌁',
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
    icon: '✣',
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
    icon: 'ϟ',
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
    icon: '◎',
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
    icon: '↹',
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
    icon: '↔',
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
    icon: '▰',
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
    image: product.image || '',
    confidence: product.confidence || '',
    isImported: true
  }));

const catalogueProducts = [...importedForCategory, ...starterProducts];

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

function searchableText(product) {
  return [
    product.number,
    product.name,
    product.description,
    product.application,
    product.brand,
    ...(product.specs || [])
  ].join(' ').toLowerCase();
}

function renderProductCard(product) {
  const meta = [
    ...(product.specs || []),
    product.application,
    product.brand
  ].filter(Boolean).slice(0, 4);
  const imageMarkup = product.image
    ? `<img loading="lazy" src="${escapeHtml(assetPath(product.image))}" alt="${escapeHtml(`${product.name} ${product.number}`)}">`
    : `<i>${escapeHtml(data.icon)}</i>`;
  const badge = product.isImported ? 'Imported product' : 'Catalogue preview';
  const description = product.description || product.application || 'Heavy-duty replacement part';

  return `<article class="product-card">
    <div class="product-image${product.image ? ' has-photo' : ''}">
      <span class="product-badge">${badge}</span>
      ${imageMarkup}
    </div>
    <div class="product-body">
      <span class="product-code">${escapeHtml(product.number)}</span>
      <h3>${escapeHtml(product.name)}</h3>
      <p class="product-code">${escapeHtml(description)}</p>
      <div class="product-meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
      <div class="product-action">
        <small>${escapeHtml(product.availability)}</small>
        <button data-enquire="${escapeHtml(`${product.number} ${product.name}`)}">Enquire ↗</button>
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
    shell.innerHTML = '<button class="button button-dark" type="button">Load more products <span>↓</span></button>';
    catalogueNote.parentNode.insertBefore(shell, catalogueNote);
    shell.querySelector('button').addEventListener('click', () => {
      visibleCount += pageSize;
      render();
    });
  }
  return shell;
}

function render() {
  const q = (search?.value || '').toLowerCase();
  const selectedBrand = brand?.selectedIndex ? brand.value : '';
  const selectedStock = stock?.selectedIndex ? stock.value : '';

  const filtered = catalogueProducts.filter(product => {
    const brandMatches = !selectedBrand || product.brand === selectedBrand;
    const stockMatches = !selectedStock || product.availability === selectedStock;
    return searchableText(product).includes(q) && brandMatches && stockMatches;
  });

  const visible = filtered.slice(0, visibleCount);
  count.textContent = `${visible.length} of ${filtered.length} catalogue items shown`;
  productGrid.innerHTML = visible.length
    ? visible.map(renderProductCard).join('')
    : '<div class="no-results">No matching catalogue items. Try a broader search or contact our parts team.</div>';

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
}

[search, brand, stock].forEach(el => {
  el?.addEventListener('input', () => {
    visibleCount = pageSize;
    render();
  });
});

render();
