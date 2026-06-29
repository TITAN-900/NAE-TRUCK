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
    (Join-Path $sourceRoot 'reports').ToLowerInvariant()
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
