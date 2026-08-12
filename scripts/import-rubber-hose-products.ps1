param(
  [switch]$DryRun,
  [switch]$ForceOcr
)

Set-StrictMode -Version Latest

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$SourceFolder = Join-Path $ProjectRoot 'Rubber Hose'
$TempDir = Join-Path $ProjectRoot 'tmp'
$CandidatePath = Join-Path $TempDir 'rubber-hose-import-candidates.json'
$OcrCachePath = Join-Path $TempDir 'rubber-hose-ocr-cache.json'
$ApplyScript = Join-Path $ProjectRoot 'scripts\apply-rubber-hose-import.js'

. (Join-Path $ProjectRoot 'scripts\importer\WindowsOcr.ps1')
. (Join-Path $ProjectRoot 'scripts\importer\ProductParser.ps1')

function Convert-RubberDigitRun {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return ([string]$Value).ToUpperInvariant().Replace('O', '0').Replace('I', '1').Replace('L', '1').Replace('N', '1')
}

function Convert-RubberDigitGroup {
  param(
    [AllowNull()][string]$Value,
    [int]$ExpectedLength
  )

  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $raw = ([string]$Value).ToUpperInvariant()
  $expanded = $raw.Replace('O', '0').Replace('I', '1').Replace('L', '1').Replace('N', '11')
  $expanded = $expanded -replace '[^0-9]', ''
  if ($ExpectedLength -gt 0 -and $expanded.Length -lt $ExpectedLength) {
    $expanded = $expanded.PadLeft($ExpectedLength, '0')
  }
  if ($ExpectedLength -gt 0 -and $expanded.Length -gt $ExpectedLength) {
    $expanded = $expanded.Substring(0, $ExpectedLength)
  }
  return $expanded
}

function Convert-RubberPrefix {
  param([AllowNull()][string]$Prefix)
  $value = ([string]$Prefix).ToUpperInvariant()
  if ($value -match '^(WC|WE|W6)$') { return 'WG' }
  if ($value -eq 'VC') { return 'VG' }
  return $value
}

