Set-StrictMode -Version Latest

function New-CatalogSyncSummary {
  return @{
    Scanned = 0
    Imported = 0
    Updated = 0
    Archived = 0
    Duplicates = 0
    DuplicatesMerged = 0
    Review = 0
    Skipped = 0
    Failed = 0
    OcrFailures = 0
    OcrCached = 0
    OcrFresh = 0
    Cleaned = 0
    SearchIndexRebuilt = $false
    TotalProducts = 0
  }
}

function Normalize-CatalogSyncKey {
  param([AllowNull()][string]$Value)

  return ([string]$Value).ToUpperInvariant() -replace '[^A-Z0-9]', ''
}

function Get-CatalogSyncCachePath {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$WhatsAppFolder
  )

  return Join-Path (Join-Path $ProjectRoot $WhatsAppFolder) '.ocr-cache\catalog-sync.json'
}

function Get-CatalogSyncSourceValue {
  param(
    [AllowNull()]$Product,
    [Parameter(Mandatory)][string]$Name
  )

  if ($null -eq $Product) { return '' }
  $source = Get-ProductRecordValue -Product $Product -Name 'source'
  if ($null -eq $source) { return '' }

  if ($source -is [System.Collections.IDictionary]) {
    if ($source.Contains($Name)) { return [string]$source[$Name] }
    return ''
  }

  $property = $source.PSObject.Properties[$Name]
  if ($null -ne $property) { return [string]$property.Value }
  return ''
}

function Set-CatalogSyncSourceValue {
  param(
    [Parameter(Mandatory)]$Product,
    [Parameter(Mandatory)][string]$Name,
    [AllowNull()][string]$Value
  )

  $source = Get-ProductRecordValue -Product $Product -Name 'source'
  if ($null -eq $source) {
    $source = [ordered]@{}
  }

  if ($source -is [System.Collections.IDictionary]) {
    $source[$Name] = $Value
  } elseif ($null -ne $source.PSObject.Properties[$Name]) {
    $source.$Name = $Value
  } else {
    $source | Add-Member -NotePropertyName $Name -NotePropertyValue $Value -Force
  }

  Set-ProductRecordValue -Product $Product -Name 'source' -Value $source
}

function Get-CatalogSyncArrayValue {
  param(
    [AllowNull()]$Product,
    [Parameter(Mandatory)][string]$Name
  )

  $value = Get-ProductRecordValue -Product $Product -Name $Name
  return @($value | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
}

function Get-CatalogSyncParsedArray {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][string]$Name
  )

  if (-not $Parsed.Contains($Name) -or $null -eq $Parsed[$Name]) { return @() }
  return @($Parsed[$Name] | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
}

function Test-CatalogSyncParsedHasMinimumIdentity {
  param([AllowNull()]$Parsed)

  if ($null -eq $Parsed) { return $false }

  if ($Parsed.Contains('ProductNumber') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.ProductNumber)) {
    return $true
  }

  if ($Parsed.Contains('ProductName') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.ProductName)) {
    return $true
  }

  if ($Parsed.Contains('OeNumbers')) {
    $oeNumbers = @($Parsed.OeNumbers | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    if ($oeNumbers.Count -gt 0) { return $true }
  }

  return $false
}

function Test-CatalogSyncParsedShouldSkip {
  param([AllowNull()]$Parsed)

  if ($null -eq $Parsed) { return $true }
  if (-not (Test-CatalogSyncParsedHasMinimumIdentity -Parsed $Parsed)) { return $true }
  if ($Parsed.Contains('Reason') -and [string]$Parsed.Reason -match '^Insufficient product information') { return $true }
  return $false
}

function Merge-CatalogSyncLegacyOcrCaches {
  param(
    [Parameter(Mandatory)][hashtable]$Cache,
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$BrandFolders
  )

  $merged = 0
  foreach ($brandFolder in $BrandFolders) {
    $legacyCachePath = Join-Path ([string]$brandFolder.FullPath) '.ocr-cache.json'
    if (-not (Test-Path -LiteralPath $legacyCachePath -PathType Leaf)) { continue }

    $legacyCache = Read-OcrCache -CachePath $legacyCachePath
    foreach ($key in @($legacyCache.Keys)) {
      if (-not $Cache.ContainsKey($key)) {
        $Cache[$key] = $legacyCache[$key]
        $merged++
      }
    }
  }

  return $merged
}

