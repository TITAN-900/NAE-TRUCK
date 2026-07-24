[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [string]$WhatsAppFolder = 'whatsapp-import',
  [switch]$DryRun,
  [switch]$ForceOcr,
  [switch]$SkipArchiveMissing
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$importer = Join-Path $PSScriptRoot 'import-whatsapp-products.ps1'

& $importer `
  -ProjectRoot $ProjectRoot `
  -WhatsAppFolder $WhatsAppFolder `
  -SyncCatalog `
  -DryRun:$DryRun `
  -ForceOcr:$ForceOcr `
  -SkipArchiveMissing:$SkipArchiveMissing
