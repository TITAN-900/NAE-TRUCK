[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [string]$WhatsAppFolder = 'whatsapp-import',
  [switch]$DryRun,
  [switch]$ForceOcr,
  [switch]$RebuildGeneratedData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
  $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

. (Join-Path $PSScriptRoot 'importer\Sources.WhatsAppImages.ps1')
. (Join-Path $PSScriptRoot 'importer\Sources.PdfCatalogues.ps1')
. (Join-Path $PSScriptRoot 'importer\WindowsOcr.ps1')
. (Join-Path $PSScriptRoot 'importer\CatalogueConfig.ps1')
. (Join-Path $PSScriptRoot 'importer\ProductParser.ps1')
. (Join-Path $PSScriptRoot 'importer\ProductStore.ps1')
. (Join-Path $PSScriptRoot 'importer\Reports.ps1')

function New-RunSummary {
  return @{
    Scanned = 0
    Imported = 0
    Updated = 0
    Duplicates = 0
    Review = 0
    OcrCached = 0
    OcrFresh = 0
  }
}

function Add-ReviewRow {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ReportRows,
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ReviewRows,
    [Parameter(Mandatory)][System.IO.FileInfo]$File,
    [AllowNull()]$Parsed,
    [Parameter(Mandatory)][string]$Reason,
    [AllowNull()][string]$OcrText
  )

  $warnings = ''
  $number = ''
  $name = ''

  if ($null -ne $Parsed) {
    if ($Parsed.Contains('Warnings')) { $warnings = (@($Parsed.Warnings) -join ' | ') }
    if ($Parsed.Contains('ProductNumber')) { $number = [string]$Parsed.ProductNumber }
    if ($Parsed.Contains('ProductName')) { $name = [string]$Parsed.ProductName }
  }

  $row = ConvertTo-ReportRow `
    -Status 'Needs review' `
    -File $File.Name `
    -ProductNumber $number `
    -ProductName $name `
    -Reason $Reason `
    -Warnings $warnings `
    -ImagePath $File.FullName `
    -OcrText $OcrText

  $ReportRows.Add($row) | Out-Null
  $ReviewRows.Add($row) | Out-Null
}

Write-Host "NAE product importer"
Write-Host "Project: $ProjectRoot"
Write-Host "Source:  $WhatsAppFolder"
if ($DryRun) { Write-Host 'Mode:    dry run, no files will be written' }
if ($RebuildGeneratedData) { Write-Host 'Mode:    rebuild generated product data from import sources' }

$sourceRoot = Join-Path $ProjectRoot $WhatsAppFolder
$cachePath = Join-Path $sourceRoot '.ocr-cache.json'
$catalogueSlugs = @(Get-CatalogueCategorySlugs -ProjectRoot $ProjectRoot)
Write-Host ("Catalogue categories: {0}" -f ($catalogueSlugs -join ', '))
$ocrCache = Read-OcrCache -CachePath $cachePath
$existingProducts = @()
if (-not $RebuildGeneratedData) {
  $existingProducts = @(Read-ProductStore -ProjectRoot $ProjectRoot)
}
$productIndex = Get-ProductStoreIndex -Products @($existingProducts)
Write-Host ("Existing generated products: {0}" -f $productIndex.Count)
$products = New-Object System.Collections.Generic.List[object]
foreach ($existingProduct in $existingProducts) {
  if ($existingProduct -is [array]) {
    foreach ($nestedProduct in $existingProduct) {
      $products.Add($nestedProduct) | Out-Null
    }
  } else {
    $products.Add($existingProduct) | Out-Null
  }
}

$summary = New-RunSummary
$reportRows = New-Object System.Collections.Generic.List[object]
$reviewRows = New-Object System.Collections.Generic.List[object]
$items = @(Get-WhatsAppImageItems -ProjectRoot $ProjectRoot -RelativeFolder $WhatsAppFolder)

