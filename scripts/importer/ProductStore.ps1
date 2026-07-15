Set-StrictMode -Version Latest

function Get-ProductDataPaths {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  $dataDir = Join-Path $ProjectRoot 'assets\data'
  if (-not (Test-Path -LiteralPath $dataDir)) {
    New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
  }

  return [ordered]@{
    Json = Join-Path $dataDir 'products.generated.json'
    Js = Join-Path $dataDir 'products.generated.js'
  }
}

function Read-ProductStore {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  $paths = Get-ProductDataPaths -ProjectRoot $ProjectRoot
  if (-not (Test-Path -LiteralPath $paths.Json)) {
    return @()
  }

  try {
    $raw = Get-Content -LiteralPath $paths.Json -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
    $items = $raw | ConvertFrom-Json
    if ($null -eq $items) { return @() }
    foreach ($item in @($items)) {
      if ($null -ne $item) { Write-Output $item }
    }
  } catch {
    throw "Could not read product data store: $($paths.Json). $($_.Exception.Message)"
  }
}

function Get-ProductStoreIndex {
  param([Parameter(Mandatory)][AllowEmptyCollection()][array]$Products)

  $index = @{}
  foreach ($product in $Products) {
    if ($product -is [array]) {
      foreach ($nestedProduct in $product) {
        $number = Normalize-ProductNumber ([string]$nestedProduct.number)
        if (-not [string]::IsNullOrWhiteSpace($number)) {
          $index[$number] = $nestedProduct
        }
      }
      continue
    }
    $number = Normalize-ProductNumber ([string]$product.number)
    if (-not [string]::IsNullOrWhiteSpace($number)) {
      $index[$number] = $product
    }
  }
  return $index
}

function New-ProductRecord {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][System.IO.FileInfo]$SourceFile,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$ImageRelativePath,
    [Parameter(Mandatory)][string]$SourceRelativePath
  )

  $number = Normalize-ProductNumber $Parsed.ProductNumber
  $now = (Get-Date).ToString('s')

  return [ordered]@{
    id = $number
    number = $number
    name = [string]$Parsed.ProductName
    category = [string]$Parsed.Category
    description = [string]$Parsed.Description
    application = ''
    brand = [string]$Parsed.Brand
    availability = 'Ready stock'
    image = $ImageRelativePath
    specifications = $Parsed.Specifications
    specs = @($Parsed.SpecLabels)
    confidence = [int]$Parsed.Confidence
    source = [ordered]@{
      type = 'whatsapp-image'
      originalFile = $SourceFile.Name
      originalPath = $SourceRelativePath
      ocrText = [string]$Parsed.CleanText
      importedAt = $now
    }
  }
}

function Get-ProductRecordValue {
  param(
    [Parameter(Mandatory)]$Product,
    [Parameter(Mandatory)][string]$Name
  )

  if ($Product -is [System.Collections.IDictionary]) {
    if ($Product.Contains($Name)) { return $Product[$Name] }
    return $null
  }

  $property = $Product.PSObject.Properties[$Name]
  if ($null -ne $property) { return $property.Value }
  return $null
}

function Set-ProductRecordValue {
  param(
    [Parameter(Mandatory)]$Product,
    [Parameter(Mandatory)][string]$Name,
    [AllowNull()]$Value
  )

  if ($Product -is [System.Collections.IDictionary]) {
    $Product[$Name] = $Value
    return
  }

  if ($null -ne $Product.PSObject.Properties[$Name]) {
    $Product.$Name = $Value
  } else {
    $Product | Add-Member -NotePropertyName $Name -NotePropertyValue $Value -Force
  }
}

function Test-ProductImageRelativePath {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [AllowNull()][string]$ImageRelativePath
  )

  if ([string]::IsNullOrWhiteSpace($ImageRelativePath)) { return $false }

  $normalized = $ImageRelativePath -replace '/', '\'
  $fullPath = Join-Path $ProjectRoot $normalized
  return Test-Path -LiteralPath $fullPath -PathType Leaf
}

function Copy-ProductImage {
  param(
    [Parameter(Mandatory)][System.IO.FileInfo]$SourceFile,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$ProductNumber,
    [switch]$DryRun
  )

  $imageDir = Join-Path $ProjectRoot 'assets\img\products'
  if (-not (Test-Path -LiteralPath $imageDir)) {
    New-Item -ItemType Directory -Force -Path $imageDir | Out-Null
  }

  $stem = ConvertTo-SafeFileStem $ProductNumber
  $extension = $SourceFile.Extension.ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($extension)) { $extension = '.jpg' }

  $target = Join-Path $imageDir "$stem$extension"
  if (-not $DryRun) {
    if (-not (Test-Path -LiteralPath $target)) {
      Copy-Item -LiteralPath $SourceFile.FullName -Destination $target -Force
    }
  }

  return [ordered]@{
    FullPath = $target
    RelativePath = (Get-RelativeProjectPath -ProjectRoot $ProjectRoot -Path $target)
  }
}

