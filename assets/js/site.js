const categories=[
  {slug:'engine-parts',num:'01',icon:'⬡',title:'Engine Parts',desc:'Core components for dependable heavy-duty power.',items:['Pistons & liners','Gasket sets','Oil pumps','Turbo components']},
  {slug:'clutch-system',num:'02',icon:'◉',title:'Clutch System',desc:'High-load engagement and driveline control.',items:['Clutch discs','Pressure plates','Release bearings','Clutch boosters']},
  {slug:'brake-system',num:'03',icon:'◫',title:'Brake System',desc:'Stopping confidence for trucks and trailers.',items:['Brake linings','Brake chambers','Valves','Air dryers']},
  {slug:'suspension-system',num:'04',icon:'⌁',title:'Suspension System',desc:'Ride control for demanding roads and payloads.',items:['Leaf springs','Torque rods','Shock absorbers','Air springs']},
  {slug:'cooling-system',num:'05',icon:'✣',title:'Cooling System',desc:'Thermal management for long-haul operation.',items:['Water pumps','Radiators','Fan clutches','Thermostats']},
  {slug:'electrical-system',num:'06',icon:'ϟ',title:'Electrical System',desc:'Starting, charging and vehicle electronics.',items:['Starters','Alternators','Sensors','Switches']},
  {slug:'steering-system',num:'07',icon:'◎',title:'Steering System',desc:'Precise control for heavy commercial chassis.',items:['Steering pumps','Drag links','Tie rods','Repair kits']},
  {slug:'transmission-parts',num:'08',icon:'↹',title:'Transmission Parts',desc:'Gearing components built for heavy torque.',items:['Synchronisers','Gear sets','Bearings','Shift components']},
  {slug:'axle-parts',num:'09',icon:'↔',title:'Axle Parts',desc:'Load-bearing driveline and wheel-end parts.',items:['Hub assemblies','Differential gears','Axle shafts','Wheel bearings']},
  {slug:'trailer-parts',num:'10',icon:'▰',title:'Trailer Parts',desc:'Running gear for trailers and container haulers.',items:['Landing gear','Kingpins','Slack adjusters','Suspension parts']}
];
const grid=document.querySelector('#categoryGrid');
if(grid){grid.innerHTML=categories.map(c=>`<details class="category-card reveal"><summary><span class="category-number">${c.num}</span><div class="category-title"><i>${c.icon}</i><div><h3>${c.title}</h3><p>${c.desc}</p></div></div><span class="category-toggle">+</span></summary><div class="category-detail"><ul>${c.items.map(i=>`<li>${i}</li>`).join('')}</ul><a class="button button-dark" href="products/${c.slug}/index.html">View category <span>↗</span></a></div></details>`).join('')}
document.querySelectorAll('.category-card').forEach(card=>card.addEventListener('toggle',()=>{if(card.open)document.querySelectorAll('.category-card[open]').forEach(other=>{if(other!==card)other.open=false})}));
const toggle=document.querySelector('.nav-toggle'),menu=document.querySelector('.nav-menu');
if(toggle&&menu){toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));menu.classList.toggle('open',!open);document.body.classList.toggle('nav-open',!open)});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{toggle.setAttribute('aria-expanded','false');menu.classList.remove('open');document.body.classList.remove('nav-open')}))}
const header=document.querySelector('#siteHeader');if(header)window.addEventListener('scroll',()=>header.classList.toggle('fixed',scrollY>120),{passive:true});
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
document.querySelector('#year')?.append(new Date().getFullYear());
const form=document.querySelector('#enquiryForm'),toast=document.querySelector('#toast');
if(form){const stored=sessionStorage.getItem('naeEnquiry');if(stored){form.elements.message.value=`I would like to enquire about ${stored}.`;sessionStorage.removeItem('naeEnquiry')}form.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);const msg=`Enquiry prepared for ${data.get('name')}. Add NAE's final WhatsApp number to connect direct sending.`;if(toast){toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),5200)}})}