function Get-CatalogSyncBrandNumberKey {
  param(
    [AllowNull()][string]$Brand,
    [AllowNull()][string]$Number
  )

  $brandKey = Normalize-CatalogSyncKey $Brand
  $numberKey = Normalize-CatalogSyncKey (Normalize-ProductNumber $Number)
  if ([string]::IsNullOrWhiteSpace($brandKey) -or [string]::IsNullOrWhiteSpace($numberKey)) { return '' }
  return "$brandKey|$numberKey"
}

function Get-CatalogSyncIndexes {
  param([Parameter(Mandatory)][AllowEmptyCollection()][array]$Products)

  $indexes = [ordered]@{
    ByBrandNumber = @{}
    ByNumber = @{}
    ByOe = @{}
    ByAlternate = @{}
    ByHash = @{}
  }

  foreach ($product in @($Products)) {
    if ($null -eq $product) { continue }

    $brand = [string](Get-ProductRecordValue -Product $product -Name 'brand')
    $number = Normalize-ProductNumber ([string](Get-ProductRecordValue -Product $product -Name 'number'))
    if ([string]::IsNullOrWhiteSpace($number)) {
      $number = Normalize-ProductNumber ([string](Get-ProductRecordValue -Product $product -Name 'productNumber'))
    }
    if ([string]::IsNullOrWhiteSpace($number)) {
      $number = Normalize-ProductNumber ([string](Get-ProductRecordValue -Product $product -Name 'partNumber'))
    }

    $brandNumberKey = Get-CatalogSyncBrandNumberKey -Brand $brand -Number $number
    if (-not [string]::IsNullOrWhiteSpace($brandNumberKey) -and -not $indexes.ByBrandNumber.ContainsKey($brandNumberKey)) {
      $indexes.ByBrandNumber[$brandNumberKey] = $product
    }

    $numberKey = Normalize-CatalogSyncKey $number
    if (-not [string]::IsNullOrWhiteSpace($numberKey) -and -not $indexes.ByNumber.ContainsKey($numberKey)) {
      $indexes.ByNumber[$numberKey] = $product
    }

    $oeValues = @(
      [string](Get-ProductRecordValue -Product $product -Name 'oeNumber')
      Get-CatalogSyncArrayValue -Product $product -Name 'oeNumbers'
    )
    foreach ($oe in $oeValues) {
      $key = Normalize-CatalogSyncKey $oe
      if (-not [string]::IsNullOrWhiteSpace($key) -and -not $indexes.ByOe.ContainsKey($key)) {
        $indexes.ByOe[$key] = $product
      }
    }

    foreach ($alternate in @(
      Get-CatalogSyncArrayValue -Product $product -Name 'alternateNumbers'
      Get-CatalogSyncArrayValue -Product $product -Name 'alternatePartNumbers'
    )) {
      $key = Normalize-CatalogSyncKey $alternate
      if (-not [string]::IsNullOrWhiteSpace($key) -and -not $indexes.ByAlternate.ContainsKey($key)) {
        $indexes.ByAlternate[$key] = $product
      }
    }

    $hash = Get-CatalogSyncSourceValue -Product $product -Name 'hash'
    if ([string]::IsNullOrWhiteSpace($hash)) {
      $hash = Get-CatalogSyncSourceValue -Product $product -Name 'sourceFileHash'
    }
    if (-not [string]::IsNullOrWhiteSpace($hash)) {
      $hashKey = $hash.ToLowerInvariant()
      if (-not $indexes.ByHash.ContainsKey($hashKey)) {
        $indexes.ByHash[$hashKey] = $product
      }
    }
  }

  return $indexes
}

