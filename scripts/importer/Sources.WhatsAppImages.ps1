Set-StrictMode -Version Latest

function Get-WhatsAppImageItems {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [string]$RelativeFolder = 'whatsapp-import'
  )

  $sourceRoot = Join-Path $ProjectRoot $RelativeFolder
  if (-not (Test-Path -LiteralPath $sourceRoot)) {
    throw "WhatsApp import folder not found: $sourceRoot"
  }

  $imageExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff')
  $excludedFolders = @(
    (Join-Path $sourceRoot 'review').ToLowerInvariant(),
    (Join-Path $sourceRoot 'reports').ToLowerInvariant(),
    (Join-Path $sourceRoot '.ocr-cache').ToLowerInvariant()
  )

  Get-ChildItem -LiteralPath $sourceRoot -File -Recurse |
    Where-Object {
      $extension = $_.Extension.ToLowerInvariant()
      if ($imageExtensions -notcontains $extension) { return $false }

      $directory = $_.DirectoryName.ToLowerInvariant()
      foreach ($excluded in $excludedFolders) {
        if ($directory.StartsWith($excluded)) { return $false }
      }

      return $true
    } |
    Sort-Object FullName |
    ForEach-Object {
      [ordered]@{
        SourceType = 'whatsapp-image'
        File = $_
        RelativePath = Get-RelativeProjectPath -ProjectRoot $ProjectRoot -Path $_.FullName
      }
    }
}

function Test-CatalogSyncBrandFolderName {
  param([AllowNull()][string]$Name)

  if ([string]::IsNullOrWhiteSpace($Name)) { return $false }

  $trimmed = ([string]$Name).Trim()
  if ($trimmed.StartsWith('.')) { return $false }
  if ($trimmed -match '^(?i:review|reports)$') { return $false }
  if ($trimmed -notmatch '[A-Za-z]') { return $false }

  return $true
}

function Get-CatalogSyncBrandFolders {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [string]$RelativeFolder = 'whatsapp-import'
  )

  $sourceRoot = Join-Path $ProjectRoot $RelativeFolder
  if (-not (Test-Path -LiteralPath $sourceRoot)) {
    throw "WhatsApp import folder not found: $sourceRoot"
  }

  Get-ChildItem -LiteralPath $sourceRoot -Directory |
    Where-Object { Test-CatalogSyncBrandFolderName -Name $_.Name } |
    Sort-Object Name |
    ForEach-Object {
      [ordered]@{
        FolderName = $_.Name
        FullPath = $_.FullName
        RelativePath = Get-RelativeProjectPath -ProjectRoot $ProjectRoot -Path $_.FullName
      }
    }
}

function Get-RelativeProjectPath {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][string]$Path
  )

  $root = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\', '/')
  $full = [System.IO.Path]::GetFullPath($Path)
  if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $full.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/'
  }
  return $full -replace '\\', '/'
}