function Get-RubberProductCode {
  param(
    [Parameter(Mandatory)][string]$Text,
    [AllowNull()][string]$ParsedNumber
  )

  $cleanText = ConvertTo-CleanOcrText $Text
  $standard = [regex]::Match($cleanText, '(?<![A-Z0-9])(?<prefix>WG|WC|WE|W6|VG|VC|AZ|DZ|NZ)[-.\s]?(?<a>[0-9OILN]{3})[-.\s]?(?<b>[0-9OILN]{2,3})[-.\s]?(?<c>[0-9OILN]{3,4})(?:\s*[/\\-]\s*(?<s>[0-9OILN]{1,3}))?(?![A-Z0-9])', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($standard.Success) {
    $prefix = Convert-RubberPrefix $standard.Groups['prefix'].Value
    $a = Convert-RubberDigitGroup -Value $standard.Groups['a'].Value -ExpectedLength 3
    $b = Convert-RubberDigitGroup -Value $standard.Groups['b'].Value -ExpectedLength 3
    $c = Convert-RubberDigitGroup -Value $standard.Groups['c'].Value -ExpectedLength 4
    $code = "$prefix-$a-$b-$c"
    if ($standard.Groups['s'].Success) {
      $code = "$code/$(Convert-RubberDigitRun $standard.Groups['s'].Value)"
    }
    return $code
  }

  $dimension = [regex]::Match($cleanText, '(?<![A-Z0-9])(?<a>\d{2,3})\s*[Xx]\s*(?<b>\d{2,3})\s*[Xx]\s*(?<c>\d{2,3})(?:\s*[Xx]\s*(?<d>\d{1,3}))?\s*[- ]?(?<suffix>XS|HT)(?![A-Z0-9])', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($dimension.Success) {
    $tail = if ($dimension.Groups['d'].Success) { "X$($dimension.Groups['d'].Value)" } else { '' }
    return "$($dimension.Groups['a'].Value)X$($dimension.Groups['b'].Value)X$($dimension.Groups['c'].Value)$tail-$($dimension.Groups['suffix'].Value.ToUpperInvariant())"
  }

  $numberSuffix = [regex]::Match($cleanText, '(?<![A-Z0-9])(?<n>\d{7,12})(?:[-\s](?<extra>\d))?[-\s]?(?<suffix>HT|XS)(?![A-Z0-9])', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($numberSuffix.Success) {
    $extra = if ($numberSuffix.Groups['extra'].Success) { "-$($numberSuffix.Groups['extra'].Value)" } else { '' }
    return "$($numberSuffix.Groups['n'].Value)$extra-$($numberSuffix.Groups['suffix'].Value.ToUpperInvariant())"
  }

  $htPrefix = [regex]::Match($cleanText, '(?<![A-Z0-9])HT\s*(?<n>\d{4,5}[A-Z]?)(?![A-Z0-9])', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($htPrefix.Success) {
    return "HT$($htPrefix.Groups['n'].Value.ToUpperInvariant())"
  }

  if (-not [string]::IsNullOrWhiteSpace($ParsedNumber)) {
    return [string]$ParsedNumber
  }

  return ''
}

function Get-RubberProductName {
  param(
    [Parameter(Mandatory)][array]$Lines,
    [Parameter(Mandatory)][string]$Text
  )

  foreach ($line in @($Lines)) {
    $lineText = ConvertTo-CleanOcrText ([string]$line.Text)
    $lineText = $lineText -replace '\bDAWN\b', 'DAYUN'
    $lineText = $lineText -replace '\bDAYI-JN\b', 'DAYUN'
    if ($lineText -match '\bRUBBER\s+HOSE\b') {
      $name = ($lineText -replace '(?<![A-Z0-9])(?:WG|WC|WE|W6|VG|VC|AZ|DZ|NZ)[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}(?:\s*[/\\-]\s*\d{1,3})?(?![A-Z0-9])', '').Trim()
      if (-not [string]::IsNullOrWhiteSpace($name)) { return $name }
    }
  }

  foreach ($line in @($Lines)) {
    $lineText = ConvertTo-CleanOcrText ([string]$line.Text)
    $lineText = $lineText -replace '\bDAWN\b', 'DAYUN'
    $lineText = $lineText -replace '\bDAYI-JN\b', 'DAYUN'
    if ($lineText -match '\bHOSE\b' -and $lineText -match '\bRUBBER\b') {
      $name = ($lineText -replace '(?<![A-Z0-9])(?:WG|WC|WE|W6|VG|VC|AZ|DZ|NZ)[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}(?:\s*[/\\-]\s*\d{1,3})?(?![A-Z0-9])', '').Trim()
      if (-not [string]::IsNullOrWhiteSpace($name)) { return $name }
    }
  }

  $cleanText = ConvertTo-CleanOcrText $Text
  if ($cleanText -match '\bINTERCOOLER\b') { return 'INTERCOOLER RUBBER HOSE' }
  if ($cleanText -match '\bHOSE\b') { return 'RUBBER HOSE' }
  return ''
}

function Add-UniqueText {
  param(
    [Parameter(Mandatory)][object]$Target,
    [AllowNull()][string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  $clean = ([string]$Value -replace '\s+', ' ').Trim()
  foreach ($existing in $Target) {
    if ($existing.ToUpperInvariant() -eq $clean.ToUpperInvariant()) { return }
  }
  $Target.Add($clean) | Out-Null
}

function Get-RubberBrand {
  param([Parameter(Mandatory)][string]$Text)
  $cleanText = ConvertTo-CleanOcrText $Text
  $brandRules = @(
    @{ Pattern = '\bYUNLI\b'; Value = 'YUNLI' },
    @{ Pattern = '\bFUTZSU\b'; Value = 'FUTZSU' },
    @{ Pattern = '\bUNIEURO\b|\bUNI\s*EURO\b'; Value = 'UNIEURO' },
    @{ Pattern = '\bTWINKLE\b'; Value = 'TWINKLE' },
    @{ Pattern = '\bSORL\b'; Value = 'SORL' },
    @{ Pattern = '\bASHINO\b'; Value = 'ASHINO' },
    @{ Pattern = '\bHUATAI\b|\bHUATAU\b'; Value = 'Huatai' },
    @{ Pattern = '\bXIN\s*SENG\b|\bXINSENG\b'; Value = 'XIN SENG' }
  )
  foreach ($rule in $brandRules) {
    if ($cleanText -match $rule.Pattern) { return [string]$rule.Value }
  }
  return ''
}

function Get-RubberVehicleModels {
  param(
    [Parameter(Mandatory)][string]$Text,
    [AllowNull()][array]$ParsedVehicles
  )

  $models = [System.Collections.Generic.List[string]]::new()
  foreach ($vehicle in @($ParsedVehicles)) { Add-UniqueText -Target $models -Value ([string]$vehicle) }
  $cleanText = ConvertTo-CleanOcrText $Text
  $vehicleRules = @(
    @{ Pattern = '\bHOWO(?:\d{2,4})?\b'; Value = 'HOWO' },
    @{ Pattern = '\bSINOTRUK\b|\bCNHTC\b'; Value = 'SINOTRUK HOWO' },
    @{ Pattern = '\bSITRAK\b'; Value = 'SITRAK' },
    @{ Pattern = '\bSHACMAN\b|\bSHAANXI\b'; Value = 'SHACMAN' },
    @{ Pattern = '\bFAW\b|\bJIEFANG\b'; Value = 'FAW' },
    @{ Pattern = '\bFOTON\b|\bAUMAN\b'; Value = 'FOTON' },
    @{ Pattern = '\bJAC\b'; Value = 'JAC' },
    @{ Pattern = '\bDONG\s*FENG\b|\bDONGFENG\b'; Value = 'DONGFENG' },
    @{ Pattern = '\bCAMC\b'; Value = 'CAMC' },
    @{ Pattern = '\bDAYUN\b|\bDAYI-JN\b|\bDAWN\b'; Value = 'DAYUN' },
    @{ Pattern = '\bHINO\b'; Value = 'HINO' },
    @{ Pattern = '\bISUZU\b'; Value = 'ISUZU' },
    @{ Pattern = '\bFUSO\b'; Value = 'FUSO' },
    @{ Pattern = '\bNISSAN\b|\bUD\b'; Value = 'NISSAN UD' }
  )
  foreach ($rule in $vehicleRules) {
    if ($cleanText -match $rule.Pattern) { Add-UniqueText -Target $models -Value ([string]$rule.Value) }
  }
  return @($models.ToArray())
}

function Get-RubberEngineModels {
  param(
    [Parameter(Mandatory)][string]$Text,
    [AllowNull()][array]$ParsedEngines
  )

  $models = [System.Collections.Generic.List[string]]::new()
  foreach ($engine in @($ParsedEngines)) { Add-UniqueText -Target $models -Value ([string]$engine) }
  $cleanText = ConvertTo-CleanOcrText $Text
  foreach ($match in [regex]::Matches($cleanText, '\b(?:WD|WP|YC|J08E|6D16|6D22|6M70|10PE1|GE13)[A-Z0-9-]*\b')) {
    Add-UniqueText -Target $models -Value $match.Value
  }
  return @($models.ToArray())
}

function Get-RubberSpecifications {
  param([Parameter(Mandatory)][string]$Text)

  $cleanText = ConvertTo-CleanOcrText $Text
  $specs = [ordered]@{}
  $labels = [System.Collections.Generic.List[string]]::new()

  function Add-SpecValue {
    param([string]$Name, [string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    $cleanValue = ($Value -replace '\s+', ' ').Trim()
    if (-not $specs.Contains($Name)) { $specs[$Name] = @() }
    if (@($specs[$Name]) -notcontains $cleanValue) { $specs[$Name] = @($specs[$Name]) + $cleanValue }
    Add-UniqueText -Target $labels -Value "$Name $cleanValue"
  }

  foreach ($match in [regex]::Matches($cleanText, '\bID\s*([0-9]{1,4}(?:\.[0-9]+)?)\s*(?:MM)?\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    Add-SpecValue -Name 'ID' -Value "$($match.Groups[1].Value) mm"
  }
  foreach ($match in [regex]::Matches($cleanText, '\bOD\s*([0-9]{1,4}(?:\.[0-9]+)?)\s*(?:MM)?\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    Add-SpecValue -Name 'OD' -Value "$($match.Groups[1].Value) mm"
  }
  foreach ($match in [regex]::Matches($cleanText, '\b(?:L|LENGTH)\s*([0-9]{1,4}(?:\.[0-9]+)?)\s*(?:MM)?\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    Add-SpecValue -Name 'Length' -Value "$($match.Groups[1].Value) mm"
  }
  foreach ($match in [regex]::Matches($cleanText, '\b([0-9]{2,3})\s*[Xx]\s*([0-9]{2,3})\s*[Xx]\s*([0-9]{2,3})(?:\s*[Xx]\s*([0-9]{1,3}))?\b')) {
    $tail = if ($match.Groups[4].Success) { " x $($match.Groups[4].Value)" } else { '' }
    Add-SpecValue -Name 'Hose Size' -Value "$($match.Groups[1].Value) x $($match.Groups[2].Value) x $($match.Groups[3].Value)$tail"
  }
  foreach ($match in [regex]::Matches($cleanText, '\b(HOSE\s+CLIP|CLIP|CONNECTOR|FITTING|ELBOW|BEND)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    Add-SpecValue -Name 'Connector / Fitting' -Value $match.Value
  }
  foreach ($match in [regex]::Matches($cleanText, '\b(RED|BLUE|BLACK|SILICONE)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    Add-SpecValue -Name 'Other' -Value $match.Value
  }

  return [ordered]@{
    Specifications = $specs
    Labels = @($labels.ToArray())
  }
}

function Join-Description {
  param(
    [Parameter(Mandatory)][string]$Name,
    [AllowNull()][array]$SpecLabels
  )

  $parts = [System.Collections.Generic.List[string]]::new()
  Add-UniqueText -Target $parts -Value $Name
  $limitedSpecs = @($SpecLabels | Select-Object -First 6)
  if ($limitedSpecs.Count -gt 0) {
    Add-UniqueText -Target $parts -Value (($limitedSpecs -join ', ') + '.')
  }
  return (($parts.ToArray()) -join '. ') -replace '\.\.', '.'
}

if (-not (Test-Path -LiteralPath $SourceFolder -PathType Container)) {
  throw "Rubber Hose folder not found: $SourceFolder"
}
if (-not (Test-Path -LiteralPath $TempDir)) {
  New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
}

$files = @(Get-ChildItem -LiteralPath $SourceFolder -File |
  Where-Object { $_.Extension -match '^\.(jpe?g|png|webp)$' } |
  Sort-Object Name)

$cache = Read-OcrCache -CachePath $OcrCachePath
$candidates = [System.Collections.Generic.List[object]]::new()

foreach ($file in $files) {
  Write-Host ("OCR Rubber Hose: {0}" -f $file.Name)
  $ocr = Get-CachedImageOcr -File $file -Cache $cache -Force:$ForceOcr
  $parsed = Parse-ProductOcr -Text ([string]$ocr.Text) -Lines @($ocr.Lines) -SourceFile $file.Name -BrandHint '' -RecognitionContext $null
  $code = Get-RubberProductCode -Text ([string]$ocr.Text) -ParsedNumber ([string]$parsed.ProductNumber)
  $name = Get-RubberProductName -Lines @($ocr.Lines) -Text ([string]$ocr.Text)
  $brand = Get-RubberBrand -Text ([string]$ocr.Text)
  $vehicles = @(Get-RubberVehicleModels -Text ([string]$ocr.Text) -ParsedVehicles @($parsed.VehicleModels))
  $engines = @(Get-RubberEngineModels -Text ([string]$ocr.Text) -ParsedEngines @($parsed.EngineModels))
  $specResult = Get-RubberSpecifications -Text ([string]$ocr.Text)
  $specLabels = @($specResult.Labels)
  $warnings = [System.Collections.Generic.List[string]]::new()
  foreach ($warning in @($parsed.Warnings)) {
    if (-not [string]::IsNullOrWhiteSpace($name) -and [string]$warning -match 'Product name could not be identified') { continue }
    Add-UniqueText -Target $warnings -Value ([string]$warning)
  }
  if ([string]::IsNullOrWhiteSpace($code)) { Add-UniqueText -Target $warnings -Value 'Missing Product Code.' }
  if ([string]::IsNullOrWhiteSpace($name)) {
    Add-UniqueText -Target $warnings -Value 'Missing Product Name / Description.'
    $name = 'RUBBER HOSE'
  }
  if ($parsed.Confidence -lt 70) { Add-UniqueText -Target $warnings -Value "Low OCR confidence: $($parsed.Confidence)." }

  $needsReview = ([string]::IsNullOrWhiteSpace($code) -or $parsed.Confidence -lt 70)
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $relativePath = "Rubber Hose/$($file.Name)"
  $description = Join-Description -Name $name -SpecLabels $specLabels
  $keywords = @('rubber hose', 'rubber-hose', 'truck rubber hose', 'heavy-duty truck rubber hose', $name, $brand) + $vehicles + $engines + $specLabels

  $candidates.Add([ordered]@{
    sourceFile = $file.Name
    sourcePath = $relativePath
    sourceRelativePath = $relativePath
    hash = $hash
    productCode = $code
    productName = $name
    brand = $brand
    description = $description
    visibleDescription = $name
    vehicleModels = $vehicles
    engineModels = $engines
    oeNumbers = @($parsed.OeNumbers)
    alternateNumbers = @($parsed.AlternateNumbers)
    specifications = $specResult.Specifications
    specLabels = $specLabels
    keywords = @($keywords | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -Unique)
    ocrText = [string]$ocr.Text
    cleanText = ConvertTo-CleanOcrText ([string]$ocr.Text)
    confidence = [int]([math]::Max([int]$parsed.Confidence, $(if ([string]::IsNullOrWhiteSpace($code)) { 0 } else { 86 })))
    needsReview = [bool]$needsReview
    warnings = @($warnings.ToArray())
  }) | Out-Null
}

Save-OcrCache -Cache $cache -CachePath $OcrCachePath
$candidates | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $CandidatePath -Encoding UTF8

$node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $node -PathType Leaf)) {
  $node = 'node'
}

$args = @($ApplyScript, '--candidates', ($CandidatePath.Substring($ProjectRoot.Path.Length + 1)))
if ($DryRun) { $args += '--dry-run' }
& $node @args
