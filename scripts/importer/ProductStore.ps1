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
    ArchiveJson = Join-Path $dataDir 'products.archive.json'
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

function Read-ProductArchiveStore {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  $paths = Get-ProductDataPaths -ProjectRoot $ProjectRoot
  if (-not (Test-Path -LiteralPath $paths.ArchiveJson)) {
    return @()
  }

  try {
    $raw = Get-Content -LiteralPath $paths.ArchiveJson -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
    $items = $raw | ConvertFrom-Json
    if ($null -eq $items) { return @() }
    foreach ($item in @($items)) {
      if ($null -ne $item) { Write-Output $item }
    }
  } catch {
    throw "Could not read product archive store: $($paths.ArchiveJson). $($_.Exception.Message)"
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

function Get-ProductStoreImageHashIndex {
  param([Parameter(Mandatory)][AllowEmptyCollection()][array]$Products)

  $index = @{}
  foreach ($product in $Products) {
    foreach ($item in @($product)) {
      if ($null -eq $item) { continue }
      $source = Get-ProductRecordValue -Product $item -Name 'source'
      if ($null -eq $source) { continue }

      $hash = ''
      if ($source -is [System.Collections.IDictionary]) {
        if ($source.Contains('hash')) { $hash = [string]$source['hash'] }
        elseif ($source.Contains('sourceFileHash')) { $hash = [string]$source['sourceFileHash'] }
      } elseif ($null -ne $source.PSObject.Properties['hash']) {
        $hash = [string]$source.hash
      } elseif ($null -ne $source.PSObject.Properties['sourceFileHash']) {
        $hash = [string]$source.sourceFileHash
      }

      if (-not [string]::IsNullOrWhiteSpace($hash)) {
        $index[$hash.ToLowerInvariant()] = $item
      }
    }
  }

  return $index
}

function Get-ParsedArrayValue {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][string]$Name
  )

  if (-not $Parsed.Contains($Name) -or $null -eq $Parsed[$Name]) { return @() }
  return @($Parsed[$Name] | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
}

function Get-CanonicalProductBrand {
  param([AllowNull()][string]$Brand)

  if ([string]::IsNullOrWhiteSpace($Brand)) { return '' }

  $trimmed = ([string]$Brand).Trim()

  $normalized = ($trimmed.ToUpperInvariant() -replace '[^A-Z0-9]', '')
  if ($normalized -match 'HUATA[IU]|HUATAU') { return 'Huatai' }
  if ($normalized -match 'XINSENG') { return 'XIN SENG' }

  return $trimmed
}

function New-ProductRecord {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][System.IO.FileInfo]$SourceFile,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$ImageRelativePath,
    [Parameter(Mandatory)][string]$SourceRelativePath,
    [AllowNull()][string]$FileHash
  )

  $number = Normalize-ProductNumber $Parsed.ProductNumber
  $now = (Get-Date).ToString('s')
  $engineModels = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'EngineModels')
  $vehicleModels = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'VehicleModels')
  $oeNumbers = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'OeNumbers')
  $alternateNumbers = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'AlternateNumbers')
  $keywords = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'Keywords')
  $vehicleModel = (@($vehicleModels) -join ', ')
  $engineModel = (@($engineModels) -join ', ')
  $oeNumber = (@($oeNumbers) -join ', ')
  $visibleDescription = if ($Parsed.Contains('VisibleDescription')) { [string]$Parsed.VisibleDescription } else { '' }

  return [ordered]@{
    id = $number
    number = $number
    productNumber = $number
    partNumber = $number
    name = [string]$Parsed.ProductName
    productName = [string]$Parsed.ProductName
    category = [string]$Parsed.Category
    subcategory = ''
    description = [string]$Parsed.Description
    visibleDescription = $visibleDescription
    longDescription = if (-not [string]::IsNullOrWhiteSpace($visibleDescription)) { $visibleDescription } else { [string]$Parsed.Description }
    application = (@($vehicleModels + $engineModels) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -Unique) -join ', '
    brand = Get-CanonicalProductBrand ([string]$Parsed.Brand)
    vehicleModel = $vehicleModel
    engineModel = $engineModel
    oeNumber = $oeNumber
    alternateNumbers = @($alternateNumbers)
    alternatePartNumbers = @($alternateNumbers)
    availability = 'Ready stock'
    image = $ImageRelativePath
    thumbnail = $ImageRelativePath
    specifications = $Parsed.Specifications
    specs = @($Parsed.SpecLabels)
    specification = ((@($Parsed.SpecLabels) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }) -join '; ')
    keywords = @($keywords)
    needsManualReview = $false
    reviewReason = ''
    searchableText = ''
    confidence = [int]$Parsed.Confidence
    source = [ordered]@{
      type = 'whatsapp-image'
      originalFile = $SourceFile.Name
      originalPath = $SourceRelativePath
      hash = $FileHash
      ocrText = [string]$Parsed.CleanText
      importedAt = $now
    }
  }
}

