# build-guide.ps1 - print docs/guide/game-guide.html to docs/Paws-and-Phases-Game-Guide.pdf with Microsoft Edge
# Screenshots in docs/guide/img come from make-shots.ps1
$here = $PSScriptRoot
$docs = Split-Path $here -Parent
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$pdf = Join-Path $docs 'Paws-and-Phases-Game-Guide.pdf'
if (Test-Path $pdf) { Remove-Item $pdf }
$url = 'file:///' + ((Join-Path $here 'game-guide.html') -replace '\\', '/')
& $edge --headless=new --disable-gpu --no-pdf-header-footer --user-data-dir="$env:TEMP\paws-pdf-profile" --virtual-time-budget=10000 --print-to-pdf="$pdf" $url 2>$null | Out-Null
Start-Sleep -Seconds 1
$t = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($pdf))
Write-Host ("PDF: {0} ({1} KB, {2} pages)" -f $pdf, [math]::Round((Get-Item $pdf).Length / 1KB), ([regex]::Matches($t, '/Type\s*/Page[^s]')).Count)