function Add-CatalogSyncProductToIndexes {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Indexes,
    [Parameter(Mandatory)]$Product
  )

  $brand = [string](Get-ProductRecordValue -Product $Product -Name 'brand')
  $number = Normalize-ProductNumber ([string](Get-ProductRecordValue -Product $Product -Name 'number'))
  $brandNumberKey = Get-CatalogSyncBrandNumberKey -Brand $brand -Number $number
  if (-not [string]::IsNullOrWhiteSpace($brandNumberKey)) { $Indexes.ByBrandNumber[$brandNumberKey] = $Product }

  $numberKey = Normalize-CatalogSyncKey $number
  if (-not [string]::IsNullOrWhiteSpace($numberKey)) { $Indexes.ByNumber[$numberKey] = $Product }

  $oeCandidates = @()
  $oeCandidates += [string](Get-ProductRecordValue -Product $Product -Name 'oeNumber')
  $oeCandidates += @(Get-CatalogSyncArrayValue -Product $Product -Name 'oeNumbers')
  foreach ($oe in $oeCandidates) {
    $key = Normalize-CatalogSyncKey $oe
    if (-not [string]::IsNullOrWhiteSpace($key)) { $Indexes.ByOe[$key] = $Product }
  }

  $alternateCandidates = @()
  $alternateCandidates += @(Get-CatalogSyncArrayValue -Product $Product -Name 'alternateNumbers')
  $alternateCandidates += @(Get-CatalogSyncArrayValue -Product $Product -Name 'alternatePartNumbers')
  foreach ($alternate in $alternateCandidates) {
    $key = Normalize-CatalogSyncKey $alternate
    if (-not [string]::IsNullOrWhiteSpace($key)) { $Indexes.ByAlternate[$key] = $Product }
  }

  $hash = Get-CatalogSyncSourceValue -Product $Product -Name 'hash'
  if (-not [string]::IsNullOrWhiteSpace($hash)) { $Indexes.ByHash[$hash.ToLowerInvariant()] = $Product }
}

function Find-CatalogSyncExistingProduct {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Indexes,
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [AllowNull()][string]$Brand,
    [AllowNull()][string]$FileHash
  )

  $number = Normalize-ProductNumber ([string]$Parsed.ProductNumber)
  $brandNumberKey = Get-CatalogSyncBrandNumberKey -Brand $Brand -Number $number
  if (-not [string]::IsNullOrWhiteSpace($brandNumberKey) -and $Indexes.ByBrandNumber.ContainsKey($brandNumberKey)) {
    return [ordered]@{ Product = $Indexes.ByBrandNumber[$brandNumberKey]; Match = 'Brand + Product Number' }
  }

  $numberKey = Normalize-CatalogSyncKey $number
  if (-not [string]::IsNullOrWhiteSpace($numberKey) -and $Indexes.ByNumber.ContainsKey($numberKey)) {
    return [ordered]@{ Product = $Indexes.ByNumber[$numberKey]; Match = 'Product Number' }
  }

  foreach ($oe in Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'OeNumbers') {
    $key = Normalize-CatalogSyncKey $oe
    if (-not [string]::IsNullOrWhiteSpace($key) -and $Indexes.ByOe.ContainsKey($key)) {
      return [ordered]@{ Product = $Indexes.ByOe[$key]; Match = 'OE Number' }
    }
  }

  foreach ($alternate in Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'AlternateNumbers') {
    $key = Normalize-CatalogSyncKey $alternate
    if (-not [string]::IsNullOrWhiteSpace($key) -and $Indexes.ByAlternate.ContainsKey($key)) {
      return [ordered]@{ Product = $Indexes.ByAlternate[$key]; Match = 'Alternate Number' }
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($FileHash)) {
    $hashKey = $FileHash.ToLowerInvariant()
    if ($Indexes.ByHash.ContainsKey($hashKey)) {
      return [ordered]@{ Product = $Indexes.ByHash[$hashKey]; Match = 'Image Hash' }
    }
  }

  return $null
}

function Test-CatalogSyncArchived {
  param([AllowNull()]$Product)

  if ($null -eq $Product) { return $false }
  $status = [string](Get-ProductRecordValue -Product $Product -Name 'status')
  $archived = Get-ProductRecordValue -Product $Product -Name 'archived'
  return ($status -eq 'Archived' -or $archived -eq $true -or [string]$archived -eq 'true')
}

function Set-CatalogSyncActive {
  param(
    [Parameter(Mandatory)]$Product,
    [switch]$DryRun
  )

  if ($DryRun) { return }
  Set-ProductRecordValue -Product $Product -Name 'status' -Value 'Active'
  Set-ProductRecordValue -Product $Product -Name 'archived' -Value $false
  Set-ProductRecordValue -Product $Product -Name 'archivedAt' -Value ''
  Set-ProductRecordValue -Product $Product -Name 'archiveReason' -Value ''
}

function Set-CatalogSyncArchived {
  param(
    [Parameter(Mandatory)]$Product,
    [Parameter(Mandatory)][string]$Reason,
    [switch]$DryRun
  )

  if ($DryRun) { return }
  Set-ProductRecordValue -Product $Product -Name 'status' -Value 'Archived'
  Set-ProductRecordValue -Product $Product -Name 'archived' -Value $true
  Set-ProductRecordValue -Product $Product -Name 'archivedAt' -Value (Get-Date).ToString('s')
  Set-ProductRecordValue -Product $Product -Name 'archiveReason' -Value $Reason
}

