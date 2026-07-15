NAE PRODUCT IMPORTER

Main command:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-whatsapp-products.ps1

Normal future workflow:
  1. Put new WhatsApp product images into whatsapp-import.
  2. Run the command above from the project folder.
  3. New recognized products are copied safely into assets/img/products.
  4. Product data is added to assets/data/products.generated.json and products.generated.js.
  5. Duplicate product numbers are skipped, or safely updated only if existing fields/images are missing.
  6. Uncertain OCR results are written to whatsapp-import/review.

Product data architecture:
  assets/data/catalogue.json
    Category metadata only: category slugs, labels, thumbnails and category preview tags.
    Do not use this as a second product database.

  assets/data/products.generated.json
  assets/data/products.generated.js
    The generated product catalogue used by the website for real imported products.
    These files are the single source for product cards created from WhatsApp images.

  assets/img/products
    Safe product image destination. Existing files are not overwritten.

Recognition rules:
  The importer must identify product number, product name/category, and vehicle brand/type before importing.
  If any of these are uncertain, the item goes to whatsapp-import/review instead of being guessed.

Useful options:
  -DryRun
    Test OCR and parsing without writing files.

  -ForceOcr
    Re-read all images instead of using whatsapp-import/.ocr-cache.json.

  -RebuildGeneratedData
    Rebuild generated catalogue data from source images. Use carefully; normal imports should not need this.

How it is organized:
  scripts/import-whatsapp-products.ps1
    Main orchestrator.

  scripts/importer/WindowsOcr.ps1
    Windows OCR engine and OCR cache.

  scripts/importer/Sources.WhatsAppImages.ps1
    WhatsApp image source adapter.

  scripts/importer/Sources.PdfCatalogues.ps1
    Future PDF catalogue source adapter placeholder.

  scripts/importer/ProductParser.ps1
    Product-number, product-name, description, and specification parser.

  scripts/importer/ProductStore.ps1
    Generated website data and product image handling.

  scripts/importer/Reports.ps1
    Import and review report generation.

Future PDF catalogue support:
  Add PDF rendering inside Sources.PdfCatalogues.ps1 so each PDF page is turned into an image item.
  The OCR, parser, duplicate detection, product data, and reporting modules can then be reused unchanged.

Important:
  The importer is intentionally conservative. If a product number has O/0 ambiguity, a non-standard format, or appears
  to include extra description text, it is placed into the review report instead of being guessed.
