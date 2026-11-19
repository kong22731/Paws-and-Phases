# build.ps1 - รวมไฟล์คำอธิบาย (00-*.html ... 08-*.html) เป็นหน้าเดียว แล้วพิมพ์เป็น PDF ด้วย Microsoft Edge
# วิธีใช้: powershell -ExecutionPolicy Bypass -File docs\explain\build.ps1
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$docs = Split-Path $here -Parent
$utf8 = New-Object System.Text.UTF8Encoding $false

$head = [IO.File]::ReadAllText((Join-Path $here 'head.html'), $utf8)
$parts = Get-ChildItem $here -File | Where-Object { $_.Name -match '^\d\d-.*\.html$' } | Sort-Object Name | ForEach-Object { [IO.File]::ReadAllText($_.FullName, $utf8) }
$html = $head + "`n" + ($parts -join "`n") + "`n</body>`n</html>`n"
$htmlPath = Join-Path $docs 'Paws-and-Phases-Code-Explained.html'
[IO.File]::WriteAllText($htmlPath, $html, $utf8)

$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge not found' }
$pdfPath = Join-Path $docs 'Paws-and-Phases-Code-Explained.pdf'
$url = 'file:///' + ($htmlPath -replace '\\', '/')
$profileDir = Join-Path $env:TEMP 'paws-pdf-profile'
& $edge --headless=new --disable-gpu --no-pdf-header-footer --user-data-dir="$profileDir" --virtual-time-budget=8000 --print-to-pdf="$pdfPath" $url | Out-Null
Start-Sleep -Seconds 1
if (Test-Path $pdfPath) { Write-Host "PDF: $pdfPath ($([math]::Round((Get-Item $pdfPath).Length / 1KB)) KB)" } else { throw 'PDF was not created' }