function Test-CatalogSyncManagedSourcePath {
  param(
    [AllowNull()][string]$SourcePath,
    [Parameter(Mandatory)][string]$WhatsAppFolder
  )

  if ([string]::IsNullOrWhiteSpace($SourcePath)) { return $false }

  $source = ([string]$SourcePath -replace '\\', '/').Trim('/')
  $root = ($WhatsAppFolder -replace '\\', '/').Trim('/')
  if ([string]::IsNullOrWhiteSpace($root)) { return $false }
  if (-not $source.StartsWith("$root/", [System.StringComparison]::OrdinalIgnoreCase)) { return $false }

  $rest = $source.Substring($root.Length + 1)
  $folder = ($rest -split '/')[0]
  return Test-CatalogSyncBrandFolderName -Name $folder
}

function Sync-CatalogProductRecord {
  param(
    [Parameter(Mandatory)]$Product,
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][System.IO.FileInfo]$SourceFile,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$SourceRelativePath,
    [Parameter(Mandatory)][string]$FileHash,
    [AllowNull()][string]$ImageRelativePath,
    [switch]$DryRun
  )

  $updates = New-Object System.Collections.Generic.List[string]
  $number = Normalize-ProductNumber ([string]$Parsed.ProductNumber)
  $engineModels = @(Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'EngineModels')
  $vehicleModels = @(Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'VehicleModels')
  $oeNumbers = @(Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'OeNumbers')
  $alternateNumbers = @(Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'AlternateNumbers')
  $keywords = @(Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'Keywords')
  $specLabels = @(Get-CatalogSyncParsedArray -Parsed $Parsed -Name 'SpecLabels')
  $visibleDescription = if ($Parsed.Contains('VisibleDescription')) { [string]$Parsed.VisibleDescription } else { '' }
  $description = [string]$Parsed.Description
  $longDescription = if (-not [string]::IsNullOrWhiteSpace($visibleDescription)) { $visibleDescription } else { $description }
  $application = (@($vehicleModels + $engineModels) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -Unique) -join ', '

  $fieldMap = [ordered]@{
    number = $number
    productNumber = $number
    partNumber = $number
    name = [string]$Parsed.ProductName
    productName = [string]$Parsed.ProductName
    category = [string]$Parsed.Category
    description = $description
    visibleDescription = $visibleDescription
    longDescription = $longDescription
    application = $application
    brand = Get-CanonicalProductBrand ([string]$Parsed.Brand)
    vehicleModel = (@($vehicleModels) -join ', ')
    engineModel = (@($engineModels) -join ', ')
    oeNumber = (@($oeNumbers) -join ', ')
    alternateNumbers = @($alternateNumbers)
    alternatePartNumbers = @($alternateNumbers)
    availability = 'Ready stock'
    specifications = $Parsed.Specifications
    specs = @($specLabels)
    specification = (@($specLabels) -join '; ')
    keywords = @($keywords)
    needsManualReview = $false
    reviewReason = ''
    confidence = [int]$Parsed.Confidence
    status = 'Active'
    archived = $false
    archivedAt = ''
    archiveReason = ''
  }

  if (-not [string]::IsNullOrWhiteSpace($ImageRelativePath)) {
    $fieldMap['image'] = $ImageRelativePath
    $fieldMap['thumbnail'] = $ImageRelativePath
  }

  foreach ($entry in $fieldMap.GetEnumerator()) {
    $existing = Get-ProductRecordValue -Product $Product -Name $entry.Key
    $newValue = $entry.Value
    $changed = $false

    if ($newValue -is [array]) {
      $existingJoined = (@($existing) | ForEach-Object { [string]$_ }) -join '|'
      $newJoined = (@($newValue) | ForEach-Object { [string]$_ }) -join '|'
      $changed = $existingJoined -ne $newJoined
    } else {
      $changed = ([string]$existing) -ne ([string]$newValue)
    }

    if ($changed) {
      if (-not $DryRun) {
        Set-ProductRecordValue -Product $Product -Name $entry.Key -Value $newValue
      }
      $updates.Add($entry.Key) | Out-Null
    }
  }

  $sourceUpdates = [ordered]@{
    type = 'whatsapp-image'
    originalFile = $SourceFile.Name
    originalPath = $SourceRelativePath
    hash = $FileHash
    ocrText = [string]$Parsed.CleanText
    syncedAt = (Get-Date).ToString('s')
  }

  if ([string]::IsNullOrWhiteSpace((Get-CatalogSyncSourceValue -Product $Product -Name 'importedAt'))) {
    $sourceUpdates['importedAt'] = (Get-Date).ToString('s')
  }

  foreach ($entry in $sourceUpdates.GetEnumerator()) {
    $existing = Get-CatalogSyncSourceValue -Product $Product -Name $entry.Key
    if ([string]$existing -ne [string]$entry.Value) {
      if (-not $DryRun) {
        Set-CatalogSyncSourceValue -Product $Product -Name $entry.Key -Value ([string]$entry.Value)
      }
      $updates.Add("source.$($entry.Key)") | Out-Null
    }
  }

  if (-not $DryRun) {
    Set-ProductRecordValue -Product $Product -Name 'searchableText' -Value (ConvertTo-ProductSearchableText -Product $Product)
  }
  if ($updates.Count -gt 0 -and -not $updates.Contains('searchableText')) {
    $updates.Add('searchableText') | Out-Null
  }

  return [ordered]@{
    Updated = ($updates.Count -gt 0)
    Fields = @($updates | Select-Object -Unique)
    Image = [string](Get-ProductRecordValue -Product $Product -Name 'image')
  }
}

