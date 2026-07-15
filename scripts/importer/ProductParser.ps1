Set-StrictMode -Version Latest

function ConvertTo-CleanOcrText {
  param([AllowNull()][string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) { return '' }

  $value = $Text.ToUpperInvariant()
  $value = $value.Replace([string][char]0x2013, '-')
  $value = $value.Replace([string][char]0x2014, '-')
  $value = $value.Replace([string][char]0x2212, '-')
  $value = $value.Replace([string][char]0x201C, '"')
  $value = $value.Replace([string][char]0x201D, '"')
  $value = $value.Replace([string][char]0x2018, "'")
  $value = $value.Replace([string][char]0x2019, "'")
  $value = $value.Replace([string][char]0x00B7, '-')
  $value = $value.Replace([string][char]0xFF0E, '.')
  $value = $value.Replace([string][char]0x3002, '.')
  $value = $value.Replace([string][char]0x4E00, '-')
  return ($value -replace '\s+', ' ').Trim()
}

function ConvertTo-NumberSearchText {
  param([AllowNull()][string]$Text)

  $value = ConvertTo-CleanOcrText $Text
  $value = $value -replace '(?<=[A-Z0-9])\s*[.-]\s*(?=[A-Z0-9])', '-'
  $value = $value -replace '\s+', ' '
  return $value.Trim()
}

function Normalize-ProductNumber {
  param([AllowNull()][string]$Number)

  if ([string]::IsNullOrWhiteSpace($Number)) { return '' }

  $value = ConvertTo-CleanOcrText $Number
  $value = $value -replace '\s*-\s*', '-'
  $value = $value -replace '[^A-Z0-9-]', ''
  $value = $value.Trim('-')
  return $value
}

function ConvertTo-SafeFileStem {
  param([Parameter(Mandatory)][string]$Value)

  $safe = Normalize-ProductNumber $Value
  $safe = $safe -replace '[\\/:*?"<>|]', '-'
  $safe = $safe -replace '-{2,}', '-'
  return $safe.Trim('-')
}

function Get-ProductNameFromText {
  param([Parameter(Mandatory)][string]$Text)

  $nameRules = @(
    @{ Pattern = '\bFLY\s*WHEEL\b|\bFLYWHEEL\b'; Name = 'Flywheel'; Category = 'clutch-system' },
    @{ Pattern = '\bCLUTCH\s+DISC\b|\bCLUTCH\s+PLATE\b|\bCLUTCH\s+COVER\b'; Name = 'Clutch Disc Assembly'; Category = 'clutch-system' },
    @{ Pattern = '\bPRESSURE\s+PLATE\b'; Name = 'Clutch Pressure Plate'; Category = 'clutch-system' },
    @{ Pattern = '\bRELEASE\s+BEARING\b'; Name = 'Release Bearing'; Category = 'clutch-system' },
    @{ Pattern = '\bCLUTCH\s+BOOSTER\b'; Name = 'Clutch Booster'; Category = 'clutch-system' },
    @{ Pattern = '\bBRAKE\s+LINING\b'; Name = 'Brake Lining Set'; Category = 'brake-system' },
    @{ Pattern = '\bBRAKE\s+CHAMBER\b|\bSPRING\s+BRAKE\b'; Name = 'Spring Brake Chamber'; Category = 'brake-system' },
    @{ Pattern = '\bAIR\s+DRYER\b'; Name = 'Air Dryer Assembly'; Category = 'brake-system' },
    @{ Pattern = '\bRELAY\s+VALVE\b|\bBRAKE\s+VALVE\b'; Name = 'Brake Valve'; Category = 'brake-system' },
    @{ Pattern = '\bBRAKE\s+DRUM\b'; Name = 'Brake Drum'; Category = 'brake-system' },
    @{ Pattern = '\bLEAF\s+SPRING\b'; Name = 'Leaf Spring'; Category = 'suspension-system' },
    @{ Pattern = '\bTORQUE\s+ROD\b'; Name = 'Torque Rod Assembly'; Category = 'suspension-system' },
    @{ Pattern = '\bSHOCK\s+ABSORBER\b|\bABSORBER\b'; Name = 'Shock Absorber'; Category = 'suspension-system' },
    @{ Pattern = '\bAIR\s+SPRING\b|\bBELLOWS\b'; Name = 'Air Spring Bellows'; Category = 'suspension-system' },
    @{ Pattern = '\bRADIATOR\b'; Name = 'Radiator Assembly'; Category = 'cooling-system' },
    @{ Pattern = '\bWATER\s*PUMP\b'; Name = 'Engine Water Pump'; Category = 'cooling-system' },
    @{ Pattern = '\bFAN\s+CLUTCH\b'; Name = 'Fan Clutch'; Category = 'cooling-system' },
    @{ Pattern = '\bTHERMOSTAT\b'; Name = 'Thermostat Kit'; Category = 'cooling-system' },
    @{ Pattern = '\bSTARTER\b|\bSTARTING\s+MOTOR\b'; Name = 'Starter Motor'; Category = 'electrical-system' },
    @{ Pattern = '\bALTERNATOR\b'; Name = 'Alternator Assembly'; Category = 'electrical-system' },
    @{ Pattern = '\bSENSOR\b'; Name = 'Sensor'; Category = 'electrical-system' },
    @{ Pattern = '\bSWITCH\b'; Name = 'Switch'; Category = 'electrical-system' },
    @{ Pattern = '\bSTEERING\s+PUMP\b'; Name = 'Power Steering Pump'; Category = 'steering-system' },
    @{ Pattern = '\bDRAG\s+LINK\b'; Name = 'Drag Link Assembly'; Category = 'steering-system' },
    @{ Pattern = '\bTIE\s*ROD\b'; Name = 'Tie Rod End'; Category = 'steering-system' },
    @{ Pattern = '\bKINGPIN\s+REPAIR\b|\bKING\s*PIN\s+REPAIR\b'; Name = 'Kingpin Repair Kit'; Category = 'steering-system' },
    @{ Pattern = '\bGEARBOX\b|\bTRANSMISSION\b'; Name = 'Transmission Part'; Category = 'transmission-parts' },
    @{ Pattern = '\bSYNCHRO\b|\bSYNCHRONI[ZS]ER\b'; Name = 'Synchroniser Assembly'; Category = 'transmission-parts' },
    @{ Pattern = '\bAXLE\s+SHAFT\b'; Name = 'Axle Shaft'; Category = 'axle-parts' },
    @{ Pattern = '\bWHEEL\s+HUB\b|\bHUB\s+ASSEMBLY\b'; Name = 'Wheel Hub Assembly'; Category = 'axle-parts' },
    @{ Pattern = '\bDIFFERENTIAL\b'; Name = 'Differential Gear Set'; Category = 'axle-parts' },
    @{ Pattern = '\bLANDING\s+GEAR\b'; Name = 'Landing Gear Set'; Category = 'trailer-parts' },
    @{ Pattern = '\bTWIST\s+LOCK\b'; Name = 'Twist Lock Assembly'; Category = 'trailer-parts' },
    @{ Pattern = '\bSLACK\s+ADJUSTER\b'; Name = 'Slack Adjuster'; Category = 'trailer-parts' },
    @{ Pattern = '\bKING\s*PIN\b|\bKINGPIN\b'; Name = 'Kingpin Assembly'; Category = 'trailer-parts' }
  )

  foreach ($rule in $nameRules) {
    if ($Text -match $rule.Pattern) {
      return [ordered]@{
        Name = $rule.Name
        Category = $rule.Category
      }
    }
  }

  return [ordered]@{
    Name = ''
    Category = ''
  }
}

function Get-VehicleBrandFromText {
  param([Parameter(Mandatory)][string]$Text)

  $brandRules = @(
    @{ Pattern = '\bSINOTRUK\b|\bHOWO\b|\bCNHTC\b'; Brand = 'SINOTRUK HOWO' },
    @{ Pattern = '\bSHACMAN\b|\bSHAANXI\b'; Brand = 'SHACMAN' },
    @{ Pattern = '\bFAW\b|\bJIEFANG\b'; Brand = 'FAW' },
    @{ Pattern = '\bDONG\s*FENG\b|\bDONGFENG\b|\bDFM\b'; Brand = 'DONGFENG' },
    @{ Pattern = '\bFOTON\b|\bAUMAN\b'; Brand = 'FOTON' },
    @{ Pattern = '\bJAC\b|\bJAC\s+HEAVY\b'; Brand = 'JAC HEAVY' },
    @{ Pattern = '\bTRAILER\b|\bSEMI\s*TRAILER\b|\bCONTAINER\s+HAULER\b'; Brand = 'Trailer' }
  )

  foreach ($rule in $brandRules) {
    $match = [regex]::Match($Text, $rule.Pattern)
    if ($match.Success) {
      return [ordered]@{
        Brand = [string]$rule.Brand
        Evidence = $match.Value
      }
    }
  }

  return [ordered]@{
    Brand = ''
    Evidence = ''
  }
}

function Get-ProductNumberCandidates {
  param(
    [Parameter(Mandatory)][string]$Text,
    [Parameter(Mandatory)][array]$Lines
  )

  $candidatePatterns = @(
    '(?<![A-Z0-9])\d-[A-Z0-9]{4,6}-[A-Z0-9]{3,6}(?:-[A-Z0-9])?(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{4,6}-[A-Z0-9]{3,6}(?:-[A-Z0-9]{1,12})?(?![A-Z0-9])',
    '(?<![A-Z0-9])ME\s*0?\d{5,6}(?![A-Z0-9])',
    '(?<![A-Z0-9])EW-[A-Z0-9]{3,8}-[A-Z0-9]{1,4}(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{9,12}(?![A-Z0-9])'
  )

  $candidates = @{}
  for ($lineIndex = 0; $lineIndex -lt $Lines.Count; $lineIndex++) {
    $lineText = ConvertTo-NumberSearchText ([string]$Lines[$lineIndex].Text)
    foreach ($pattern in $candidatePatterns) {
      foreach ($match in [regex]::Matches($lineText, $pattern)) {
        $normalized = Normalize-ProductNumber $match.Value
        if ([string]::IsNullOrWhiteSpace($normalized)) { continue }
        if (-not $candidates.ContainsKey($normalized)) {
          $candidates[$normalized] = [ordered]@{
            Number = $normalized
            LineIndex = $lineIndex
            LineText = $lineText
            Score = 0
            Warnings = New-Object System.Collections.Generic.List[string]
          }
        }
      }
    }
  }

  if ($candidates.Count -eq 0) {
    $searchText = ConvertTo-NumberSearchText $Text
    foreach ($pattern in $candidatePatterns) {
      foreach ($match in [regex]::Matches($searchText, $pattern)) {
        $normalized = Normalize-ProductNumber $match.Value
        if ([string]::IsNullOrWhiteSpace($normalized)) { continue }
        if (-not $candidates.ContainsKey($normalized)) {
          $candidates[$normalized] = [ordered]@{
            Number = $normalized
            LineIndex = -1
            LineText = $searchText
            Score = 0
            Warnings = New-Object System.Collections.Generic.List[string]
          }
        }
      }
    }
  }

  foreach ($key in @($candidates.Keys)) {
    $candidate = $candidates[$key]
    $score = 0

    if ($candidate.Number -match '^\d-[A-Z0-9]{4,6}-[A-Z0-9]{3,6}-?[A-Z0-9]?$') { $score += 45 }
    if ($candidate.Number -match '^\d{4,6}-[A-Z0-9]{3,6}(-[A-Z0-9]{1,12})?$') { $score += 40 }
    if ($candidate.Number -match '^ME0?\d{5,6}$') { $score += 28 }
    if ($candidate.Number -match '^EW-[A-Z0-9]{3,8}-[A-Z0-9]{1,4}$') { $score += 28 }
    if ($candidate.Number -match '^\d{9,12}$') { $score += 24 }
    if ($candidate.LineText -match '\bFLY\s*WHEEL\b|\bFLYWHEEL\b') { $score += 24 }
    $escapedNumber = [regex]::Escape($candidate.Number)
    if ($Text -match "${escapedNumber}.{0,80}(\bFLY\s*WHEEL\b|\bFLYWHEEL\b)" -or $Text -match "(\bFLY\s*WHEEL\b|\bFLYWHEEL\b).{0,80}${escapedNumber}") {
      $score += 18
    }
    $numberPosition = $Text.IndexOf($candidate.Number, [System.StringComparison]::OrdinalIgnoreCase)
    $flywheelMatch = [regex]::Match($Text, '\bFLY\s*WHEEL\b|\bFLYWHEEL\b')
    if ($numberPosition -ge 0 -and $flywheelMatch.Success -and $numberPosition -lt $flywheelMatch.Index) {
      $score += 12
    }
    if ($Text -match "SAME.{0,40}${escapedNumber}") {
      $candidate.Warnings.Add('Candidate appears after SAME/reference text rather than as the primary product number.')
      $score -= 35
    }
    if ($candidate.LineIndex -ge [math]::Max(0, $Lines.Count - 3)) { $score += 14 }
    if ($candidate.Number.Length -ge 9) { $score += 8 }

    if ($candidate.Number -match '(?:MIVAKE|MIYAKE|SAME|HOLE|COMPLETE)$') {
      $candidate.Warnings.Add('Product-number candidate appears to include extra descriptive text.')
      $score -= 35
    }
    if ($candidate.Number -match '[A-Z]{5,}$' -and $candidate.Number -notmatch 'SENSOR$') {
      $candidate.Warnings.Add('Long alphabetic suffix may be OCR bleed from the description.')
      $score -= 20
    }
    if ($candidate.Number -match '(?:EOL|ZOOD|O0|0O|O\d|D0D)') {
      $candidate.Warnings.Add('Product number contains OCR-ambiguous O/0 characters.')
      $score -= 18
    }
    if ($candidate.Number -match '^\d{9,12}$') {
      $candidate.Warnings.Add('Unhyphenated product number needs manual confirmation.')
      $score -= 8
    }
    if ($candidate.Number -match '^ME0?\d{5,6}$|^EW-') {
      $candidate.Warnings.Add('Non-standard product number format needs manual confirmation.')
      $score -= 6
    }

    $candidate.Score = $score
  }

  return @($candidates.Values | Sort-Object -Descending -Property { [int]$_['Score'] }, { [int]$_['Number'].Length })
}

function Get-ProductLine {
  param(
    [Parameter(Mandatory)][array]$Lines,
    [Parameter(Mandatory)][string]$Number
  )

  foreach ($line in $Lines) {
    $lineText = ConvertTo-CleanOcrText ([string]$line.Text)
    if ($lineText -match '\bFLY\s*WHEEL\b|\bFLYWHEEL\b') {
      return $lineText
    }
  }

  foreach ($line in $Lines) {
    $lineText = ConvertTo-CleanOcrText ([string]$line.Text)
    if ($lineText.Contains($Number)) {
      return $lineText
    }
  }

  return ''
}

function Get-SpecificationsFromText {
  param([Parameter(Mandatory)][string]$Text)

  $specs = [ordered]@{}

  $odMatches = @([regex]::Matches($Text, '\bOD\s*([0-9]+(?:\.[0-9]+)?)') | ForEach-Object { $_.Groups[1].Value })
  if ($odMatches.Count) { $specs.OD = @($odMatches | Select-Object -Unique) }

  $idMatches = @([regex]::Matches($Text, '\bID\s*([0-9]+(?:\.[0-9]+)?)(?:\s*MM)?') | ForEach-Object { $_.Groups[1].Value })
  if ($idMatches.Count) { $specs.ID = @($idMatches | Select-Object -Unique) }

  $hiMatches = @([regex]::Matches($Text, '\bHI\s*([0-9]+(?:\.[0-9]+)?)') | ForEach-Object { $_.Groups[1].Value })
  if ($hiMatches.Count) { $specs.HI = @($hiMatches | Select-Object -Unique) }

  $teethMatches = @([regex]::Matches($Text, '(?<![A-Z0-9])([0-9]{2,3})\s*T(?![A-Z])') | ForEach-Object { "$($_.Groups[1].Value)T" })
  if ($teethMatches.Count) { $specs.Teeth = @($teethMatches | Select-Object -Unique) }

  $holeMatches = @([regex]::Matches($Text, '(?<![A-Z0-9])([0-9]{1,2})\s*H\s*(?:M\s*)?([0-9]+(?:\.[0-9]+)?)(?:MM)?') | ForEach-Object { "$($_.Groups[1].Value)H M$($_.Groups[2].Value)" })
  if ($holeMatches.Count) { $specs.Holes = @($holeMatches | Select-Object -Unique) }

  $diameterMatches = @([regex]::Matches($Text, '([0-9]{1,2}(?:\s+[0-9]/[0-9])?)\s*"\s*/?\s*([0-9]{3}(?:\.[0-9]+)?)\s*MM') | ForEach-Object { "$($_.Groups[1].Value)`" / $($_.Groups[2].Value)mm" })
  if ($diameterMatches.Count) { $specs.Diameter = @($diameterMatches | Select-Object -Unique) }

  $absMatches = @([regex]::Matches($Text, '\bABS\s+HOLE\s*-?\s*([0-9]+)') | ForEach-Object { $_.Groups[1].Value })
  if ($absMatches.Count) { $specs.'ABS Hole' = @($absMatches | Select-Object -Unique) }

  $bearingMatches = @([regex]::Matches($Text, '\bBRG\s*([0-9]+)') | ForEach-Object { $_.Groups[1].Value })
  if ($bearingMatches.Count) { $specs.Bearing = @($bearingMatches | Select-Object -Unique) }

  if ($Text -match '\bNO\s+SENSOR\b') {
    $specs.Sensor = @('No sensor')
  } elseif ($Text -match '\bSENSOR\s+HOLE\b|\bABS\s+SENSOR\b') {
    $specs.Sensor = @('Sensor hole')
  }

  if ($Text -match '\bPIN\b|\bPIIC\b|\bP11C\b') {
    $specs.Pin = @('Pin reference detected')
  }

  return $specs
}

function Convert-SpecsToLabels {
  param([Parameter(Mandatory)][System.Collections.IDictionary]$Specs)

  $labels = New-Object System.Collections.Generic.List[string]
  foreach ($key in $Specs.Keys) {
    $value = $Specs[$key]
    if ($null -eq $value) { continue }
    if ($value -is [array]) {
      $labels.Add("$key $($value -join ', ')")
    } else {
      $labels.Add("$key $value")
    }
  }
  return @($labels)
}

function Get-DescriptionFromProductLine {
  param(
    [Parameter(Mandatory)][string]$Line,
    [Parameter(Mandatory)][string]$Number,
    [AllowEmptyString()][string]$Name
  )

  $description = ConvertTo-CleanOcrText $Line
  if (-not [string]::IsNullOrWhiteSpace($Number)) {
    $description = $description.Replace($Number, '')
  }
  if ($Name -eq 'Flywheel') {
    $description = $description -replace '\bFLY\s*WHEEL\b|\bFLYWHEEL\b', ''
  }
  $description = ($description -replace '\s+', ' ').Trim(' ', '-', ':')
  if ([string]::IsNullOrWhiteSpace($description)) {
    $description = if ([string]::IsNullOrWhiteSpace($Name)) { 'Needs manual review' } else { $Name }
  }
  return $description
}

function Parse-ProductOcr {
  param(
    [Parameter(Mandatory)][string]$Text,
    [Parameter(Mandatory)][array]$Lines,
    [Parameter(Mandatory)][string]$SourceFile
  )

  $cleanText = ConvertTo-CleanOcrText $Text
  $warnings = New-Object System.Collections.Generic.List[string]

  if ([string]::IsNullOrWhiteSpace($cleanText)) {
    return [ordered]@{
      Recognized = $false
      Reason = 'No OCR text detected.'
      Warnings = @('No OCR text detected.')
      Confidence = 0
    }
  }

  $identity = Get-ProductNameFromText -Text $cleanText
  if ([string]::IsNullOrWhiteSpace($identity.Name)) {
    $warnings.Add('Product name could not be identified from OCR text.')
  }

  $brandIdentity = Get-VehicleBrandFromText -Text $cleanText
  if ([string]::IsNullOrWhiteSpace($brandIdentity.Brand)) {
    $warnings.Add('Vehicle brand could not be reliably identified from OCR text.')
  }

  $candidates = @(Get-ProductNumberCandidates -Text $cleanText -Lines $Lines)
  if ($candidates.Count -eq 0) {
    return [ordered]@{
      Recognized = $false
      Reason = 'No reliable product number candidate found.'
      Warnings = @($warnings)
      Confidence = 0
      CleanText = $cleanText
    }
  }

  $best = $candidates[0]
  foreach ($candidateWarning in $best.Warnings) {
    $warnings.Add($candidateWarning)
  }

  $confidence = [math]::Max(0, [math]::Min(100, $best.Score))
  $requiresReview = $false
  if ($confidence -lt 58) { $requiresReview = $true }
  if ([string]::IsNullOrWhiteSpace($identity.Name)) { $requiresReview = $true }
  if ([string]::IsNullOrWhiteSpace($identity.Category)) { $requiresReview = $true }
  if ([string]::IsNullOrWhiteSpace($brandIdentity.Brand)) { $requiresReview = $true }
  if ($best.Warnings.Count -gt 0 -and $confidence -lt 72) { $requiresReview = $true }
  foreach ($warning in $best.Warnings) {
    if ($warning -match 'OCR-ambiguous|extra descriptive|reference text') {
      $requiresReview = $true
    }
  }

  $productLine = Get-ProductLine -Lines $Lines -Number $best.Number
  $specs = Get-SpecificationsFromText -Text $cleanText
  $specLabels = Convert-SpecsToLabels -Specs $specs
  $description = Get-DescriptionFromProductLine -Line $productLine -Number $best.Number -Name $identity.Name
  $reason = if ($requiresReview) { 'OCR result needs manual review before import.' } else { 'Recognized' }

  return [ordered]@{
    Recognized = (-not $requiresReview)
    Reason = $reason
    ProductNumber = $best.Number
    ProductName = $identity.Name
    Category = $identity.Category
    Brand = $brandIdentity.Brand
    BrandEvidence = $brandIdentity.Evidence
    Description = $description
    Specifications = $specs
    SpecLabels = $specLabels
    ProductLine = $productLine
    CleanText = $cleanText
    Confidence = $confidence
    Warnings = @($warnings)
    CandidateNumbers = @($candidates | Select-Object -First 5 | ForEach-Object {
      [ordered]@{
        Number = $_.Number
        Score = $_.Score
        Line = $_.LineText
        Warnings = @($_.Warnings)
      }
    })
  }
}
