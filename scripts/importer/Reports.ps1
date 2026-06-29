Set-StrictMode -Version Latest

function ConvertTo-ReportRow {
  param(
    [Parameter(Mandatory)][string]$Status,
    [Parameter(Mandatory)][string]$File,
    [AllowNull()][string]$ProductNumber,
    [AllowNull()][string]$ProductName,
    [AllowNull()][string]$Reason,
    [AllowNull()][string]$Warnings,
    [AllowNull()][string]$ImagePath,
    [AllowNull()][string]$OcrText
  )

  return [pscustomobject]@{
    Status = $Status
    File = $File
    ProductNumber = $ProductNumber
    ProductName = $ProductName
    Reason = $Reason
    Warnings = $Warnings
    ImagePath = $ImagePath
    OcrText = $OcrText
  }
}

function Save-ImportReports {
  param(
    [Parameter(Mandatory)][string]$ProjectRoot,
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$ReportRows,
    [Parameter(Mandatory)][AllowEmptyCollection()][array]$ReviewRows,
    [Parameter(Mandatory)][hashtable]$Summary,
    [switch]$DryRun
  )

  $reportDir = Join-Path $ProjectRoot 'whatsapp-import\reports'
  $reviewDir = Join-Path $ProjectRoot 'whatsapp-import\review'
  if (-not $DryRun) {
    New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
    New-Item -ItemType Directory -Force -Path $reviewDir | Out-Null
  }

  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $reportCsv = Join-Path $reportDir "import-report-$timestamp.csv"
  $reportJson = Join-Path $reportDir "import-report-$timestamp.json"
  $latestCsv = Join-Path $reportDir 'import-report-latest.csv'
  $latestJson = Join-Path $reportDir 'import-report-latest.json'
  $reviewCsv = Join-Path $reviewDir "unrecognized-products-$timestamp.csv"
  $latestReviewCsv = Join-Path $reviewDir 'unrecognized-products.csv'

  $payload = [ordered]@{
    summary = $Summary
    rows = $ReportRows
  }

  if (-not $DryRun) {
    $ReportRows | Export-Csv -LiteralPath $reportCsv -NoTypeInformation -Encoding UTF8 -Force
    $payload | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $reportJson -Encoding UTF8
    $ReviewRows | Export-Csv -LiteralPath $reviewCsv -NoTypeInformation -Encoding UTF8 -Force
    try {
      $ReportRows | Export-Csv -LiteralPath $latestCsv -NoTypeInformation -Encoding UTF8 -Force
      $payload | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $latestJson -Encoding UTF8
      $ReviewRows | Export-Csv -LiteralPath $latestReviewCsv -NoTypeInformation -Encoding UTF8 -Force
    } catch {
      Write-Warning "Could not update one of the fixed 'latest' report files, probably because OneDrive is holding a placeholder lock. Timestamped reports were still written. $($_.Exception.Message)"
    }
  }

  return [ordered]@{
    ReportCsv = $reportCsv
    ReportJson = $reportJson
    LatestCsv = $latestCsv
    LatestJson = $latestJson
    ReviewCsv = $reviewCsv
    LatestReviewCsv = $latestReviewCsv
  }
}
