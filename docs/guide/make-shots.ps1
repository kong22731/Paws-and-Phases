# make-shots.ps1 - capture game screenshots for the game guide (needs the local server: serve.ps1 on port 8080)
# Usage: powershell -ExecutionPolicy Bypass -File docs\guide\make-shots.ps1 [-Only game,menu]
param([string]$Only = '')
$Only = @($Only -split ',' | Where-Object { $_ })
$here = $PSScriptRoot
$root = Split-Path (Split-Path $here -Parent) -Parent
$utf8 = New-Object System.Text.UTF8Encoding $false
# shots.html = index.html + <base href="/"> + shots-setup.js
$src = [IO.File]::ReadAllText((Join-Path $root 'index.html'), $utf8)
$src = $src.Replace('<head>', "<head>`n  <base href=""/"">").Replace('</body>', "  <script src=""docs/guide/shots-setup.js""></script>`n</body>")
[IO.File]::WriteAllText((Join-Path $here 'shots.html'), $src, $utf8)

$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$shots = [ordered]@{ title = 6000; breed = 6000; name = 6000; day = 5000; game = 8000; chat = 14000; grooming = 8000; items = 8000; rest = 8000; nextday = 7000; hint = 8000; profile = 8000; menu = 8000; book = 8000; bookpage = 8000; evolution = 14000; slots = 6000 }
$ErrorActionPreference = 'Continue'
# Edge saves PNG; the guide uses JPEG (much smaller PDF)
Add-Type -AssemblyName System.Drawing
$jpeg = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$jpegParams = New-Object Drawing.Imaging.EncoderParameters 1
$jpegParams.Param[0] = New-Object Drawing.Imaging.EncoderParameter -ArgumentList @([Drawing.Imaging.Encoder]::Quality, [long]85)
foreach ($k in $shots.Keys) {
  if ($Only -and -not ($Only -contains $k)) { continue }
  $out = Join-Path $env:TEMP "paws-shot-$k.png"
  if (Test-Path $out) { Remove-Item $out }
  $profileDir = Join-Path $env:TEMP "paws-shot-$k"
  if (Test-Path $profileDir) { Remove-Item -Recurse -Force $profileDir }
  & $edge --headless=new --hide-scrollbars --user-data-dir="$profileDir" --window-size=1320,664 --virtual-time-budget=$($shots[$k]) --screenshot="$out" "http://localhost:8080/docs/guide/shots.html?s=$k" 2>$null | Out-Null
  $jpg = Join-Path $here "img\$k.jpg"
  if (Test-Path $out) {
    $im = [Drawing.Image]::FromFile($out)
    try { $im.Save($jpg, $jpeg, $jpegParams) } finally { $im.Dispose() }
    Remove-Item $out
  }
  Write-Host ("{0,-10} {1}" -f $k, $(if (Test-Path $jpg) { "$([math]::Round((Get-Item $jpg).Length / 1KB)) KB" } else { 'FAILED' }))
}
Remove-Item (Join-Path $here 'shots.html')
