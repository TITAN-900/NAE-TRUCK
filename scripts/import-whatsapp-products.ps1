[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [string]$WhatsAppFolder = 'whatsapp-import',
  [string]$BrandOverride = '',
  [switch]$DryRun,
  [switch]$ForceOcr,
  [switch]$RebuildGeneratedData,
  [switch]$ImportUncertain,
  [switch]$NoUpdateExisting,
  [switch]$CleanSourceBeforeImport
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
    Skipped = 0
    Failed = 0
    OcrCached = 0
    OcrFresh = 0
    Cleaned = 0
  }
}

function Set-ParsedBrandOverride {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [AllowNull()][string]$Brand
  )

  if ([string]::IsNullOrWhiteSpace($Brand)) { return }

  $canonicalBrand = Get-CanonicalImportBrand -Brand $Brand
  $Parsed['Brand'] = $canonicalBrand
  $Parsed['BrandEvidence'] = 'Brand override parameter'
}

function Get-CanonicalImportBrand {
  param([AllowNull()][string]$Brand)

  if ([string]::IsNullOrWhiteSpace($Brand)) { return '' }

  $trimmed = ([string]$Brand).Trim()
  if ($trimmed -match '宇胜|宇勝') { return 'Yusheng' }

  $normalized = ($trimmed.ToUpperInvariant() -replace '[^A-Z0-9]', '')
  if ($normalized -match '^HUATA[IU]$|^HUATAU$') { return 'Huatai' }
  if ($normalized -match '^YUSHENG$|^YUSENG$|^YUSHEN$') { return 'Yusheng' }

  return $trimmed
}