function Add-CatalogSyncReportRow {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ReportRows,
    [Parameter(Mandatory)][string]$Status,
    [Parameter(Mandatory)][System.IO.FileInfo]$File,
    [AllowNull()][System.Collections.IDictionary]$Parsed,
    [AllowNull()][string]$ProductNumber,
    [AllowNull()][string]$ProductName,
    [AllowNull()][string]$Reason,
    [AllowNull()][string]$Warnings,
    [AllowNull()][string]$ImagePath,
    [AllowNull()][string]$OcrText
  )

  $number = $ProductNumber
  $name = $ProductName
  $warningText = $Warnings

  if ($null -ne $Parsed) {
    if ([string]::IsNullOrWhiteSpace($number) -and $Parsed.Contains('ProductNumber')) { $number = [string]$Parsed.ProductNumber }
    if ([string]::IsNullOrWhiteSpace($name) -and $Parsed.Contains('ProductName')) { $name = [string]$Parsed.ProductName }
    if ([string]::IsNullOrWhiteSpace($warningText) -and $Parsed.Contains('Warnings')) { $warningText = (@($Parsed.Warnings) -join ' | ') }
  }

  $ReportRows.Add((ConvertTo-ReportRow `
    -Status $Status `
    -File $File.Name `
    -ProductNumber $number `
    -ProductName $name `
    -Reason $Reason `
    -Warnings $warningText `
    -ImagePath $ImagePath `
    -OcrText $OcrText)) | Out-Null
}

