Set-StrictMode -Version Latest

$script:WindowsOcrReady = $false
$script:WindowsOcrEngine = $null
$script:AsTaskMethodCache = @{}

function Initialize-WindowsOcr {
  if ($script:WindowsOcrReady) { return }

  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
  $null = [Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime]
  $null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapPixelFormat, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapAlphaMode, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
  $null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

  $englishLanguage = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages |
    Where-Object { $_.LanguageTag -match '^en' } |
    Select-Object -First 1

  if ($englishLanguage) {
    $script:WindowsOcrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($englishLanguage)
  } else {
    $script:WindowsOcrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  }
  if (-not $script:WindowsOcrEngine) {
    throw 'Windows OCR is available but no OCR engine could be created from the current Windows language profile.'
  }

  $script:WindowsOcrReady = $true
}

function Wait-WindowsAsyncOperation {
  param(
    [Parameter(Mandatory)][object]$Operation,
    [Parameter(Mandatory)][type]$ResultType
  )

  $cacheKey = $ResultType.FullName
  if (-not $script:AsTaskMethodCache.ContainsKey($cacheKey)) {
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
      Where-Object {
        $_.Name -eq 'AsTask' -and
        $_.IsGenericMethod -and
        $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
      } |
      Select-Object -First 1
    $script:AsTaskMethodCache[$cacheKey] = $method.MakeGenericMethod($ResultType)
  }

  $task = $script:AsTaskMethodCache[$cacheKey].Invoke($null, @($Operation))
  $task.Wait()
  return $task.Result
}

