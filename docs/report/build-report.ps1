# build-report.ps1 - print the report pages (3.9, 3.10, 3.11) to PDF files in docs/report with Microsoft Edge
# Run make-flowchart.ps1 first if the flowchart changed
$here = $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$pages = [ordered]@{ '3.9-ai-diagram' = '3.9-AI-Concept-Diagram'; '3.10-flowchart' = '3.10-Program-Flowchart'; '3.11-ai-technical' = '3.11-AI-Technical-Explanation' }
foreach ($k in $pages.Keys) {
  $pdf = Join-Path $here "$($pages[$k]).pdf"
  if (Test-Path $pdf) { Remove-Item $pdf }
  $url = 'file:///' + ((Join-Path $here "$k.html") -replace '\\', '/')
  & $edge --headless=new --disable-gpu --no-pdf-header-footer --user-data-dir="$env:TEMP\paws-pdf-profile" --virtual-time-budget=6000 --print-to-pdf="$pdf" $url 2>$null | Out-Null
  Start-Sleep -Milliseconds 500
  $t = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($pdf))
  Write-Host ("{0}  ({1} KB, {2} pages)" -f (Split-Path $pdf -Leaf), [math]::Round((Get-Item $pdf).Length / 1KB), ([regex]::Matches($t, '/Type\s*/Page[^s]')).Count)
}