function Invoke-CatalogSync {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [string]$WhatsAppFolder = 'whatsapp-import',
    [switch]$DryRun,
    [switch]$ForceOcr,
    [switch]$SkipArchiveMissing
  )

  Write-Host 'NAE catalog synchronization'
  Write-Host "Project: $ProjectRoot"
  Write-Host "Source:  $WhatsAppFolder"
  if ($DryRun) { Write-Host 'Mode:    dry run, no files will be written' }
  if ($SkipArchiveMissing) { Write-Host 'Mode:    missing source products will not be archived' }

  $summary = New-CatalogSyncSummary
  $catalogueSlugs = @(Get-CatalogueCategorySlugs -ProjectRoot $ProjectRoot)
  Write-Host ("Catalogue categories: {0}" -f ($catalogueSlugs -join ', '))

  $brandFolders = @(Get-CatalogSyncBrandFolders -ProjectRoot $ProjectRoot -RelativeFolder $WhatsAppFolder)
  Write-Host ("Brand folders: {0}" -f (($brandFolders | ForEach-Object { $_.FolderName }) -join ', '))

  $cachePath = Get-CatalogSyncCachePath -ProjectRoot $ProjectRoot -WhatsAppFolder $WhatsAppFolder
  $ocrCache = Read-OcrCache -CachePath $cachePath
  $mergedLegacyCacheEntries = Merge-CatalogSyncLegacyOcrCaches -Cache $ocrCache -BrandFolders $brandFolders
  if ($mergedLegacyCacheEntries -gt 0) {
    Write-Host ("Merged legacy OCR cache entries: {0}" -f $mergedLegacyCacheEntries)
  }
  $activeProducts = @(Read-ProductStore -ProjectRoot $ProjectRoot)
  $archivedProducts = @(Read-ProductArchiveStore -ProjectRoot $ProjectRoot)
  $allProducts = New-Object System.Collections.Generic.List[object]
  foreach ($product in @($activeProducts + $archivedProducts)) {
    if ($null -ne $product) { $allProducts.Add($product) | Out-Null }
  }

  $indexes = Get-CatalogSyncIndexes -Products @($allProducts.ToArray())
  $currentSourcePaths = @{}
  $reportRows = New-Object System.Collections.Generic.List[object]
  $reviewRows = New-Object System.Collections.Generic.List[object]

  foreach ($brandFolder in $brandFolders) {
    $folderBrand = Get-CanonicalImportBrand -Brand ([string]$brandFolder.FolderName)
    $items = @(Get-WhatsAppImageItems -ProjectRoot $ProjectRoot -RelativeFolder ([string]$brandFolder.RelativePath))
    if ($items.Count -eq 0) { continue }

    Write-Host ("Sync brand '{0}' from {1}: {2} images" -f $folderBrand, $brandFolder.RelativePath, $items.Count)

    foreach ($item in $items) {
      $file = [System.IO.FileInfo]$item.File
      $sourceRelativePath = [string]$item.RelativePath
      $currentSourcePaths[(($sourceRelativePath -replace '\\', '/').ToLowerInvariant())] = $true
      $summary.Scanned++
      Write-Host ("OCR {0}: {1}" -f $summary.Scanned, $sourceRelativePath)

      try {
        $fileHash = ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash).ToLowerInvariant()

        try {
          $ocr = Get-CachedImageOcr -File $file -Cache $ocrCache -Force:$ForceOcr
          if ($ocr.FromCache) { $summary.OcrCached++ } else { $summary.OcrFresh++ }
        } catch {
          $summary.OcrFailures++
          $summary.Failed++
          $summary.Review++
          Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'OCR failure' -File $file -Parsed $null -ProductNumber '' -ProductName '' -Reason $_.Exception.Message -Warnings '' -ImagePath $file.FullName -OcrText ''
          $reviewRows.Add($reportRows[$reportRows.Count - 1]) | Out-Null
          continue
        }

        $parsed = Parse-ProductOcr -Text ([string]$ocr.Text) -Lines @($ocr.Lines) -SourceFile $file.Name
        Set-ParsedBrandOverride -Parsed $parsed -Brand $folderBrand

        $hashMatch = if ($indexes.ByHash.ContainsKey($fileHash)) { $indexes.ByHash[$fileHash] } else { $null }

        if (-not $parsed.Recognized) {
          if ($null -ne $hashMatch) {
            $summary.Duplicates++
            $summary.DuplicatesMerged++
            if (-not $DryRun) {
              Set-CatalogSyncSourceValue -Product $hashMatch -Name 'originalFile' -Value $file.Name
              Set-CatalogSyncSourceValue -Product $hashMatch -Name 'originalPath' -Value $sourceRelativePath
              Set-CatalogSyncSourceValue -Product $hashMatch -Name 'syncedAt' -Value (Get-Date).ToString('s')
              Set-CatalogSyncActive -Product $hashMatch
            }
            Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Duplicate merged' -File $file -Parsed $parsed -ProductNumber '' -ProductName '' -Reason 'OCR was uncertain, but exact image hash matched an existing product record.' -Warnings '' -ImagePath ([string](Get-ProductRecordValue -Product $hashMatch -Name 'image')) -OcrText ([string]$ocr.Text)
            continue
          }

          if (Test-CatalogSyncParsedShouldSkip -Parsed $parsed) {
            $summary.Skipped++
            Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Skipped image' -File $file -Parsed $parsed -ProductNumber '' -ProductName '' -Reason 'Insufficient product information.' -Warnings '' -ImagePath $file.FullName -OcrText ([string]$ocr.Text)
            continue
          }

          $summary.Review++
          Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Needs review' -File $file -Parsed $parsed -ProductNumber '' -ProductName '' -Reason ([string]$parsed.Reason) -Warnings '' -ImagePath $file.FullName -OcrText ([string]$ocr.Text)
          $reviewRows.Add($reportRows[$reportRows.Count - 1]) | Out-Null
          continue
        }

        if (-not (Test-CatalogueCategorySlug -ProjectRoot $ProjectRoot -Category ([string]$parsed.Category))) {
          $summary.Review++
          Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Needs review' -File $file -Parsed $parsed -ProductNumber '' -ProductName '' -Reason ("Recognized category '{0}' is not configured in assets/data/catalogue.json." -f ([string]$parsed.Category)) -Warnings '' -ImagePath $file.FullName -OcrText ([string]$ocr.Text)
          $reviewRows.Add($reportRows[$reportRows.Count - 1]) | Out-Null
          continue
        }

        $number = Normalize-ProductNumber ([string]$parsed.ProductNumber)
        if ([string]::IsNullOrWhiteSpace($number)) {
          $summary.Review++
          Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Needs review' -File $file -Parsed $parsed -ProductNumber '' -ProductName '' -Reason 'Product has a readable description but no reliable primary product number; kept for internal review.' -Warnings '' -ImagePath $file.FullName -OcrText ([string]$ocr.Text)
          $reviewRows.Add($reportRows[$reportRows.Count - 1]) | Out-Null
          continue
        }

        $match = Find-CatalogSyncExistingProduct -Indexes $indexes -Parsed $parsed -Brand $folderBrand -FileHash $fileHash

        if ($null -ne $match) {
          $existingProduct = $match.Product
          $existingHash = Get-CatalogSyncSourceValue -Product $existingProduct -Name 'hash'
          $existingImage = [string](Get-ProductRecordValue -Product $existingProduct -Name 'image')
          $imageRelativePath = $existingImage
          if ([string]::IsNullOrWhiteSpace($existingImage) -or -not (Test-ProductImageRelativePath -ProjectRoot $ProjectRoot -ImageRelativePath $existingImage) -or $existingHash -ne $fileHash) {
            $copiedImage = Copy-ProductImage -SourceFile $file -ProjectRoot $ProjectRoot -ProductNumber $number -UniqueSuffix $fileHash -ReuseExisting -DryRun:$DryRun
            $imageRelativePath = [string]$copiedImage.RelativePath
          }

          $wasArchived = Test-CatalogSyncArchived -Product $existingProduct
          $updateResult = Sync-CatalogProductRecord -Product $existingProduct -Parsed $parsed -SourceFile $file -ProjectRoot $ProjectRoot -SourceRelativePath $sourceRelativePath -FileHash $fileHash -ImageRelativePath $imageRelativePath -DryRun:$DryRun
          Add-CatalogSyncProductToIndexes -Indexes $indexes -Product $existingProduct

          if ($updateResult.Updated -or $wasArchived) {
            $summary.Updated++
            if ($match.Match -ne 'Brand + Product Number') { $summary.DuplicatesMerged++ }
            Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Updated product' -File $file -Parsed $parsed -ProductNumber $number -ProductName ([string]$parsed.ProductName) -Reason ("Matched existing product by {0}; updated fields: {1}." -f $match.Match, ((@($updateResult.Fields) | Select-Object -Unique) -join ', ')) -Warnings '' -ImagePath $imageRelativePath -OcrText ([string]$ocr.Text)
          } else {
            $summary.Duplicates++
            Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Unchanged product' -File $file -Parsed $parsed -ProductNumber $number -ProductName ([string]$parsed.ProductName) -Reason ("Matched existing product by {0}; no data changes needed." -f $match.Match) -Warnings '' -ImagePath $imageRelativePath -OcrText ([string]$ocr.Text)
          }
          continue
        }

        $copiedNewImage = Copy-ProductImage -SourceFile $file -ProjectRoot $ProjectRoot -ProductNumber $number -UniqueSuffix $fileHash -ReuseExisting -DryRun:$DryRun
        $newRecord = New-ProductRecord -Parsed $parsed -SourceFile $file -ProjectRoot $ProjectRoot -ImageRelativePath ([string]$copiedNewImage.RelativePath) -SourceRelativePath $sourceRelativePath -FileHash $fileHash
        if (-not $DryRun) {
          Set-ProductRecordValue -Product $newRecord -Name 'status' -Value 'Active'
          Set-ProductRecordValue -Product $newRecord -Name 'archived' -Value $false
          Set-CatalogSyncSourceValue -Product $newRecord -Name 'syncedAt' -Value (Get-Date).ToString('s')
        }
        $allProducts.Add($newRecord) | Out-Null
        Add-CatalogSyncProductToIndexes -Indexes $indexes -Product $newRecord
        $summary.Imported++
        Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'New product' -File $file -Parsed $parsed -ProductNumber $number -ProductName ([string]$parsed.ProductName) -Reason 'No duplicate match found; created a new product record.' -Warnings '' -ImagePath ([string]$copiedNewImage.RelativePath) -OcrText ([string]$ocr.Text)
      } catch {
        $summary.Failed++
        $summary.Review++
        Write-Warning ("Sync error for {0}: {1}" -f $file.Name, $_.Exception.Message)
        Add-CatalogSyncReportRow -ReportRows $reportRows -Status 'Failed import' -File $file -Parsed $null -ProductNumber '' -ProductName '' -Reason $_.Exception.Message -Warnings '' -ImagePath $file.FullName -OcrText ''
        $reviewRows.Add($reportRows[$reportRows.Count - 1]) | Out-Null
      }
    }
  }

  if (-not $SkipArchiveMissing) {
    foreach ($product in @($allProducts.ToArray())) {
      if ($null -eq $product) { continue }
      if (Test-CatalogSyncArchived -Product $product) { continue }

      $sourcePath = (Get-CatalogSyncSourceValue -Product $product -Name 'originalPath') -replace '\\', '/'
      $sourceKey = $sourcePath.ToLowerInvariant()
      if (-not (Test-CatalogSyncManagedSourcePath -SourcePath $sourcePath -WhatsAppFolder $WhatsAppFolder)) { continue }
      if ($currentSourcePaths.ContainsKey($sourceKey)) { continue }

      $summary.Archived++
      Set-CatalogSyncArchived -Product $product -Reason 'Source image no longer exists in its brand folder.' -DryRun:$DryRun
      $reportRows.Add((ConvertTo-ReportRow `
        -Status 'Archived product' `
        -File ([System.IO.Path]::GetFileName($sourcePath)) `
        -ProductNumber ([string](Get-ProductRecordValue -Product $product -Name 'number')) `
        -ProductName ([string](Get-ProductRecordValue -Product $product -Name 'name')) `
        -Reason 'Source image no longer exists in its brand folder; product moved to Archived state.' `
        -Warnings '' `
        -ImagePath ([string](Get-ProductRecordValue -Product $product -Name 'image')) `
        -OcrText '')) | Out-Null
    }
  }

  $activeOutput = @($allProducts.ToArray() | Where-Object { -not (Test-CatalogSyncArchived -Product $_) })
  $archiveOutput = @($allProducts.ToArray() | Where-Object { Test-CatalogSyncArchived -Product $_ })
  $summary.TotalProducts = @($activeOutput).Count
  $summary.SearchIndexRebuilt = $true

  $storeResult = Save-ProductStore -ProjectRoot $ProjectRoot -Products @($activeOutput) -RunSummary $summary -DryRun:$DryRun
  $archiveResult = Save-ProductArchiveStore -ProjectRoot $ProjectRoot -Products @($archiveOutput) -DryRun:$DryRun
  $reportResult = Save-ImportReports -ProjectRoot $ProjectRoot -ReportRows @($reportRows.ToArray()) -ReviewRows @($reviewRows.ToArray()) -Summary $summary -DryRun:$DryRun

  if (-not $DryRun) {
    Save-OcrCache -Cache $ocrCache -CachePath $cachePath
  }

  Write-Host ''
  Write-Host 'Catalog synchronization complete.'
  Write-Host ("Images scanned:              {0}" -f $summary.Scanned)
  Write-Host ("New products:                {0}" -f $summary.Imported)
  Write-Host ("Updated products:            {0}" -f $summary.Updated)
  Write-Host ("Archived products:           {0}" -f $summary.Archived)
  Write-Host ("Skipped images:              {0}" -f $summary.Skipped)
  Write-Host ("OCR failures:                {0}" -f $summary.OcrFailures)
  Write-Host ("Duplicate products merged:   {0}" -f $summary.DuplicatesMerged)
  Write-Host ("Unchanged duplicates:        {0}" -f $summary.Duplicates)
  Write-Host ("Needs review:                {0}" -f $summary.Review)
  Write-Host ("Search index rebuilt:        {0}" -f $summary.SearchIndexRebuilt)
  Write-Host ("Total products in catalog:   {0}" -f $summary.TotalProducts)
  Write-Host ("OCR fresh/cache:             {0}/{1}" -f $summary.OcrFresh, $summary.OcrCached)
  Write-Host ("Catalogue data:              {0}" -f $storeResult.Js)
  Write-Host ("Archive data:                {0}" -f $archiveResult.Json)
  Write-Host ("Review report:               {0}" -f $reportResult.ReviewCsv)

  return [ordered]@{
    Summary = $summary
    Store = $storeResult
    Archive = $archiveResult
    Report = $reportResult
  }
}
