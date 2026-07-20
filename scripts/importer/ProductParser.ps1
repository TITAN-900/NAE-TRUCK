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

function Convert-OcrDigitRun {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }

  return ([string]$Value).ToUpperInvariant().
    Replace('O', '0').
    Replace('I', '1').
    Replace('L', '1')
}

function Normalize-ProductNumber {
  param([AllowNull()][string]$Number)

  if ([string]::IsNullOrWhiteSpace($Number)) { return '' }

  $value = ConvertTo-CleanOcrText $Number
  $value = $value -replace '\*', 'X'
  $value = $value -replace '[\[\]\(\)"'':;,_/\\]+', ' '
  $value = $value -replace '\s*-\s*', '-'
  $value = $value -replace '(?<=[A-Z0-9])\s+(?=[A-Z0-9])', '-'
  $value = $value -replace '[^A-Z0-9-]', ''
  $value = $value -replace '-{2,}', '-'
  $value = $value.Trim('-')

  $value = $value -replace '^(?:WC|WE|W6)-(?=\d{3})', 'WG-'
  $value = $value -replace '^(?:WC|WE|W6)(?=\d{9,})', 'WG'
  $value = $value -replace '^VC-(?=\d{3})', 'VG-'
  $value = $value -replace '^VC(?=\d{9,})', 'VG'
  $value = $value -replace '^(NXG\d{2})TRW', '${1}TFW'
  $value = $value -replace '^([0-9]{7})-D(?:O|0)(?:I|1)A-HT$', '$1-D01A-HT'

  if ($value -match '^([0-9]{3})-(\d{3})(\d{4})-HT$') {
    return "$($Matches[1])-$($Matches[2])-$($Matches[3])-HT"
  }
  if ($value -match '^([0-9]{7,12})-ASSY-HT$') {
    return $Matches[1]
  }
  if ($value -match '^([0-9]{7,12})-H$') {
    return "$($Matches[1])-HT"
  }
  if ($value -match '^([0-9]{7,12})-(\d)-H$') {
    return "$($Matches[1])-$($Matches[2])-HT"
  }

  if ($value -match '^(WG|AZ|VG|DZ)-?(\d{3})(\d{3})([0-9IOL]{4}[A-Z]?)-HT$') {
    return "$($Matches[1])-$($Matches[2])-$($Matches[3])-$(Convert-OcrDigitRun $Matches[4])-HT"
  }
  if ($value -match '^(WG|AZ|VG|DZ)-(\d{3})(\d{3})-([0-9IOL]{4}[A-Z]?)-HT$') {
    return "$($Matches[1])-$($Matches[2])-$($Matches[3])-$(Convert-OcrDigitRun $Matches[4])-HT"
  }
  if ($value -match '^(WG|AZ|VG|DZ)-(\d{3})-(\d{3})([0-9IOL]{4}[A-Z]?)-HT$') {
    return "$($Matches[1])-$($Matches[2])-$($Matches[3])-$(Convert-OcrDigitRun $Matches[4])-HT"
  }
  if ($value -match '^(WG|AZ|VG|DZ)-(\d{3})-(\d{3})-([0-9IOL]{4}[A-Z]?)-HT$') {
    return "$($Matches[1])-$($Matches[2])-$($Matches[3])-$(Convert-OcrDigitRun $Matches[4])-HT"
  }

  if ($value -match '^263354(\d{4})$') {
    return "26335-Z$($Matches[1])"
  }
  if ($value -match '^(26335-Z\d{4})\d$') {
    return $Matches[1]
  }
  if ($value -match '^(WG|AZ|VG)(\d{3})(\d{3})(\d{4})([A-Z]{1,4})?$') {
    $suffix = if (-not [string]::IsNullOrWhiteSpace($Matches[5])) { "-$($Matches[5])" } else { '' }
    return "$($Matches[1])-$($Matches[2])-$($Matches[3])-$($Matches[4])$suffix"
  }
  if ($value -match '^(WG|AZ|VG)-(\d{3})-(\d{7})(-[A-Z]{1,4})?$') {
    $middle = $Matches[3].Substring(0, 3)
    $last = $Matches[3].Substring(3, 4)
    $suffix = if (-not [string]::IsNullOrWhiteSpace($Matches[4])) { $Matches[4] } else { '' }
    return "$($Matches[1])-$($Matches[2])-$middle-$last$suffix"
  }
  if ($value -match '^(WG|AZ|VG)-(\d{3})-(\d{3})(\d{4})(-[A-Z]{1,4})?$') {
    $suffix = if (-not [string]::IsNullOrWhiteSpace($Matches[5])) { $Matches[5] } else { '' }
    return "$($Matches[1])-$($Matches[2])-$($Matches[3])-$($Matches[4])$suffix"
  }

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
    @{ Pattern = '\bCLUTCH\s+BOOSTER\s+CYLINDER\b|\bCLUTCH\s+SERVO\b'; Name = 'Clutch Servo'; Category = 'clutch-system' },
    @{ Pattern = '\bOIL\s+COOLER\s+CORE\b|\bOIL\s+COOLER\s+ASSY\b|\bOIL\s+COOLER\b'; Name = 'Oil Cooler Assembly'; Category = 'cooling-system' },
    @{ Pattern = '\bFILTER\s+HEAD\b'; Name = 'Filter Head'; Category = 'engine-parts' },
    @{ Pattern = '\bCYLINDER\s+HEAD\s+ASSY\b|\bCYL\s+HEAD\b|\bCYLINDER\s+HEAD\b'; Name = 'Cylinder Head Assembly'; Category = 'engine-parts' },
    @{ Pattern = '\bIN\s+VALVE\b|\bINTAKE\s+VALVE\b'; Name = 'Intake Valve'; Category = 'engine-parts' },
    @{ Pattern = '\bEXHAUST\s+VALVE\b|\bEX\s+VALVE\b'; Name = 'Exhaust Valve'; Category = 'engine-parts' },
    @{ Pattern = '\bCONNECTING\s+ROD\b|\bCON\s+ROD\b'; Name = 'Connecting Rod Assembly'; Category = 'engine-parts' },
    @{ Pattern = '\bNOZZLE\s+PIPE\s+SET\b|\bFUEL\s+INJECTION\s+PIPE\b'; Name = 'Nozzle Pipe Set'; Category = 'engine-parts' },
    @{ Pattern = '\bB\/?\s*LINING\b|\bREAR\s+BRAKE\s+LINING\b'; Name = 'Brake Lining Set'; Category = 'brake-system' },
    @{ Pattern = '\bB\/?\s*SHOE\b|\bBRAKE\s+SHOE\b'; Name = 'Brake Shoe Assembly'; Category = 'brake-system' },
    @{ Pattern = '\bVALVE\s+CAP\b'; Name = 'Valve Cap'; Category = 'engine-parts' },
    @{ Pattern = '\bCAMSHAFT\b'; Name = 'Camshaft'; Category = 'engine-parts' },
    @{ Pattern = '\bOIL\s+PUMP\b'; Name = 'Engine Oil Pump'; Category = 'engine-parts' },
    @{ Pattern = '\bSPARE\s+TANK\s+ASSY\b|\bSPARE\s+TANK\b|\bEXPANSION\s+TANK\b|\bRESERVE\s+TANK\b'; Name = 'Spare Tank Assembly'; Category = 'cooling-system' },
    @{ Pattern = '\bINTERCOOLER\s+HOSE\s+CLIP\b'; Name = 'Intercooler Hose Clip'; Category = 'cooling-system' },
    @{ Pattern = '\bINTERCOOLER\s+HOSE\b|\bHOSE\s+INTERCOOLER\b'; Name = 'Intercooler Hose'; Category = 'cooling-system' },
    @{ Pattern = '\bINTERCOOLER\s+ASSY\b|\bINTERCOOLER\b'; Name = 'Intercooler Assembly'; Category = 'cooling-system' },
    @{ Pattern = '\bW\/?\s*PUMP\s+ASSY\b|\bWATER\s*PUMP\s+ASSY\b'; Name = 'Water Pump Assembly'; Category = 'cooling-system' },
    @{ Pattern = '\bTURBO\s+ASSY\b|\bTURBOCHARGER\b'; Name = 'Turbo Assembly'; Category = 'engine-parts' },
    @{ Pattern = '\bTORQUE\s+BUSH\b'; Name = 'Torque Bush'; Category = 'suspension-system' },
    @{ Pattern = '\bGEAR\s*BOX\b.{0,50}\bSOLENOID\s+VALVE\b|\bSOLENOID\s+VALVE\b.{0,50}\bGEAR\s*BOX\b'; Name = 'Gearbox Solenoid Valve'; Category = 'transmission-parts' },
    @{ Pattern = '\bMAGN(?:E|EC)TIC\s+VALVE\b|\bMAGNETIC\s+VALVE\b'; Name = 'Magnetic Valve'; Category = 'electrical-system' },
    @{ Pattern = '\bSOLENOID\s+VALVE\b'; Name = 'Solenoid Valve'; Category = 'electrical-system' },
    @{ Pattern = '\bFUEL\s+TANK\s+FLOAT\b'; Name = 'Fuel Tank Float'; Category = 'electrical-system' },
    @{ Pattern = '\bSHIFTING\s+DEVICE\b'; Name = 'Shifting Device'; Category = 'transmission-parts' },
    @{ Pattern = '\bCLUTCH\s+BRG\s+ASSY\b|\bCLUTCH\s+BEARING\s+ASSY\b'; Name = 'Clutch Bearing Assembly'; Category = 'clutch-system' },
    @{ Pattern = '\bCLUTCH\s+BRG\b|\bCLUTCH\s+BEARING\b'; Name = 'Clutch Bearing'; Category = 'clutch-system' },
    @{ Pattern = '\bCLUTCH\s+COVER\s+SPRING\s+KIT\b'; Name = 'Clutch Cover Spring Kit'; Category = 'clutch-system' },
    @{ Pattern = '\bDOOR\s+HINGE\b'; Name = 'Door Hinge'; Category = '' },
    @{ Pattern = '\bFRT\s+HUB\s+BEARING\b|\bFRONT\s+HUB\s+BEARING\b|\bHUB\s+BEARING\b'; Name = 'Front Hub Bearing'; Category = 'axle-parts' },
    @{ Pattern = '\bHAND\s+BRAKE\s+SHAFT\s+BUSH\s+KIT\b|\bHB\s+SHAFT\s+KIT\b'; Name = 'Hand Brake Shaft Kit'; Category = 'brake-system' },
    @{ Pattern = '\bTEMP\s+SWITCH\b|\bTEMPERATURE\s+SWITCH\b'; Name = 'Temperature Switch'; Category = 'electrical-system' },
    @{ Pattern = '\bAIR\s+BEL(?:LOW|OW)\b|\bAIR\s+BELOW\b|\bBELLOWS\b'; Name = 'Air Bellow'; Category = 'suspension-system' },
    @{ Pattern = '\bPRESSURE\s+PROTECTION\s+VALVE\b|\bGOVERNOR\b'; Name = 'Pressure Protection Valve'; Category = 'brake-system' },
    @{ Pattern = '\b2\s*SPEED\s+ASSY\b|\bTWO\s*SPEED\s+ASSY\b'; Name = 'Two Speed Assembly'; Category = 'axle-parts' },
    @{ Pattern = '\bSPG\s+SHACKLE\b|\bSPRING\s+SHACKLE\b|\bSHACKLE\s+FRT\b'; Name = 'Front Spring Shackle'; Category = 'suspension-system' },
    @{ Pattern = '\bSLACK\s+ADJ\b|\bSLACK\s+ADJUSTER\b'; Name = 'Slack Adjuster'; Category = 'trailer-parts' },
    @{ Pattern = '\bTIE\s+ROD\s+ARM\b'; Name = 'Tie Rod Arm'; Category = 'steering-system' },
    @{ Pattern = '\bCOUPLING\b'; Name = 'Coupling'; Category = '' },
    @{ Pattern = '\bKNUCKLE\s+FRT\b|\bFRONT\s+KNUCKLE\b|\bKNUCKLE\b'; Name = 'Front Knuckle'; Category = 'steering-system' },
    @{ Pattern = '\bDIFFERENTIAL\s+ASSY\b|\bDIFFERENTIAL\b'; Name = 'Differential Assembly'; Category = 'axle-parts' },
    @{ Pattern = '\bSUN\s+GEAR\s+WASHER\b'; Name = 'Sun Gear Washer'; Category = 'axle-parts' },
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
    @{ Pattern = '\bSINOTRUK\b|\bHOWO\d*\b|\bHOW\d{3,4}\b|\bCNHTC\b'; Brand = 'SINOTRUK HOWO' },
    @{ Pattern = '\bSITRAK\b'; Brand = 'SITRAK' },
    @{ Pattern = '\bHANVAN\b|\bXCMG\b'; Brand = 'HANVAN' },
    @{ Pattern = '\bHOHAN\b'; Brand = 'HOHAN' },
    @{ Pattern = '\bHANDE\b'; Brand = 'HANDE' },
    @{ Pattern = '\bSHACMAN\b|\bSHAANXI\b'; Brand = 'SHACMAN' },
    @{ Pattern = '\bFAW\b|\bJIEFANG\b'; Brand = 'FAW' },
    @{ Pattern = '\bDONG\s*FENG\b|\bDONGFENG\b|\bDFM\b'; Brand = 'DONGFENG' },
    @{ Pattern = '\bFOTON\b|\bAUMAN\b'; Brand = 'FOTON' },
    @{ Pattern = '\bJAC\b|\bJAC\s+HEAVY\b'; Brand = 'JAC HEAVY' },
    @{ Pattern = '\bTRAILER\b|\bSEMI\s*TRAILER\b|\bCONTAINER\s+HAULER\b'; Brand = 'Trailer' },
    @{ Pattern = '\bHUATAI\b|\bHUATAU\b|\bHT\d{4,5}[A-Z]?\b'; Brand = 'Huatai' }
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
    '(?<![A-Z0-9])(?:WG|WC|WE|W6|VG|VC|AZ|DZ)[- ]?\d{3}[- ]?\d{3,6}[- ]?[0-9IOL]{4}[A-Z]?[- ]?HT(?![A-Z0-9])',
    '(?<![A-Z0-9])(?:WG|WC|WE|W6|VG|VC|AZ|DZ)[- ]?\d{9,10}[A-Z]?[- ]?HT(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{3}[- ]?\d{7}[- ]?HT(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{7,12}(?:[- ]\d)?[- ]?HT(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{7,12}[- ]\d[- ]H(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{7,12}\s+ASSY[- ]?HT(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{7}[- ][A-Z0-9]{4}[- ]?HT(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{3}[A-Z]\d{5}[- ]\d{4}[- ]?HT(?![A-Z0-9])',
    '(?<![A-Z0-9])(?:WG|WC|WE|W6|VG|VC|AZ|DZ)[- ]?(?:\d{3,6}[- ]){1,3}\d{3,7}(?:[- ][A-Z]{1,4})?(?![A-Z0-9])',
    '(?<![A-Z0-9])(?:WG|WC|WE|W6|VG|VC|AZ|DZ)\d{9,13}[A-Z]{0,4}(?![A-Z0-9])',
    '(?<![A-Z0-9])XGA[A-Z0-9]{8,20}(?:-[A-Z0-9]{1,6}){1,3}(?![A-Z0-9])',
    '(?<![A-Z0-9])N[*X]G\d{2}T[FR]W\d{3}-\d{4,6}(?![A-Z0-9])',
    '(?<![A-Z0-9])NXG\d{2}T[FR]W\d{3}-\d{4,6}(?![A-Z0-9])',
    '(?<![A-Z0-9])VN[- ]?\d{3}[- ]?HKT(?![A-Z0-9])',
    '(?<![A-Z0-9])LLON[- ]?\d{4,5}[- ][A-Z0-9](?![A-Z0-9])',
    '(?<![A-Z0-9])(?:STR|GWT|UP)[- ][A-Z0-9]{3,8}(?:[- ][A-Z0-9]{1,8}){0,2}(?![A-Z0-9])',
    '(?<![A-Z0-9])HD\d{3}[- ]\d{5,6}(?![A-Z0-9])',
    '(?<![A-Z0-9])(?:711W|712W|20W)[A-Z0-9]{5,8}-[A-Z0-9]{3,6}(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{3}[- ]\d{3}[- ]\d{4}(?:[- ][A-Z])?(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{4}[- ]\d{4}[- ]\d{4}(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{5}[- ][A-Z]{2}\d(?![A-Z0-9])',
    '(?<![A-Z0-9])\d{5}[- ][A-Z]\d{4,5}(?![A-Z0-9])',
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
    if ($key -notmatch '^(\d{7,11})-HT$') { continue }
    $digits = $Matches[1]
    $longerNumbers = @(
      $candidates.Keys |
        Where-Object {
          $_ -match '^\d{8,12}$' -and
          $_.EndsWith($digits, [System.StringComparison]::Ordinal) -and
          $_.Length -eq ($digits.Length + 1)
        }
    )
    if ($longerNumbers.Count -ne 1) { continue }

    $correctedNumber = "$($longerNumbers[0])-HT"
    if (-not $candidates.ContainsKey($correctedNumber)) {
      $candidates[$correctedNumber] = $candidates[$key]
      $candidates[$correctedNumber].Number = $correctedNumber
      $candidates[$correctedNumber].Warnings.Add('OCR dropped a leading digit from the Huatai -HT product number; restored from the matching visible label number in the same image.')
    }
    $candidates.Remove($key)
  }

  foreach ($key in @($candidates.Keys)) {
    if (-not $candidates.ContainsKey($key)) { continue }
    $compactKey = $key -replace '-', ''
    foreach ($otherKey in @($candidates.Keys)) {
      if ($key -eq $otherKey) { continue }
      $compactOther = $otherKey -replace '-', ''
      if ($compactOther.Length -gt $compactKey.Length -and $compactOther.Contains($compactKey)) {
        $candidates.Remove($key)
        break
      }
    }
  }

  foreach ($key in @($candidates.Keys)) {
    $candidate = $candidates[$key]
    $score = 0
    $productKeywordPattern = '\b(FLY\s*WHEEL|FLYWHEEL|CLUTCH\s+SERVO|CLUTCH\s+BOOSTER\s+CYLINDER|SPARE\s+TANK|OIL\s+COOLER|FILTER\s+HEAD|CYL(?:INDER)?\s+HEAD|IN\s+VALVE|INTAKE\s+VALVE|EXHAUST\s+VALVE|CONNECTING\s+ROD|CON\s+ROD|NOZZLE\s+PIPE|FUEL\s+INJECTION\s+PIPE|B\/?\s*LINING|BRAKE\s+LINING|BRAKE\s+SHOE|B\/?\s*SHOE|VALVE\s+CAP|CAMSHAFT|OIL\s+PUMP|INTERCOOLER|TORQUE\s+BUSH|MAGN(?:E|EC)TIC\s+VALVE|MAGNETIC\s+VALVE|SOLENOID\s+VALVE|FUEL\s+TANK\s+FLOAT|SHIFTING\s+DEVICE|CLUTCH\s+BRG|CLUTCH\s+BEARING|HUB\s+BEARING|HAND\s+BRAKE|HB\s+SHAFT|TEMP\s+SWITCH|AIR\s+BEL(?:LOW|OW)|AIR\s+BELOW|WATER\s*PUMP|W\/?\s*PUMP|2\s*SPEED|SPG\s+SHACKLE|SPRING\s+SHACKLE|SLACK\s+ADJ|TURBO\s+ASSY|TURBOCHARGER|TURBO\s+CHARG|TIE\s+ROD\s+ARM|COUPLING|KNUCKLE|DIFFERENTIAL|SUN\s+GEAR\s+WASHER|PRESSURE\s+PROTECTION\s+VALVE)\b'

    if ($candidate.Number -match '^(WG|AZ|VG|DZ)-') { $score += 48 }
    if ($candidate.Number -match '^(WG|AZ|VG|DZ)-.+-HT$') { $score += 28 }
    if ($candidate.Number -match '^XGA[A-Z0-9]+-') { $score += 48 }
    if ($candidate.Number -match '^NXG\d{2}') { $score += 48 }
    if ($candidate.Number -match '^VN-\d{3}-HKT$') { $score += 46 }
    if ($candidate.Number -match '^LLON-\d{4,5}-[A-Z0-9]$') { $score += 44 }
    if ($candidate.Number -match '^(STR|GWT|UP)-') { $score += 42 }
    if ($candidate.Number -match '^HD\d{3}-\d{5,6}$') { $score += 42 }
    if ($candidate.Number -match '^(711W|712W|20W)[A-Z0-9]{5,8}-[A-Z0-9]{3,6}$') { $score += 42 }
    if ($candidate.Number -match '^\d{3}-\d{3}-\d{4}(-[A-Z])?$') { $score += 40 }
    if ($candidate.Number -match '^\d{3}-\d{3}-\d{4}-HT$') { $score += 64 }
    if ($candidate.Number -match '^\d{4}-\d{4}-\d{4}$') { $score += 40 }
    if ($candidate.Number -match '^\d{7,12}(-\d)?-HT$') { $score += 64 }
    if ($candidate.Number -match '^\d{7}-[A-Z0-9]{4}-HT$') { $score += 64 }
    if ($candidate.Number -match '^\d{3}[A-Z]\d{5}-\d{4}-HT$') { $score += 64 }
    if ($candidate.Number -match '^\d{5}-[A-Z]\d{4}$|^\d{5}-[A-Z]{2}\d$') { $score += 38 }
    if ($candidate.Number -match '^\d-[A-Z0-9]{4,6}-[A-Z0-9]{3,6}-?[A-Z0-9]?$') { $score += 45 }
    if ($candidate.Number -match '^\d{4,6}-[A-Z0-9]{3,6}(-[A-Z0-9]{1,12})?$') { $score += 40 }
    if ($candidate.Number -match '^ME0?\d{5,6}$') { $score += 28 }
    if ($candidate.Number -match '^EW-[A-Z0-9]{3,8}-[A-Z0-9]{1,4}$') { $score += 28 }
    if ($candidate.Number -match '^\d{9,12}$') { $score += 24 }
    if ($candidate.LineText -match '\bFLY\s*WHEEL\b|\bFLYWHEEL\b') { $score += 24 }
    if ($candidate.LineText -match $productKeywordPattern) { $score += 28 }
    $escapedNumber = [regex]::Escape($candidate.Number)
    $flexNumber = ($escapedNumber -replace '\\-', '[-\s]*')
    $compactNumber = [regex]::Escape(($candidate.Number -replace '-', ''))
    if ($Text -match "${flexNumber}.{0,90}${productKeywordPattern}" -or $Text -match "${productKeywordPattern}.{0,90}${flexNumber}") {
      $score += 20
    }
    if ($Text -match "${flexNumber}\s+(?:ASSY[-\s]*)?HT\d{4}" -or $Text -match "${flexNumber}.{0,25}\bHT\d{4}\b") {
      $score += 32
    }
    if ($compactNumber.Length -ge 6 -and ($Text -replace '[^A-Z0-9]', '') -match $compactNumber) {
      $score += 8
    }
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
    if ($candidate.Number -match '(?:EOL|ZOOD|O0|0O|O\d|D0D|OOZOO|OO|OZOO)') {
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

  $compactNumber = $Number -replace '[^A-Z0-9]', ''
  foreach ($line in $Lines) {
    $lineText = ConvertTo-CleanOcrText ([string]$line.Text)
    $compactLine = $lineText -replace '[^A-Z0-9]', ''
    if (
      $lineText.Contains($Number) -or
      ($compactNumber.Length -ge 6 -and $compactLine.Contains($compactNumber))
    ) {
      return $lineText
    }
  }

  foreach ($line in $Lines) {
    $lineText = ConvertTo-CleanOcrText ([string]$line.Text)
    if ($lineText -match '\bFLY\s*WHEEL\b|\bFLYWHEEL\b') {
      return $lineText
    }
  }

  foreach ($line in $Lines) {
    $lineText = ConvertTo-CleanOcrText ([string]$line.Text)
    if ($lineText -match '\b(CLUTCH\s+SERVO|CLUTCH\s+BOOSTER\s+CYLINDER|SPARE\s+TANK|OIL\s+COOLER|FILTER\s+HEAD|CYL(?:INDER)?\s+HEAD|IN\s+VALVE|INTAKE\s+VALVE|EXHAUST\s+VALVE|CONNECTING\s+ROD|CON\s+ROD|NOZZLE\s+PIPE|FUEL\s+INJECTION\s+PIPE|B\/?\s*LINING|BRAKE\s+LINING|BRAKE\s+SHOE|B\/?\s*SHOE|VALVE\s+CAP|CAMSHAFT|OIL\s+PUMP|INTERCOOLER|TORQUE\s+BUSH|MAGN(?:E|EC)TIC\s+VALVE|MAGNETIC\s+VALVE|SOLENOID\s+VALVE|FUEL\s+TANK\s+FLOAT|SHIFTING\s+DEVICE|CLUTCH\s+BRG|CLUTCH\s+BEARING|HUB\s+BEARING|HAND\s+BRAKE|HB\s+SHAFT|TEMP\s+SWITCH|AIR\s+BEL(?:LOW|OW)|AIR\s+BELOW|WATER\s*PUMP|W\/?\s*PUMP|2\s*SPEED|SPG\s+SHACKLE|SPRING\s+SHACKLE|SLACK\s+ADJ|TURBO\s+ASSY|TURBOCHARGER|TURBO\s+CHARG|TIE\s+ROD\s+ARM|COUPLING|KNUCKLE|DIFFERENTIAL|SUN\s+GEAR\s+WASHER|PRESSURE\s+PROTECTION\s+VALVE)\b') {
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
    $flexNumber = ([regex]::Escape($Number) -replace '\\-', '[-\s]*')
    $description = [regex]::Replace($description, $flexNumber, '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $compactNumber = [regex]::Escape(($Number -replace '-', ''))
    if (($Number -replace '-', '').Length -ge 6) {
      $description = [regex]::Replace($description, $compactNumber, '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
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

  $alternateCandidates = @(
    $candidates |
      Where-Object { $_.Number -ne $best.Number -and [int]$_.Score -ge 58 -and [int]$_.Score -ge ([int]$best.Score - 12) } |
      Select-Object -First 4
  )

  $confidence = [math]::Max(0, [math]::Min(100, $best.Score))
  $requiresReview = $false
  if ($confidence -lt 58) { $requiresReview = $true }
  if ([string]::IsNullOrWhiteSpace($identity.Name)) { $requiresReview = $true }
  if ([string]::IsNullOrWhiteSpace($identity.Category)) { $requiresReview = $true }
  if ($alternateCandidates.Count -gt 0) {
    $warnings.Add(("Multiple reliable product numbers detected in one image: {0}. Manual selection required." -f ((@($alternateCandidates | ForEach-Object { $_.Number }) -join ', '))))
    $requiresReview = $true
  }
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