function Test-OcrTextHasLikelyProductCode {
  param([AllowNull()][string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) { return $false }

  $value = ([string]$Text).ToUpperInvariant()
  return (
    $value -match '(?<![A-Z0-9])(?:WG|AZ|VG|DZ)[-\s]?\d{3}' -or
    $value -match '(?<![A-Z0-9])\d{2,3}\s*X\s*\d{2,3}\s*X\s*\d{2,3}(?:\s*X\s*\d{1,3})?\s*[-\s]?XS(?![A-Z0-9])' -or
    $value -match '(?<![A-Z0-9])SKSB[-\s]?[0-9IOL]{3,6}(?![A-Z0-9])' -or
    $value -match '(?<![A-Z0-9])[A-Z]{2,8}[-\s]?[0-9]{3,8}(?:[-\s][A-Z0-9]{1,12})?(?![A-Z0-9])' -or
    $value -match '(?<![A-Z0-9])\d{7,12}(?:[-\s]\d)?[-\s]?(?:HT|XS)(?![A-Z0-9])'
  )
}

function Read-ImageOcrSinglePass {
  param(
    [Parameter(Mandatory)][string]$Path,
    [string]$PassName = 'full'
  )

  Initialize-WindowsOcr

  $file = Wait-WindowsAsyncOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Path)) ([Windows.Storage.StorageFile])
  $stream = Wait-WindowsAsyncOperation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Wait-WindowsAsyncOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Wait-WindowsAsyncOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

  if ($bitmap.BitmapPixelFormat -ne [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8) {
    $bitmap = [Windows.Graphics.Imaging.SoftwareBitmap]::Convert(
      $bitmap,
      [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
      [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied
    )
  }

  $result = Wait-WindowsAsyncOperation ($script:WindowsOcrEngine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $lines = @()
  foreach ($line in $result.Lines) {
    $words = @()
    foreach ($word in $line.Words) {
      $words += [ordered]@{
        Text = $word.Text
        X = [math]::Round($word.BoundingRect.X, 2)
        Y = [math]::Round($word.BoundingRect.Y, 2)
        Width = [math]::Round($word.BoundingRect.Width, 2)
        Height = [math]::Round($word.BoundingRect.Height, 2)
        OcrPass = $PassName
      }
    }

    $lines += [ordered]@{
      Text = $line.Text
      Words = $words
      OcrPass = $PassName
    }
  }

  return [ordered]@{
    Text = $result.Text
    Lines = $lines
    TextAngle = $result.TextAngle
    ImageWidth = $bitmap.PixelWidth
    ImageHeight = $bitmap.PixelHeight
    OcrPasses = @($PassName)
  }
}

function New-OcrSupplementalImagePasses {
  param([Parameter(Mandatory)][string]$Path)

  try {
    Add-Type -AssemblyName System.Drawing
  } catch {
    Write-Warning "Supplemental OCR image preprocessing is unavailable. $($_.Exception.Message)"
    return @()
  }

  $passes = New-Object System.Collections.Generic.List[object]
  $image = $null
  try {
    $image = [System.Drawing.Image]::FromFile($Path)
    $width = [int]$image.Width
    $height = [int]$image.Height
    if ($width -le 0 -or $height -le 0) { return @() }

    $cropY = [int][math]::Floor($height * 0.56)
    $cropHeight = [int]($height - $cropY)
    if ($cropHeight -lt 80) { return @() }

    $scale = 2.4
    $targetWidth = [int][math]::Ceiling($width * $scale)
    $targetHeight = [int][math]::Ceiling($cropHeight * $scale)
    $target = Join-Path ([System.IO.Path]::GetTempPath()) ("nae-ocr-bottom-code-{0}.png" -f ([guid]::NewGuid().ToString('N')))

    $bitmap = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::White)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $sourceRect = [System.Drawing.Rectangle]::new(0, $cropY, $width, $cropHeight)
      $destRect = [System.Drawing.Rectangle]::new(0, 0, $targetWidth, $targetHeight)
      $graphics.DrawImage($image, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
      $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }

    $passes.Add([ordered]@{
      Name = 'bottom-code-band'
      Path = $target
      CropX = 0.0
      CropY = [double]$cropY
      Scale = [double]$scale
    }) | Out-Null
  } catch {
    Write-Warning "Could not create supplemental OCR pass for $Path. $($_.Exception.Message)"
  } finally {
    if ($null -ne $image) { $image.Dispose() }
  }

  return @($passes.ToArray())
}

function Convert-OcrLinesToOriginalCoordinates {
  param(
    [Parameter(Mandatory)][array]$Lines,
    [Parameter(Mandatory)][System.Collections.IDictionary]$Pass
  )

  $scale = [double]$Pass.Scale
  if ($scale -le 0) { $scale = 1.0 }
  $cropX = [double]$Pass.CropX
  $cropY = [double]$Pass.CropY
  $passName = [string]$Pass.Name

  $mappedLines = New-Object System.Collections.Generic.List[object]
  foreach ($line in @($Lines)) {
    $words = New-Object System.Collections.Generic.List[object]
    foreach ($word in @($line.Words)) {
      $words.Add([ordered]@{
        Text = [string]$word.Text
        X = [math]::Round($cropX + ([double]$word.X / $scale), 2)
        Y = [math]::Round($cropY + ([double]$word.Y / $scale), 2)
        Width = [math]::Round(([double]$word.Width / $scale), 2)
        Height = [math]::Round(([double]$word.Height / $scale), 2)
        OcrPass = $passName
      }) | Out-Null
    }

    $mappedLines.Add([ordered]@{
      Text = [string]$line.Text
      Words = @($words.ToArray())
      OcrPass = $passName
    }) | Out-Null
  }

  return @($mappedLines.ToArray())
}

function Add-OcrLinesUnique {
  param(
    [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$Target,
    [Parameter(Mandatory)][hashtable]$Seen,
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$Lines
  )

  foreach ($line in @($Lines)) {
    $text = [string]$line.Text
    $key = ($text.ToUpperInvariant() -replace '[^A-Z0-9]', '')
    if ([string]::IsNullOrWhiteSpace($key)) { continue }
    if ($Seen.ContainsKey($key)) { continue }
    $Seen[$key] = $true
    $Target.Add($line) | Out-Null
  }
}

function Read-ImageOcr {
  param(
    [Parameter(Mandatory)][string]$Path
  )

  $primary = Read-ImageOcrSinglePass -Path $Path -PassName 'full'
  $lines = New-Object System.Collections.Generic.List[object]
  $seen = @{}
  Add-OcrLinesUnique -Target $lines -Seen $seen -Lines @($primary.Lines)

  $passes = New-Object System.Collections.Generic.List[string]
  $passes.Add('full') | Out-Null
  $shouldRunSupplementalPass = (
    -not (Test-OcrTextHasLikelyProductCode -Text ([string]$primary.Text)) -or
    @($primary.Lines).Count -le 2
  )

  if ($shouldRunSupplementalPass) {
    foreach ($pass in @(New-OcrSupplementalImagePasses -Path $Path)) {
      try {
        $supplemental = Read-ImageOcrSinglePass -Path ([string]$pass.Path) -PassName ([string]$pass.Name)
        $mappedLines = Convert-OcrLinesToOriginalCoordinates -Lines @($supplemental.Lines) -Pass $pass
        Add-OcrLinesUnique -Target $lines -Seen $seen -Lines @($mappedLines)
        $passes.Add([string]$pass.Name) | Out-Null
      } catch {
        Write-Warning "Supplemental OCR pass failed for $Path. $($_.Exception.Message)"
      } finally {
        if (Test-Path -LiteralPath ([string]$pass.Path) -PathType Leaf) {
          Remove-Item -LiteralPath ([string]$pass.Path) -Force -ErrorAction SilentlyContinue
        }
      }
    }
  }

  $combinedText = ((@($lines.ToArray()) | ForEach-Object { [string]$_.Text }) -join "`n").Trim()
  if ([string]::IsNullOrWhiteSpace($combinedText)) { $combinedText = [string]$primary.Text }

  return [ordered]@{
    Text = $combinedText
    Lines = @($lines.ToArray())
    TextAngle = $primary.TextAngle
    ImageWidth = $primary.ImageWidth
    ImageHeight = $primary.ImageHeight
    OcrEngineVersion = 2
    OcrPasses = @($passes.ToArray() | Select-Object -Unique)
  }
}

function Read-OcrCache {
  param([Parameter(Mandatory)][string]$CachePath)

  if (-not (Test-Path -LiteralPath $CachePath)) { return @{} }
  try {
    $raw = Get-Content -LiteralPath $CachePath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
    $json = $raw | ConvertFrom-Json
    $cache = @{}
    foreach ($entry in $json.PSObject.Properties) {
      $cache[$entry.Name] = $entry.Value
    }
    return $cache
  } catch {
    Write-Warning "Could not read OCR cache. A new cache will be created. $($_.Exception.Message)"
    return @{}
  }
}

function Save-OcrCache {
  param(
    [Parameter(Mandatory)][hashtable]$Cache,
    [Parameter(Mandatory)][string]$CachePath
  )

  $parent = Split-Path -Parent $CachePath
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $Cache | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $CachePath -Encoding UTF8
}

function Get-OcrCacheEntryValue {
  param(
    [AllowNull()]$Entry,
    [Parameter(Mandatory)][string]$Name
  )

  if ($null -eq $Entry) { return $null }
  if ($Entry -is [System.Collections.IDictionary]) {
    if ($Entry.Contains($Name)) { return $Entry[$Name] }
    return $null
  }
  if ($null -ne $Entry.PSObject.Properties[$Name]) {
    return $Entry.PSObject.Properties[$Name].Value
  }
  return $null
}

function Get-CachedImageOcr {
  param(
    [Parameter(Mandatory)][System.IO.FileInfo]$File,
    [Parameter(Mandatory)][hashtable]$Cache,
    [switch]$Force
  )

  $key = $File.FullName.ToLowerInvariant()
  $signature = "$($File.Length)|$($File.LastWriteTimeUtc.Ticks)"

  if (-not $Force -and $Cache.ContainsKey($key) -and $Cache[$key].Signature -eq $signature) {
    $entry = $Cache[$key]
    $cachedText = [string](Get-OcrCacheEntryValue -Entry $entry -Name 'Text')
    $cachedVersion = 0
    [void][int]::TryParse(([string](Get-OcrCacheEntryValue -Entry $entry -Name 'OcrEngineVersion')), [ref]$cachedVersion)
    $cachedLines = @((Get-OcrCacheEntryValue -Entry $entry -Name 'Lines'))
    $cacheHasUsableCodeSignal = (Test-OcrTextHasLikelyProductCode -Text $cachedText)

    if ($cachedVersion -lt 2 -and -not $cacheHasUsableCodeSignal -and $cachedLines.Count -le 3) {
      Write-Host ("OCR cache entry needs enhanced product-code pass: {0}" -f $File.Name)
    } else {
    return [ordered]@{
      Text = $cachedText
      Lines = @($cachedLines)
      TextAngle = Get-OcrCacheEntryValue -Entry $entry -Name 'TextAngle'
      ImageWidth = Get-OcrCacheEntryValue -Entry $entry -Name 'ImageWidth'
      ImageHeight = Get-OcrCacheEntryValue -Entry $entry -Name 'ImageHeight'
      OcrEngineVersion = Get-OcrCacheEntryValue -Entry $entry -Name 'OcrEngineVersion'
      OcrPasses = @((Get-OcrCacheEntryValue -Entry $entry -Name 'OcrPasses'))
      FromCache = $true
    }
    }
  }

  $ocr = Read-ImageOcr -Path $File.FullName
  $Cache[$key] = [ordered]@{
    Signature = $signature
    Text = $ocr.Text
    Lines = $ocr.Lines
    TextAngle = $ocr.TextAngle
    ImageWidth = $ocr.ImageWidth
    ImageHeight = $ocr.ImageHeight
    OcrEngineVersion = $ocr.OcrEngineVersion
    OcrPasses = $ocr.OcrPasses
    UpdatedAt = (Get-Date).ToString('s')
  }
  $ocr.FromCache = $false
  return $ocr
}
