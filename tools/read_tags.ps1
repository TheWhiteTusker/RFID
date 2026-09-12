# Interactive RFID Tag Mapper for Lattice Lane Kiosk
param(
    [string]$PortName = "COM10",
    [int]$BaudRate = 115200
)

$ErrorActionPreference = "Stop"

$products = @(
    @{ slug = "gamebox";            name = "Rubber Wood Game Box (Game Box / Tic Tac Toe)" },
    @{ slug = "puzzle-3pc";          name = "3 Piece Puzzle" },
    @{ slug = "infinity-rectangle";  name = "Infinity Lamp (Rectangle)" },
    @{ slug = "photo-frame";         name = "Magnetic Photo Frame 4x4" },
    @{ slug = "tea-coaster";         name = "Rubber Wood Tea Coaster Set" },
    @{ slug = "desktask";            name = "DeskTask Organiser" },
    @{ slug = "perpetual-calendar";  name = "Perpetual Calendar" }
)

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Lattice Lane - RFID Tag Learning Tool           " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting to $PortName ($BaudRate baud)..." -ForegroundColor Yellow

$port = [System.IO.Ports.SerialPort]::new($PortName, $BaudRate)
$port.ReadTimeout = 500
$port.DtrEnable = $false
$port.RtsEnable = $false

try {
    $port.Open()
} catch {
    Write-Host "Failed to open $PortName : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure Arduino Serial Monitor is closed." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Flush existing buffer
Start-Sleep -Milliseconds 300
$port.DiscardInBuffer()

Write-Host "Connected successfully!" -ForegroundColor Green
Write-Host "NOTE: Reader 0 (Pin 4) is active. Tap tags on Reader 0." -ForegroundColor White
Write-Host ""

$results = [ordered]@{}

foreach ($item in $products) {
    Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Ready for: " -NoNewline -ForegroundColor White
    Write-Host "$($item.name) " -NoNewline -ForegroundColor Yellow
    Write-Host "[$($item.slug)]" -ForegroundColor DarkCyan
    Write-Host ">>> TAP TAG NOW (or press 's' + Enter to skip)..." -ForegroundColor Cyan

    $capturedUID = ""
    $port.DiscardInBuffer()

    while (-not $capturedUID) {
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.KeyChar -eq 's' -or $key.KeyChar -eq 'S') {
                Write-Host "  Skipped." -ForegroundColor DarkYellow
                $capturedUID = ""
                break
            }
        }

        try {
            $line = $port.ReadLine()
            if ($line -match "UID:\s*([0-9A-Fa-f:]+)") {
                $uid = $matches[1].Trim().ToUpper()
                [Console]::Beep(1200, 200)
                Write-Host "  -> Tag Detected! UID: $uid" -ForegroundColor Green
                $capturedUID = $uid
                Start-Sleep -Milliseconds 800
                $port.DiscardInBuffer()
                break
            }
        } catch [System.TimeoutException] {
            # continue loop
        }
    }

    $results[$item.slug] = $capturedUID
    Start-Sleep -Milliseconds 500
}

$port.Close()

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "                  Tag Scan Summary                      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

foreach ($slug in $results.Keys) {
    $uid = $results[$slug]
    $tagDisplay = if ($uid) { $uid } else { "(skipped / none)" }
    Write-Host ("{0,-22} -> {1}" -f $slug, $tagDisplay) -ForegroundColor Yellow
}

# Save results to data/tags.json
$jsonPath = Join-Path $PSScriptRoot "..\data\tags.json"
$results | ConvertTo-Json -Depth 2 | Set-Content -Path $jsonPath -Encoding utf8
Write-Host "`nSaved mapping to $jsonPath" -ForegroundColor Green

# Update rfid_kiosk.ino
$inoPath = Join-Path $PSScriptRoot "..\rfid_kiosk\rfid_kiosk.ino"
if (Test-Path $inoPath) {
    $inoContent = Get-Content $inoPath -Raw
    $newRows = @()
    foreach ($item in $products) {
        $slug = $item.slug
        $uid = if ($results[$slug]) { $results[$slug] } else { "" }
        $comment = $item.name
        $newRows += "  {`"$uid`", `"$slug`"}, // $comment"
    }
    $newTagsBlock = "const Tag TAGS[] = {`r`n" + ($newRows -join "`r`n") + "`r`n};"
    $pattern = 'const Tag TAGS\[\] = \{[\s\S]*?\};'
    $updatedIno = [regex]::Replace($inoContent, $pattern, $newTagsBlock)
    Set-Content -Path $inoPath -Value $updatedIno -Encoding utf8
    Write-Host "Updated rfid_kiosk/rfid_kiosk.ino successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! You can now re-upload the sketch in Arduino IDE." -ForegroundColor Cyan
Read-Host "Press Enter to exit"