function New-ReviewProductRecord {
  param(
    [Parameter(Mandatory)][System.Collections.IDictionary]$Parsed,
    [Parameter(Mandatory)][System.IO.FileInfo]$SourceFile,
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$ImageRelativePath,
    [Parameter(Mandatory)][string]$SourceRelativePath,
    [Parameter(Mandatory)][string]$FileHash,
    [Parameter(Mandatory)][string]$Reason
  )

  $number = ''
  if ($Parsed.Contains('ProductNumber')) {
    $number = Normalize-ProductNumber ([string]$Parsed.ProductNumber)
  }
  $reviewId = if (-not [string]::IsNullOrWhiteSpace($number)) { $number } else { "REVIEW-$($FileHash.Substring(0, 12).ToUpperInvariant())" }
  $name = if ($Parsed.Contains('ProductName') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.ProductName)) { [string]$Parsed.ProductName } else { 'Manual review required' }
  $category = if ($Parsed.Contains('Category') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.Category)) { [string]$Parsed.Category } else { 'other' }
  $description = if ($Parsed.Contains('Description') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.Description)) { [string]$Parsed.Description } else { 'OCR result needs manual review before publishing product details.' }
  $brand = if ($Parsed.Contains('Brand') -and -not [string]::IsNullOrWhiteSpace([string]$Parsed.Brand)) { Get-CanonicalProductBrand ([string]$Parsed.Brand) } else { 'Brand not specified' }
  $engineModels = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'EngineModels')
  $vehicleModels = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'VehicleModels')
  $oeNumbers = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'OeNumbers')
  $alternateNumbers = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'AlternateNumbers')
  $keywords = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'Keywords')
  $specLabels = @(Get-ParsedArrayValue -Parsed $Parsed -Name 'SpecLabels')
  $visibleDescription = if ($Parsed.Contains('VisibleDescription')) { [string]$Parsed.VisibleDescription } else { '' }
  $now = (Get-Date).ToString('s')

  return [ordered]@{
    id = $reviewId
    number = $number
    productNumber = $number
    partNumber = $number
    name = $name
    productName = $name
    category = $category
    subcategory = ''
    description = $description
    visibleDescription = $visibleDescription
    longDescription = if (-not [string]::IsNullOrWhiteSpace($visibleDescription)) { $visibleDescription } else { $description }
    application = (@($vehicleModels + $engineModels) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -Unique) -join ', '
    brand = $brand
    vehicleModel = (@($vehicleModels) -join ', ')
    engineModel = (@($engineModels) -join ', ')
    oeNumber = (@($oeNumbers) -join ', ')
    alternateNumbers = @($alternateNumbers)
    alternatePartNumbers = @($alternateNumbers)
    availability = 'Manual review required'
    image = $ImageRelativePath
    thumbnail = $ImageRelativePath
    specifications = if ($Parsed.Contains('Specifications')) { $Parsed.Specifications } else { [ordered]@{} }
    specs = @($specLabels)
    specification = (@($specLabels) -join '; ')
    keywords = @($keywords)
    needsManualReview = $true
    reviewReason = $Reason
    searchableText = ''
    confidence = if ($Parsed.Contains('Confidence')) { [int]$Parsed.Confidence } else { 0 }
    source = [ordered]@{
      type = 'whatsapp-image'
      originalFile = $SourceFile.Name
      originalPath = $SourceRelativePath
      hash = $FileHash
      ocrText = if ($Parsed.Contains('CleanText')) { [string]$Parsed.CleanText } else { '' }
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

function ConvertTo-ProductSearchableText {
  param([Parameter(Mandatory)]$Product)

  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($field in @('id', 'number', 'productNumber', 'partNumber', 'name', 'productName', 'brand', 'category', 'subcategory', 'description', 'visibleDescription', 'longDescription', 'application', 'vehicleModel', 'engineModel', 'oeNumber', 'specification', 'availability', 'reviewReason')) {
    $value = [string](Get-ProductRecordValue -Product $Product -Name $field)
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      $parts.Add($value) | Out-Null
    }
  }

  $specs = Get-ProductRecordValue -Product $Product -Name 'specs'
  foreach ($spec in @($specs)) {
    $value = [string]$spec
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      $parts.Add($value) | Out-Null
    }
  }

  $keywords = Get-ProductRecordValue -Product $Product -Name 'keywords'
  foreach ($keyword in @($keywords)) {
    $value = [string]$keyword
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      $parts.Add($value) | Out-Null
    }
  }

  foreach ($field in @('alternateNumbers', 'alternatePartNumbers')) {
    $values = Get-ProductRecordValue -Product $Product -Name $field
    foreach ($value in @($values)) {
      $text = [string]$value
      if (-not [string]::IsNullOrWhiteSpace($text)) {
        $parts.Add($text) | Out-Null
      }
    }
  }

  $specifications = Get-ProductRecordValue -Product $Product -Name 'specifications'
  if ($null -ne $specifications) {
    foreach ($property in $specifications.PSObject.Properties) {
      foreach ($value in @($property.Value)) {
        $text = [string]$value
        if (-not [string]::IsNullOrWhiteSpace($text)) {
          $parts.Add("$($property.Name) $text") | Out-Null
        }
      }
    }
  }

  $source = Get-ProductRecordValue -Product $Product -Name 'source'
  if ($null -ne $source) {
    $ocrText = ''
    if ($source -is [System.Collections.IDictionary]) {
      if ($source.Contains('ocrText')) { $ocrText = [string]$source['ocrText'] }
    } elseif ($null -ne $source.PSObject.Properties['ocrText']) {
      $ocrText = [string]$source.ocrText
    }
    if (-not [string]::IsNullOrWhiteSpace($ocrText)) {
      $parts.Add($ocrText) | Out-Null
    }
  }

  return (($parts | Select-Object -Unique) -join ' ').Trim()
}

