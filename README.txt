NAE ENTERPRISE SDN. BHD. — WEBSITE HANDOFF

Open index.html to preview the website.

WHAT IS INCLUDED
- Premium responsive homepage
- Official supplied NAE logo
- Original sunset heavy-truck hero artwork
- Expandable parts catalogue on the homepage
- 10 dedicated product-category pages
- Search, brand and availability filters
- Product enquiry handoff to the homepage form
- Mobile navigation, smooth scrolling and reveal animations
- Brand-logo placeholders only
- Contact and Google Maps placeholders

BEFORE LAUNCH
1. Replace the placeholder WhatsApp, phone, email and company address.
2. Connect the enquiry form to WhatsApp, email, a CRM or a website backend.
3. Add verified brand logos to the placeholder area.
4. Replace sample catalogue records with the final product list.
5. Add the verified Google Maps embed.

CATALOGUE MAINTENANCE
Homepage category content: assets/js/site.js
Category-page product content: assets/js/category.js
Site-wide styling: assets/css/styles.css
WhatsApp/OCR importer guide: scripts/README-importer.txt

The catalogue is data-driven so additional items can be added without rebuilding
the page layout. For a large live catalogue, the data can later be connected to a
CMS, database or e-commerce backend.

PRODUCT IMPORTER
Put new WhatsApp product images into whatsapp-import, then run:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-whatsapp-products.ps1

Generated products are stored in assets/data/products.generated.json and
assets/data/products.generated.js. Uncertain OCR results are written to
whatsapp-import/review instead of being guessed. The importer is modular so a
future PDF catalogue source can reuse the same OCR, parser, product store and
reporting pipeline.

IMAGE GENERATION NOTE
The hero image was generated with the built-in OpenAI image-generation tool using
a photorealistic website-hero prompt for a generic modern Chinese-style cab-over
prime mover with a full container trailer at sunset. It specifies no logos, text,
watermarks, light trucks, vans, pickups or Japanese light-truck designs.