function Update-ExistingProductRecord {
  param(
    [Parameter(Mandatory)]$ExistingProduct,
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][System.IO.FileInfo]$SourceFile,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [switch]$DryRun
  )

  $updates = New-Object System.Collections.Generic.List[string]
  $number = Normalize-ProductNumber ([string]$Parsed.ProductNumber)

  $existingBrand = [string](Get-ProductRecordValue -Product $ExistingProduct -Name 'brand')
  if (
    -not [string]::IsNullOrWhiteSpace($Parsed.Brand) -and
    ([string]::IsNullOrWhiteSpace($existingBrand) -or $existingBrand -eq 'Imported catalogue')
  ) {
    if (-not $DryRun) {
      Set-ProductRecordValue -Product $ExistingProduct -Name 'brand' -Value ([string]$Parsed.Brand)
    }
    $updates.Add('brand') | Out-Null
  }

  foreach ($field in @('name', 'category', 'description')) {
    $parsedKey = switch ($field) {
      'name' { 'ProductName' }
      'category' { 'Category' }
      'description' { 'Description' }
    }

    $existingValue = [string](Get-ProductRecordValue -Product $ExistingProduct -Name $field)
    $newValue = [string]$Parsed[$parsedKey]
    if (-not [string]::IsNullOrWhiteSpace($newValue) -and [string]::IsNullOrWhiteSpace($existingValue)) {
      if (-not $DryRun) {
        Set-ProductRecordValue -Product $ExistingProduct -Name $field -Value $newValue
      }
      $updates.Add($field) | Out-Null
    }
  }

  $existingImage = [string](Get-ProductRecordValue -Product $ExistingProduct -Name 'image')
  if (-not (Test-ProductImageRelativePath -ProjectRoot $ProjectRoot -ImageRelativePath $existingImage)) {
    $copiedImage = Copy-ProductImage -SourceFile $SourceFile -ProjectRoot $ProjectRoot -ProductNumber $number -DryRun:$DryRun
    if (-not $DryRun) {
      Set-ProductRecordValue -Product $ExistingProduct -Name 'image' -Value ([string]$copiedImage.RelativePath)
    }
    $updates.Add('image') | Out-Null
  }

  $existingConfidence = [int]([string](Get-ProductRecordValue -Product $ExistingProduct -Name 'confidence') -replace '[^0-9]', '')
  if ([int]$Parsed.Confidence -gt $existingConfidence) {
    if (-not $DryRun) {
      Set-ProductRecordValue -Product $ExistingProduct -Name 'confidence' -Value ([int]$Parsed.Confidence)
    }
    $updates.Add('confidence') | Out-Null
  }

  if ($updates.Count -gt 0 -and -not $DryRun) {
    $source = Get-ProductRecordValue -Product $ExistingProduct -Name 'source'
    if ($null -eq $source) {
      $source = [ordered]@{}
    }

    if ($source -isnot [System.Collections.IDictionary] -and $source.PSObject.Properties['lastUpdatedAt']) {
      $source.lastUpdatedAt = (Get-Date).ToString('s')
    } elseif ($source -is [System.Collections.IDictionary]) {
      $source['lastUpdatedAt'] = (Get-Date).ToString('s')
    }

    Set-ProductRecordValue -Product $ExistingProduct -Name 'source' -Value $source
  }

  return [ordered]@{
    Updated = ($updates.Count -gt 0)
    Fields = @($updates)
    Image = [string](Get-ProductRecordValue -Product $ExistingProduct -Name 'image')
  }
}

function Save-ProductStore {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$Products,
    [Parameter(Mandatory)][hashtable]$RunSummary,
    [switch]$DryRun
  )

  $paths = Get-ProductDataPaths -ProjectRoot $ProjectRoot
  $sortedProducts = @($Products | Sort-Object -Property category, name, number)
  if ($sortedProducts.Count -eq 0) {
    $json = '[]'
  } else {
    $json = ConvertTo-Json -InputObject @($sortedProducts) -Depth 30
  }

  $meta = [ordered]@{
    generatedAt = (Get-Date).ToString('s')
    totalProducts = $sortedProducts.Count
    importedThisRun = [int]$RunSummary.Imported
    updatedThisRun = if ($RunSummary.ContainsKey('Updated')) { [int]$RunSummary.Updated } else { 0 }
    skippedDuplicates = [int]$RunSummary.Duplicates
    needsReview = [int]$RunSummary.Review
    source = 'whatsapp-import'
  }

  $js = @(
    '/* Auto-generated by scripts/import-whatsapp-products.ps1. Do not edit by hand. */'
    "window.NAE_IMPORTED_PRODUCTS = $json;"
    "window.NAE_IMPORT_META = $(($meta | ConvertTo-Json -Depth 10));"
  ) -join "`r`n"

  if (-not $DryRun) {
    $json | Set-Content -LiteralPath $paths.Json -Encoding UTF8
    $js | Set-Content -LiteralPath $paths.Js -Encoding UTF8
  }

  return [ordered]@{
    Json = $paths.Json
    Js = $paths.Js
    Count = $sortedProducts.Count
  }
}