function Update-ProductCompatibilityFields {
  param([Parameter(Mandatory)]$Product)

  $number = [string](Get-ProductRecordValue -Product $Product -Name 'number')
  if ([string]::IsNullOrWhiteSpace($number)) {
    $number = [string](Get-ProductRecordValue -Product $Product -Name 'productNumber')
  }
  if ([string]::IsNullOrWhiteSpace($number)) {
    $number = [string](Get-ProductRecordValue -Product $Product -Name 'partNumber')
  }
  if ([string]::IsNullOrWhiteSpace($number)) {
    $number = [string](Get-ProductRecordValue -Product $Product -Name 'id')
  }
  if ($number -match '^REVIEW-') {
    $number = ''
  }
  $id = [string](Get-ProductRecordValue -Product $Product -Name 'id')
  if ([string]::IsNullOrWhiteSpace($id)) {
    $id = if (-not [string]::IsNullOrWhiteSpace($number)) { $number } else { "REVIEW-$([guid]::NewGuid().ToString('N').Substring(0, 12).ToUpperInvariant())" }
  }

  $name = [string](Get-ProductRecordValue -Product $Product -Name 'name')
  if ([string]::IsNullOrWhiteSpace($name)) {
    $name = [string](Get-ProductRecordValue -Product $Product -Name 'productName')
  }

  $category = [string](Get-ProductRecordValue -Product $Product -Name 'category')
  if ([string]::IsNullOrWhiteSpace($category)) {
    $category = 'other'
  }

  $source = Get-ProductRecordValue -Product $Product -Name 'source'
  $ocrText = ''
  if ($null -ne $source -and $null -ne $source.PSObject.Properties['ocrText']) {
    $ocrText = [string]$source.ocrText
  }

  $brand = Get-CanonicalProductBrand ([string](Get-ProductRecordValue -Product $Product -Name 'brand'))
  $vehicleModel = [string](Get-ProductRecordValue -Product $Product -Name 'vehicleModel')
  $brandUpper = $brand.ToUpperInvariant()
  $brandIsHuataiAlias = ($brandUpper -eq 'HUATAI' -or $brandUpper -eq 'HUATAU')
  $isHuataiProduct = (
    $number -match '-HT$' -or
    $ocrText -match '\bHUATAI\b|\bHUATAU\b|HT\d{4,5}[A-Z]?\b'
  )

  if ($isHuataiProduct -and $brand -ne 'Huatai') {
    if (-not $brandIsHuataiAlias -and -not [string]::IsNullOrWhiteSpace($brand) -and $brand -ne 'Imported catalogue' -and [string]::IsNullOrWhiteSpace($vehicleModel)) {
      $vehicleModel = $brand
    }
    $brand = 'Huatai'
  } elseif ($brandIsHuataiAlias) {
    $brand = 'Huatai'
  }
  if ([string]::IsNullOrWhiteSpace($brand)) {
    $brand = 'Brand not specified'
  }

  $specification = [string](Get-ProductRecordValue -Product $Product -Name 'specification')
  if ([string]::IsNullOrWhiteSpace($specification)) {
    $specs = @(@(Get-ProductRecordValue -Product $Product -Name 'specs') |
      ForEach-Object { [string]$_ } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($specs.Count -gt 0) {
      $specification = ($specs -join '; ')
    }
  }

  $preservedId = [string](Get-ProductRecordValue -Product $Product -Name 'id')
  if ([string]::IsNullOrWhiteSpace($preservedId) -or $preservedId -match '^REVIEW-') {
    $preservedId = if (-not [string]::IsNullOrWhiteSpace($number)) { $number } else { $id }
  }

  if ([string]::IsNullOrWhiteSpace($number)) {
    Set-ProductRecordValue -Product $Product -Name 'id' -Value $preservedId
    Set-ProductRecordValue -Product $Product -Name 'number' -Value ''
    Set-ProductRecordValue -Product $Product -Name 'productNumber' -Value ''
    Set-ProductRecordValue -Product $Product -Name 'partNumber' -Value ''
  } else {
    Set-ProductRecordValue -Product $Product -Name 'id' -Value $preservedId
    Set-ProductRecordValue -Product $Product -Name 'number' -Value $number
    Set-ProductRecordValue -Product $Product -Name 'productNumber' -Value $number
    Set-ProductRecordValue -Product $Product -Name 'partNumber' -Value $number
  }
  Set-ProductRecordValue -Product $Product -Name 'name' -Value $name
  Set-ProductRecordValue -Product $Product -Name 'productName' -Value $name
  Set-ProductRecordValue -Product $Product -Name 'category' -Value $category
  Set-ProductRecordValue -Product $Product -Name 'subcategory' -Value ([string](Get-ProductRecordValue -Product $Product -Name 'subcategory'))
  Set-ProductRecordValue -Product $Product -Name 'brand' -Value $brand
  Set-ProductRecordValue -Product $Product -Name 'vehicleModel' -Value $vehicleModel
  Set-ProductRecordValue -Product $Product -Name 'engineModel' -Value ([string](Get-ProductRecordValue -Product $Product -Name 'engineModel'))
  Set-ProductRecordValue -Product $Product -Name 'oeNumber' -Value ([string](Get-ProductRecordValue -Product $Product -Name 'oeNumber'))
  Set-ProductRecordValue -Product $Product -Name 'specification' -Value $specification
  Set-ProductRecordValue -Product $Product -Name 'searchableText' -Value (ConvertTo-ProductSearchableText -Product $Product)

  return $Product
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
    [AllowNull()][string]$UniqueSuffix,
    [switch]$ReuseExisting,
    [switch]$DryRun
  )

  $imageDir = Join-Path $ProjectRoot 'assets\img\products'
  if (-not (Test-Path -LiteralPath $imageDir)) {
    New-Item -ItemType Directory -Force -Path $imageDir | Out-Null
  }

  $stem = ConvertTo-SafeFileStem $ProductNumber
  if ([string]::IsNullOrWhiteSpace($stem)) {
    $stem = 'product-image'
  }
  $extension = $SourceFile.Extension.ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($extension)) { $extension = '.jpg' }

  $target = Join-Path $imageDir "$stem$extension"
  if (Test-Path -LiteralPath $target) {
    $suffix = if (-not [string]::IsNullOrWhiteSpace($UniqueSuffix)) {
      (($UniqueSuffix -replace '[^A-Za-z0-9]', '').ToUpperInvariant())
    } else {
      ([guid]::NewGuid().ToString('N').Substring(0, 8).ToUpperInvariant())
    }
    if ($suffix.Length -gt 12) { $suffix = $suffix.Substring(0, 12) }
    $candidateStem = "$stem-$suffix"
    $target = Join-Path $imageDir "$candidateStem$extension"

    if ($ReuseExisting -and (Test-Path -LiteralPath $target -PathType Leaf)) {
      return [ordered]@{
        FullPath = $target
        RelativePath = (Get-RelativeProjectPath -ProjectRoot $ProjectRoot -Path $target)
      }
    }

    $counter = 2
    while (Test-Path -LiteralPath $target) {
      $target = Join-Path $imageDir "$candidateStem-$counter$extension"
      $counter++
    }
  }

  if (-not $DryRun) {
    Copy-Item -LiteralPath $SourceFile.FullName -Destination $target
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
      Set-ProductRecordValue -Product $ExistingProduct -Name 'brand' -Value (Get-CanonicalProductBrand ([string]$Parsed.Brand))
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

function Test-ProductPublishable {
  param([Parameter(Mandatory)]$Product)

  $needsManualReview = Get-ProductRecordValue -Product $Product -Name 'needsManualReview'
  if ($needsManualReview -eq $true -or [string]$needsManualReview -eq 'true') {
    return $false
  }

  foreach ($field in @('id', 'number', 'productNumber', 'partNumber')) {
    $value = [string](Get-ProductRecordValue -Product $Product -Name $field)
    if ($value -match '^REVIEW-') {
      return $false
    }
  }

  $status = [string](Get-ProductRecordValue -Product $Product -Name 'status')
  $archived = Get-ProductRecordValue -Product $Product -Name 'archived'
  if ($status -match '^Archived$' -or $archived -eq $true -or [string]$archived -eq 'true') {
    return $false
  }

  return $true
}

function Save-ProductStore {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$Products,
    [Parameter(Mandatory)][hashtable]$RunSummary,
    [switch]$DryRun
  )

  $paths = Get-ProductDataPaths -ProjectRoot $ProjectRoot
  $publishableProducts = @($Products | Where-Object { Test-ProductPublishable -Product $_ })
  $compatibleProducts = @($publishableProducts | ForEach-Object { Update-ProductCompatibilityFields -Product $_ })
  $sortedProducts = @($compatibleProducts | Sort-Object -Property category, name, number)
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
    skippedProducts = if ($RunSummary.ContainsKey('Skipped')) { [int]$RunSummary.Skipped } else { 0 }
    needsReview = [int]$RunSummary.Review
    cleanedSourceRecords = if ($RunSummary.ContainsKey('Cleaned')) { [int]$RunSummary.Cleaned } else { 0 }
    archivedThisRun = if ($RunSummary.ContainsKey('Archived')) { [int]$RunSummary.Archived } else { 0 }
    duplicateProductsMerged = if ($RunSummary.ContainsKey('DuplicatesMerged')) { [int]$RunSummary.DuplicatesMerged } else { 0 }
    searchIndexRebuilt = if ($RunSummary.ContainsKey('SearchIndexRebuilt')) { [bool]$RunSummary.SearchIndexRebuilt } else { $true }
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

function Save-ProductArchiveStore {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$Products,
    [switch]$DryRun
  )

  $paths = Get-ProductDataPaths -ProjectRoot $ProjectRoot
  $sortedProducts = @($Products | Sort-Object -Property brand, category, name, number)
  if ($sortedProducts.Count -eq 0) {
    $json = '[]'
  } else {
    $json = ConvertTo-Json -InputObject @($sortedProducts) -Depth 30
  }

  if (-not $DryRun) {
    $json | Set-Content -LiteralPath $paths.ArchiveJson -Encoding UTF8
  }

  return [ordered]@{
    Json = $paths.ArchiveJson
    Count = $sortedProducts.Count
  }
}