function Resolve-ImportBrandFromFolder {
  param([AllowNull()][string]$RelativeFolder)

  if ([string]::IsNullOrWhiteSpace($RelativeFolder)) { return '' }

  $pathText = ([string]$RelativeFolder) -replace '\\', '/'
  foreach ($segment in ($pathText -split '/')) {
    $brand = Get-CanonicalImportBrand -Brand $segment
    if ($brand -eq 'Huatai' -or $brand -eq 'Yusheng') {
      return $brand
    }
  }

  return ''
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

function Add-SkippedProductRow {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ReportRows,
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
    -Status 'Skipped product' `
    -File $File.Name `
    -ProductNumber $number `
    -ProductName $name `
    -Reason $Reason `
    -Warnings $warnings `
    -ImagePath $File.FullName `
    -OcrText $OcrText

  $ReportRows.Add($row) | Out-Null
}

function Test-ParsedHasMinimumIdentity {
  param([AllowNull()]$Parsed)

  if ($null -eq $Parsed) { return $false }
  if ($Parsed.Contains('ProductNumber') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.ProductNumber)) { return $true }
  if ($Parsed.Contains('ProductName') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.ProductName)) { return $true }
  if ($Parsed.Contains('OeNumbers')) {
    $oeNumbers = @($Parsed.OeNumbers | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    if ($oeNumbers.Count -gt 0) { return $true }
  }
  return $false
}

function Test-ParsedShouldSkip {
  param([AllowNull()]$Parsed)

  if ($null -eq $Parsed) { return $true }
  if (-not (Test-ParsedHasMinimumIdentity -Parsed $Parsed)) { return $true }
  if ($Parsed.Contains('Reason') -and [string]$Parsed.Reason -match '^Insufficient product information') { return $true }
  return $false
}

function Get-SourceOriginalPath {
  param([AllowNull()]$Product)

  if ($null -eq $Product) { return '' }
  $source = Get-ProductRecordValue -Product $Product -Name 'source'
  if ($null -eq $source) { return '' }

  if ($source -is [System.Collections.IDictionary]) {
    if ($source.Contains('originalPath')) { return [string]$source['originalPath'] }
    return ''
  }

  if ($null -ne $source.PSObject.Properties['originalPath']) {
    return [string]$source.originalPath
  }
  return ''
}

function Remove-ExistingProductsFromSourceFolder {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$Products,
    [Parameter(Mandatory)][string]$SourceFolder,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [switch]$DryRun
  )

  $sourcePrefix = ($SourceFolder -replace '\\', '/').Trim('/')
  if ([string]::IsNullOrWhiteSpace($sourcePrefix)) {
    return [ordered]@{ Products = @($Products); Removed = @(); RemovedImages = @() }
  }
  $sourcePrefix = "$sourcePrefix/"

  $kept = New-Object System.Collections.Generic.List[object]
  $removed = New-Object System.Collections.Generic.List[object]

  foreach ($product in @($Products)) {
    $originalPath = (Get-SourceOriginalPath -Product $product) -replace '\\', '/'
    $originalPath = $originalPath.TrimStart('/')
    if ($originalPath.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      $removed.Add($product) | Out-Null
    } else {
      $kept.Add($product) | Out-Null
    }
  }

  $keptImages = @{}
  foreach ($product in $kept) {
    $image = [string](Get-ProductRecordValue -Product $product -Name 'image')
    if (-not [string]::IsNullOrWhiteSpace($image)) {
      $keptImages[(($image -replace '\\', '/').ToLowerInvariant())] = $true
    }
  }

  $removedImages = New-Object System.Collections.Generic.List[string]
  $imageRoot = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'assets\img\products')).TrimEnd([char[]]@('\', '/'))
  foreach ($product in $removed) {
    $image = [string](Get-ProductRecordValue -Product $product -Name 'image')
    if ([string]::IsNullOrWhiteSpace($image)) { continue }

    $normalizedImage = ($image -replace '\\', '/').ToLowerInvariant()
    if ($keptImages.ContainsKey($normalizedImage)) { continue }

    $candidatePath = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot ($image -replace '/', '\')))
    if (-not $candidatePath.StartsWith($imageRoot, [System.StringComparison]::OrdinalIgnoreCase)) { continue }
    if (-not (Test-Path -LiteralPath $candidatePath -PathType Leaf)) { continue }

    $removedImages.Add($candidatePath) | Out-Null
    if (-not $DryRun) {
      try {
        Remove-Item -LiteralPath $candidatePath -Force
      } catch {
        Write-Warning "Could not remove old copied product image '$candidatePath'. It may be locked by OneDrive or marked read-only. Import will continue and use a unique destination filename if needed. $($_.Exception.Message)"
      }
    }
  }

  return [ordered]@{
    Products = @($kept.ToArray())
    Removed = @($removed.ToArray())
    RemovedImages = @($removedImages.ToArray())
  }
}

Write-Host "NAE product importer"
Write-Host "Project: $ProjectRoot"
Write-Host "Source:  $WhatsAppFolder"
$effectiveBrandOverride = if (-not [string]::IsNullOrWhiteSpace($BrandOverride)) {
  Get-CanonicalImportBrand -Brand $BrandOverride
} else {
  Resolve-ImportBrandFromFolder -RelativeFolder $WhatsAppFolder
}
if ($DryRun) { Write-Host 'Mode:    dry run, no files will be written' }
if ($RebuildGeneratedData) { Write-Host 'Mode:    rebuild generated product data from import sources' }
if (-not [string]::IsNullOrWhiteSpace($effectiveBrandOverride)) {
  $brandMode = if (-not [string]::IsNullOrWhiteSpace($BrandOverride)) { 'override' } else { 'detected from source folder' }
  Write-Host "Brand:   $effectiveBrandOverride ($brandMode)"
}
if ($ImportUncertain) { Write-Warning 'ImportUncertain no longer publishes manual-review products. Uncertain items are written to the review report only.' }
if ($NoUpdateExisting) { Write-Host 'Mode:    skip existing product numbers without updating existing records' }
if ($CleanSourceBeforeImport) { Write-Host 'Mode:    clean existing generated records from this source folder before import' }

$sourceRoot = Join-Path $ProjectRoot $WhatsAppFolder
$cachePath = Join-Path $sourceRoot '.ocr-cache.json'
$catalogueSlugs = @(Get-CatalogueCategorySlugs -ProjectRoot $ProjectRoot)
Write-Host ("Catalogue categories: {0}" -f ($catalogueSlugs -join ', '))
$ocrCache = Read-OcrCache -CachePath $cachePath
$summary = New-RunSummary
$existingProducts = @()
if (-not $RebuildGeneratedData) {
  $existingProducts = @(Read-ProductStore -ProjectRoot $ProjectRoot)
}

if ($CleanSourceBeforeImport -and -not $RebuildGeneratedData) {
  $cleanupResult = Remove-ExistingProductsFromSourceFolder `
    -Products @($existingProducts) `
    -SourceFolder $WhatsAppFolder `
    -ProjectRoot $ProjectRoot `
    -DryRun:$DryRun

  $existingProducts = @($cleanupResult['Products'])
  $summary.Cleaned = @($cleanupResult['Removed']).Count
  Write-Host ("Cleaned source records: {0}" -f @($cleanupResult['Removed']).Count)
  Write-Host ("Cleaned copied product images: {0}" -f @($cleanupResult['RemovedImages']).Count)
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
    Set-ParsedBrandOverride -Parsed $parsed -Brand $effectiveBrandOverride

    if (-not $parsed.Recognized) {
      if (Test-ParsedShouldSkip -Parsed $parsed) {
        $summary.Skipped++
        Add-SkippedProductRow `
          -ReportRows $reportRows `
          -File $file `
          -Parsed $parsed `
          -Reason 'Insufficient product information.' `
          -OcrText ([string]$ocr.Text)
        continue
      }

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
    if ([string]::IsNullOrWhiteSpace($number)) {
      $summary.Review++
      Add-ReviewRow `
        -ReportRows $reportRows `
        -ReviewRows $reviewRows `
        -File $file `
        -Parsed $parsed `
        -Reason 'Product has a readable description but no reliable primary product number; kept for internal review.' `
        -OcrText ([string]$ocr.Text)
      continue
    }

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
Write-Host ("Skipped products:  {0}" -f $summary.Skipped)
Write-Host ("Needs review:      {0}" -f $summary.Review)
Write-Host ("Failed imports:    {0}" -f $summary.Failed)
Write-Host ("Cleaned records:   {0}" -f $summary.Cleaned)
Write-Host ("OCR fresh/cache:   {0}/{1}" -f $summary.OcrFresh, $summary.OcrCached)
Write-Host ("Catalogue data:    {0}" -f $storeResult.Js)
Write-Host ("Review report:     {0}" -f $reportResult.ReviewCsv)
