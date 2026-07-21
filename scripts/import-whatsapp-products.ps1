[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [string]$WhatsAppFolder = 'whatsapp-import',
  [string]$BrandOverride = '',
  [switch]$DryRun,
  [switch]$ForceOcr,
  [switch]$RebuildGeneratedData,
  [switch]$ImportUncertain,
  [switch]$NoUpdateExisting
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
    Failed = 0
    OcrCached = 0
    OcrFresh = 0
  }
}

function Set-ParsedBrandOverride {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [AllowNull()][string]$Brand
  )

  if ([string]::IsNullOrWhiteSpace($Brand)) { return }

  $Parsed['Brand'] = $Brand
  $Parsed['BrandEvidence'] = 'Brand override parameter'
}

function Add-DuplicateRow {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ReportRows,
    [Parameter(Mandatory)][System.IO.FileInfo]$File,
    [AllowNull()][string]$ProductNumber,
    [AllowNull()][string]$ProductName,
    [Parameter(Mandatory)][string]$Reason,
    [AllowNull()][string]$OcrText
  )

  $row = ConvertTo-ReportRow `
    -Status 'Skipped duplicate' `
    -File $File.Name `
    -ProductNumber $ProductNumber `
    -ProductName $ProductName `
    -Reason $Reason `
    -Warnings '' `
    -ImagePath '' `
    -OcrText $OcrText
  $ReportRows.Add($row) | Out-Null
}

