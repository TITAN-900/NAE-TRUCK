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
    @{ Pattern = '\bCLUTCH\b'; Name = 'Clutch Part'; Category = 'clutch-system' },
    @{ Pattern = '\bBRAKE\b'; Name = 'Brake Part'; Category = 'brake-system' },
    @{ Pattern = '\bSPRING\b|\bSHOCK\b|\bSUSPENSION\b'; Name = 'Suspension Part'; Category = 'suspension-system' },
    @{ Pattern = '\bRADIATOR\b|\bWATER\s*PUMP\b|\bFAN\b|\bTHERMOSTAT\b'; Name = 'Cooling Part'; Category = 'cooling-system' },
    @{ Pattern = '\bSENSOR\b|\bSTARTER\b|\bALTERNATOR\b|\bSWITCH\b'; Name = 'Electrical Part'; Category = 'electrical-system' },
    @{ Pattern = '\bSTEERING\b|\bTIE\s*ROD\b|\bKINGPIN\b'; Name = 'Steering Part'; Category = 'steering-system' },
    @{ Pattern = '\bGEARBOX\b|\bTRANSMISSION\b|\bSYNCHRO\b'; Name = 'Transmission Part'; Category = 'transmission-parts' },
    @{ Pattern = '\bAXLE\b|\bHUB\b|\bDIFFERENTIAL\b'; Name = 'Axle Part'; Category = 'axle-parts' },
    @{ Pattern = '\bTRAILER\b|\bKING\s*PIN\b|\bLANDING\s*GEAR\b'; Name = 'Trailer Part'; Category = 'trailer-parts' }
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
    Category = 'engine-parts'
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
    [Parameter(Mandatory)][string]$Name
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
    $description = $Name
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
