Set-StrictMode -Version Latest

function Get-CatalogueJsonPath {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  return Join-Path $ProjectRoot 'assets\data\catalogue.json'
}

function Read-CatalogueConfig {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  $path = Get-CatalogueJsonPath -ProjectRoot $ProjectRoot
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Catalogue configuration not found: $path"
  }

  try {
    $raw = Get-Content -LiteralPath $path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
      throw 'Catalogue configuration is empty.'
    }

    $catalogue = $raw | ConvertFrom-Json
    if ($null -eq $catalogue -or $null -eq $catalogue.categories) {
      throw 'Catalogue configuration must contain a categories array.'
    }

    return $catalogue
  } catch {
    throw "Could not read catalogue configuration: $path. $($_.Exception.Message)"
  }
}

function Get-CatalogueCategories {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  $catalogue = Read-CatalogueConfig -ProjectRoot $ProjectRoot
  return @($catalogue.categories)
}

function Get-CatalogueCategorySlugs {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  return @(
    Get-CatalogueCategories -ProjectRoot $ProjectRoot |
      ForEach-Object { [string]$_.slug } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  )
}

function Test-CatalogueCategorySlug {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [AllowNull()][string]$Category
  )

  if ([string]::IsNullOrWhiteSpace($Category)) { return $false }

  $slugs = @(Get-CatalogueCategorySlugs -ProjectRoot $ProjectRoot)
  return $slugs -contains $Category
}

function Get-CatalogueKnownBrands {
  param([Parameter(Mandatory)][string]$ProjectRoot)

  $brands = New-Object System.Collections.Generic.List[string]
  foreach ($category in Get-CatalogueCategories -ProjectRoot $ProjectRoot) {
    if ($null -eq $category.products) { continue }

    foreach ($product in @($category.products)) {
      $brand = [string]$product.brand
      if (-not [string]::IsNullOrWhiteSpace($brand) -and -not $brands.Contains($brand)) {
        $brands.Add($brand) | Out-Null
      }
    }
  }

  return @($brands)
}