foreach ($item in $items) {
  $file = [System.IO.FileInfo]$item.File
  $summary.Scanned++
  Write-Host ("OCR {0}/{1}: {2}" -f $summary.Scanned, $items.Count, $file.Name)

  try {
    $ocr = Get-CachedImageOcr -File $file -Cache $ocrCache -Force:$ForceOcr
    if ($ocr.FromCache) { $summary.OcrCached++ } else { $summary.OcrFresh++ }
    $parsed = Parse-ProductOcr -Text ([string]$ocr.Text) -Lines @($ocr.Lines) -SourceFile $file.Name

    if (-not $parsed.Recognized) {
      $summary.Review++
      Add-ReviewRow -ReportRows $reportRows -ReviewRows $reviewRows -File $file -Parsed $parsed -Reason ([string]$parsed.Reason) -OcrText ([string]$ocr.Text)
      continue
    }

    if (-not (Test-CatalogueCategorySlug -ProjectRoot $ProjectRoot -Category ([string]$parsed.Category))) {
      $summary.Review++
      Add-ReviewRow `
        -ReportRows $reportRows `
        -ReviewRows $reviewRows `
        -File $file `
        -Parsed $parsed `
        -Reason ("Recognized category '{0}' is not configured in assets/data/catalogue.json." -f ([string]$parsed.Category)) `
        -OcrText ([string]$ocr.Text)
      continue
    }

    $number = Normalize-ProductNumber ([string]$parsed.ProductNumber)
    if ($productIndex.ContainsKey($number)) {
      $updateResult = Update-ExistingProductRecord `
        -ExistingProduct $productIndex[$number] `
        -Parsed $parsed `
        -SourceFile $file `
        -ProjectRoot $ProjectRoot `
        -DryRun:$DryRun

      if ($updateResult.Updated) {
        $summary.Updated++
        $row = ConvertTo-ReportRow `
          -Status 'Updated existing' `
          -File $file.Name `
          -ProductNumber $number `
          -ProductName ([string]$parsed.ProductName) `
          -Reason ("Product number already exists; safely updated missing fields: {0}." -f ((@($updateResult.Fields) -join ', '))) `
          -Warnings ((@($parsed.Warnings) -join ' | ')) `
          -ImagePath ([string]$updateResult.Image) `
          -OcrText ([string]$ocr.Text)
      } else {
        $summary.Duplicates++
        $row = ConvertTo-ReportRow `
          -Status 'Skipped duplicate' `
          -File $file.Name `
          -ProductNumber $number `
          -ProductName ([string]$parsed.ProductName) `
          -Reason 'Product number already exists in generated catalogue data and no safe missing-field update was needed.' `
          -Warnings ((@($parsed.Warnings) -join ' | ')) `
          -ImagePath '' `
          -OcrText ([string]$ocr.Text)
      }
      $reportRows.Add($row) | Out-Null
      continue
    }

    $copiedImage = Copy-ProductImage -SourceFile $file -ProjectRoot $ProjectRoot -ProductNumber $number -DryRun:$DryRun
    $record = New-ProductRecord `
      -Parsed $parsed `
      -SourceFile $file `
      -ProjectRoot $ProjectRoot `
      -ImageRelativePath ([string]$copiedImage.RelativePath) `
      -SourceRelativePath ([string]$item.RelativePath)

    $products.Add($record) | Out-Null
    $productIndex[$number] = $record
    $summary.Imported++

    $row = ConvertTo-ReportRow `
      -Status 'Imported' `
      -File $file.Name `
      -ProductNumber $number `
      -ProductName ([string]$parsed.ProductName) `
      -Reason 'Recognized and added to generated catalogue data.' `
      -Warnings ((@($parsed.Warnings) -join ' | ')) `
      -ImagePath ([string]$copiedImage.RelativePath) `
      -OcrText ([string]$ocr.Text)
    $reportRows.Add($row) | Out-Null
  } catch {
    $summary.Review++
    Add-ReviewRow -ReportRows $reportRows -ReviewRows $reviewRows -File $file -Parsed $null -Reason "Importer error: $($_.Exception.Message)" -OcrText ''
  }
}

$productArray = @()
foreach ($product in $products) {
  $productArray += $product
}
$reportArray = @()
foreach ($row in $reportRows) {
  $reportArray += $row
}
$reviewArray = @()
foreach ($row in $reviewRows) {
  $reviewArray += $row
}

$storeResult = Save-ProductStore -ProjectRoot $ProjectRoot -Products @($productArray) -RunSummary $summary -DryRun:$DryRun
$reportResult = Save-ImportReports -ProjectRoot $ProjectRoot -ReportRows @($reportArray) -ReviewRows @($reviewArray) -Summary $summary -DryRun:$DryRun
if (-not $DryRun) {
  Save-OcrCache -Cache $ocrCache -CachePath $cachePath
}

Write-Host ''
Write-Host 'Import complete.'
Write-Host ("Scanned:           {0}" -f $summary.Scanned)
Write-Host ("Imported:          {0}" -f $summary.Imported)
Write-Host ("Updated existing:  {0}" -f $summary.Updated)
Write-Host ("Skipped duplicate: {0}" -f $summary.Duplicates)
Write-Host ("Needs review:      {0}" -f $summary.Review)
Write-Host ("OCR fresh/cache:   {0}/{1}" -f $summary.OcrFresh, $summary.OcrCached)
Write-Host ("Catalogue data:    {0}" -f $storeResult.Js)
Write-Host ("Review report:     {0}" -f $reportResult.ReviewCsv)
