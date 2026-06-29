Set-StrictMode -Version Latest

function Get-PdfCatalogueItems {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [string]$RelativeFolder = 'pdf-import'
  )

  <#
    Future extension point.

    The importer is source-adapter based:
    - WhatsApp images currently return image files to the OCR + parser pipeline.
    - PDF catalogues can later be added here by rendering each PDF page to images,
      then returning the same item shape:

      [ordered]@{
        SourceType = 'pdf-page'
        File = <rendered page image FileInfo>
        RelativePath = 'pdf-import/rendered/catalogue-page-001.png'
        SourceDocument = 'pdf-import/catalogue.pdf'
        PageNumber = 1
      }

    Nothing in ProductParser.ps1 or ProductStore.ps1 needs to change for that.
  #>

  $pdfRoot = Join-Path $ProjectRoot $RelativeFolder
  if (-not (Test-Path -LiteralPath $pdfRoot)) {
    return @()
  }

  return @()
}