function Add-ImportedReviewProduct {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$Products,
    [Parameter(Mandatory)][hashtable]$ProductIndex,
    [Parameter(Mandatory)][hashtable]$ImageHashIndex,
    [Parameter(Mandatory)][hashtable]$Summary,
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ReportRows,
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ReviewRows,
    [Parameter(Mandatory)][System.IO.FileInfo]$File,
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$SourceRelativePath,
    [Parameter(Mandatory)][string]$FileHash,
    [Parameter(Mandatory)][string]$Reason,
    [switch]$DryRun
  )

  $number = ''
  if ($Parsed.Contains('ProductNumber')) {
    $number = Normalize-ProductNumber ([string]$Parsed.ProductNumber)
  }
  $imageStem = if (-not [string]::IsNullOrWhiteSpace($number)) { $number } else { "REVIEW-$($FileHash.Substring(0, 12).ToUpperInvariant())" }

  $copiedImage = Copy-ProductImage `
    -SourceFile $File `
    -ProjectRoot $ProjectRoot `
    -ProductNumber $imageStem `
    -UniqueSuffix $FileHash `
    -DryRun:$DryRun

  $record = New-ReviewProductRecord `
    -Parsed $Parsed `
    -SourceFile $File `
    -ProjectRoot $ProjectRoot `
    -ImageRelativePath ([string]$copiedImage.RelativePath) `
    -SourceRelativePath $SourceRelativePath `
    -FileHash $FileHash `
    -Reason $Reason

  $Products.Add($record) | Out-Null
  if (-not [string]::IsNullOrWhiteSpace($number)) {
    $ProductIndex[$number] = $record
  }
  $ImageHashIndex[$FileHash] = $record
  $Summary.Imported++
  $Summary.Review++

  $warnings = ''
  if ($Parsed.Contains('Warnings')) {
    $warnings = (@($Parsed.Warnings) -join ' | ')
  }
  $reviewOcrText = ''
  if ($Parsed.Contains('CleanText')) {
    $reviewOcrText = [string]$Parsed.CleanText
  }

  $row = ConvertTo-ReportRow `
    -Status 'Imported for review' `
    -File $File.Name `
    -ProductNumber $number `
    -ProductName ([string]$record.productName) `
    -Reason $Reason `
    -Warnings $warnings `
    -ImagePath ([string]$copiedImage.RelativePath) `
    -OcrText $reviewOcrText

  $ReportRows.Add($row) | Out-Null
  $ReviewRows.Add($row) | Out-Null
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
if (-not [string]::IsNullOrWhiteSpace($BrandOverride)) { Write-Host "Brand override: $BrandOverride" }
if ($ImportUncertain) { Write-Host 'Mode:    import uncertain OCR records as manual-review products' }
if ($NoUpdateExisting) { Write-Host 'Mode:    skip existing product numbers without updating existing records' }

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
$imageHashIndex = Get-ProductStoreImageHashIndex -Products @($existingProducts)
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
    $fileHash = ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash).ToLowerInvariant()
    if ($imageHashIndex.ContainsKey($fileHash)) {
      $summary.Duplicates++
      Add-DuplicateRow `
        -ReportRows $reportRows `
        -File $file `
        -ProductNumber '' `
        -ProductName '' `
        -Reason 'Exact image hash already exists in generated catalogue data.' `
        -OcrText ''
      continue
    }

    $ocr = Get-CachedImageOcr -File $file -Cache $ocrCache -Force:$ForceOcr
    if ($ocr.FromCache) { $summary.OcrCached++ } else { $summary.OcrFresh++ }
    $parsed = Parse-ProductOcr -Text ([string]$ocr.Text) -Lines @($ocr.Lines) -SourceFile $file.Name
    Set-ParsedBrandOverride -Parsed $parsed -Brand $BrandOverride

    if (-not $parsed.Recognized) {
      if ($ImportUncertain) {
        $number = ''
        if ($parsed.Contains('ProductNumber')) {
          $number = Normalize-ProductNumber ([string]$parsed.ProductNumber)
        }
        if (-not [string]::IsNullOrWhiteSpace($number) -and $productIndex.ContainsKey($number)) {
          $summary.Duplicates++
          Add-DuplicateRow `
            -ReportRows $reportRows `
            -File $file `
            -ProductNumber $number `
            -ProductName ([string]$parsed.ProductName) `
            -Reason 'Product number already exists in generated catalogue data; source image preserved and skipped.' `
            -OcrText ([string]$ocr.Text)
          continue
        }
        if (
          -not $parsed.Contains('Category') -or
          [string]::IsNullOrWhiteSpace([string]$parsed.Category) -or
          -not (Test-CatalogueCategorySlug -ProjectRoot $ProjectRoot -Category ([string]$parsed.Category))
        ) {
          $parsed['Category'] = 'other'
        }

        Add-ImportedReviewProduct `
          -Products $products `
          -ProductIndex $productIndex `
          -ImageHashIndex $imageHashIndex `
          -Summary $summary `
          -ReportRows $reportRows `
          -ReviewRows $reviewRows `
          -File $file `
          -Parsed $parsed `
          -ProjectRoot $ProjectRoot `
          -SourceRelativePath ([string]$item.RelativePath) `
          -FileHash $fileHash `
          -Reason ([string]$parsed.Reason) `
          -DryRun:$DryRun
        continue
      }

      $summary.Review++
      Add-ReviewRow -ReportRows $reportRows -ReviewRows $reviewRows -File $file -Parsed $parsed -Reason ([string]$parsed.Reason) -OcrText ([string]$ocr.Text)
      continue
    }

    if (-not (Test-CatalogueCategorySlug -ProjectRoot $ProjectRoot -Category ([string]$parsed.Category))) {
      if ($ImportUncertain) {
        $parsed['Category'] = 'other'
        Add-ImportedReviewProduct `
          -Products $products `
          -ProductIndex $productIndex `
          -ImageHashIndex $imageHashIndex `
          -Summary $summary `
          -ReportRows $reportRows `
          -ReviewRows $reviewRows `
          -File $file `
          -Parsed $parsed `
          -ProjectRoot $ProjectRoot `
          -SourceRelativePath ([string]$item.RelativePath) `
          -FileHash $fileHash `
          -Reason ("Recognized category is not configured; imported under Other for manual review.") `
          -DryRun:$DryRun
        continue
      }

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
      if ($NoUpdateExisting) {
        $summary.Duplicates++
        Add-DuplicateRow `
          -ReportRows $reportRows `
          -File $file `
          -ProductNumber $number `
          -ProductName ([string]$parsed.ProductName) `
          -Reason 'Product number already exists in generated catalogue data; existing record was not modified.' `
          -OcrText ([string]$ocr.Text)
        continue
      }

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

    $copiedImage = Copy-ProductImage -SourceFile $file -ProjectRoot $ProjectRoot -ProductNumber $number -UniqueSuffix $fileHash -DryRun:$DryRun
    $record = New-ProductRecord `
      -Parsed $parsed `
      -SourceFile $file `
      -ProjectRoot $ProjectRoot `
      -ImageRelativePath ([string]$copiedImage.RelativePath) `
      -SourceRelativePath ([string]$item.RelativePath) `
      -FileHash $fileHash

    $products.Add($record) | Out-Null
    $productIndex[$number] = $record
    $imageHashIndex[$fileHash] = $record
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
    $summary.Failed++
    $summary.Review++
    Write-Warning ("Importer error for {0}: {1}" -f $file.Name, $_.Exception.Message)
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
Write-Host ("Failed imports:    {0}" -f $summary.Failed)
Write-Host ("OCR fresh/cache:   {0}/{1}" -f $summary.OcrFresh, $summary.OcrCached)
Write-Host ("Catalogue data:    {0}" -f $storeResult.Js)
Write-Host ("Review report:     {0}" -f $reportResult.ReviewCsv)
