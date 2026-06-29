NAE PRODUCT IMPORTER

Main command:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-whatsapp-products.ps1

Normal future workflow:
  1. Put new WhatsApp product images into whatsapp-import.
  2. Run the command above from the project folder.
  3. New recognized products are added to assets/data/products.generated.json and products.generated.js.
  4. Duplicate product numbers are skipped.
  5. Uncertain OCR results are written to whatsapp-import/review.

Useful options:
  -DryRun
    Test OCR and parsing without writing files.

  -ForceOcr
    Re-read all images instead of using whatsapp-import/.ocr-cache.json.

  -RebuildGeneratedData
    Rebuild generated catalogue data from source images. This is useful after improving parser rules.

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
