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

function Read-ImageOcr {
  param(
    [Parameter(Mandatory)][string]$Path
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
      }
    }

    $lines += [ordered]@{
      Text = $line.Text
      Words = $words
    }
  }

  return [ordered]@{
    Text = $result.Text
    Lines = $lines
    TextAngle = $result.TextAngle
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

function Get-CachedImageOcr {
  param(
    [Parameter(Mandatory)][System.IO.FileInfo]$File,
    [Parameter(Mandatory)][hashtable]$Cache,
    [switch]$Force
  )

  $key = $File.FullName.ToLowerInvariant()
  $signature = "$($File.Length)|$($File.LastWriteTimeUtc.Ticks)"

  if (-not $Force -and $Cache.ContainsKey($key) -and $Cache[$key].Signature -eq $signature) {
    return [ordered]@{
      Text = [string]$Cache[$key].Text
      Lines = @($Cache[$key].Lines)
      TextAngle = $Cache[$key].TextAngle
      FromCache = $true
    }
  }

  $ocr = Read-ImageOcr -Path $File.FullName
  $Cache[$key] = [ordered]@{
    Signature = $signature
    Text = $ocr.Text
    Lines = $ocr.Lines
    TextAngle = $ocr.TextAngle
    UpdatedAt = (Get-Date).ToString('s')
  }
  $ocr.FromCache = $false
  return $ocr
}
