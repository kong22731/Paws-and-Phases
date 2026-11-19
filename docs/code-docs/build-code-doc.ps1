# build-code-doc.ps1 - สร้างเอกสาร "โค้ด + คำอธิบาย" เป็น PDF จากไฟล์ spec (JSON)
#   spec = { title, subtitle, badge, intro (HTML), output, files: [ { path, role, about (HTML), sections: [ { line, title, desc (HTML) } ] } ] }
#   โค้ดทั้งไฟล์ถูกตัดเป็นช่วงตาม "line" ของแต่ละ section (ช่วงหนึ่ง = ตั้งแต่บรรทัดนั้นจนถึงก่อน section ถัดไป)
# วิธีใช้: powershell -ExecutionPolicy Bypass -File docs\code-docs\build-code-doc.ps1 -Spec docs\code-docs\js-spec.json
param([Parameter(Mandatory = $true)][string]$Spec, [switch]$KeepHtml)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Split-Path (Split-Path $here -Parent) -Parent
$utf8 = New-Object System.Text.UTF8Encoding $false
$specPath = if ([IO.Path]::IsPathRooted($Spec)) { $Spec } else { Join-Path $root $Spec }
$S = [IO.File]::ReadAllText($specPath, $utf8) | ConvertFrom-Json

function Esc([string]$t) { return $t.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;') }
# สีคอมเมนต์: บรรทัดที่ขึ้นต้นด้วย // /* * <!-- # (ไม่แตะ // ที่อยู่ในสตริง เช่น https://)
function CodeLine([string]$t) {
  $e = Esc $t
  $trim = $t.TrimStart()
  if ($trim -match '^(//|/\*|\*|<!--|#)') { return "<span class=""c"">$e</span>" }
  $i = $e.IndexOf(' // ')
  if ($i -ge 0) { return $e.Substring(0, $i) + "<span class=""c"">" + $e.Substring($i) + '</span>' }
  return $e
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append([IO.File]::ReadAllText((Join-Path $here 'head.html'), $utf8))
[void]$sb.Append(@"
<div class="cover"><div class="badge">$($S.badge)</div><h1>Paws &amp; Phases</h1><div class="sub">$($S.title)</div><div class="pets">🐶 🐱</div><div class="meta">$($S.subtitle)</div></div>
<section class="part"><h1 class="part-title"><span>เริ่มต้น</span>วิธีอ่านเอกสารนี้</h1>$($S.intro)
<h3>สารบัญไฟล์</h3><table><tr><th>ไฟล์</th><th>เรื่องหลัก</th></tr>
"@)
foreach ($f in $S.files) { [void]$sb.Append("<tr><td><code>$($f.path)</code></td><td>$($f.role)</td></tr>") }
[void]$sb.Append('</table></section>')

$totalLines = 0
foreach ($f in $S.files) {
  $lines = [IO.File]::ReadAllLines((Join-Path $root $f.path), $utf8)
  $n = $lines.Count
  $totalLines += $n
  $secs = @($f.sections | Sort-Object { [int]$_.line })
  [void]$sb.Append("<section class=""part""><h1 class=""file-title""><code>$($f.path)</code><small>$n บรรทัด</small></h1>")
  [void]$sb.Append("<div class=""role""><b>เรื่องหลัก:</b> $($f.role)</div>")
  if ($f.about) { [void]$sb.Append("<div class=""about"">$($f.about)</div>") }
  # ตารางสรุปส่วนต่าง ๆ
  [void]$sb.Append('<table class="map"><tr><th>บรรทัด</th><th>ส่วน</th></tr>')
  for ($i = 0; $i -lt $secs.Count; $i++) {
    $a = [int]$secs[$i].line; $b = if ($i + 1 -lt $secs.Count) { [int]$secs[$i + 1].line - 1 } else { $n }
    [void]$sb.Append("<tr><td>$a–$b</td><td>$($secs[$i].title)</td></tr>")
  }
  [void]$sb.Append('</table>')
  for ($i = 0; $i -lt $secs.Count; $i++) {
    $a = [int]$secs[$i].line; $b = if ($i + 1 -lt $secs.Count) { [int]$secs[$i + 1].line - 1 } else { $n }
    [void]$sb.Append("<div class=""sec""><h3>$($secs[$i].title) <span class=""lines"">บรรทัด $a–$b</span></h3>")
    if ($secs[$i].desc) { [void]$sb.Append("<div class=""expl"">$($secs[$i].desc)</div>") }
    [void]$sb.Append('<div class="src">')
    for ($k = $a; $k -le $b; $k++) {
      $t = $lines[$k - 1]
      [void]$sb.Append("<div class=""l""><span class=""n"">$k</span><span class=""t"">$(CodeLine $t)</span></div>")
    }
    [void]$sb.Append('</div></div>')
  }
  [void]$sb.Append('</section>')
}
[void]$sb.Append("</body></html>")

$base = Join-Path (Split-Path $here -Parent) $S.output
$htmlPath = "$base.html"; $pdfPath = "$base.pdf"
[IO.File]::WriteAllText($htmlPath, $sb.ToString().Replace('{{TOTAL_LINES}}', "$totalLines"), $utf8)
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (Test-Path $pdfPath) { Remove-Item $pdfPath }
$url = 'file:///' + ($htmlPath -replace '\\', '/')
$ErrorActionPreference = 'Continue' # Edge เขียนข้อความเตือนลง stderr (ไม่ใช่ข้อผิดพลาด)
& $edge --headless=new --disable-gpu --no-pdf-header-footer --user-data-dir="$env:TEMP\paws-pdf-profile" --virtual-time-budget=10000 --print-to-pdf="$pdfPath" $url 2>$null | Out-Null
Start-Sleep -Seconds 1
if (-not $KeepHtml) { Remove-Item $htmlPath }
if (-not (Test-Path $pdfPath)) { throw 'PDF was not created' }
$t = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($pdfPath))
Write-Host ("PDF: {0}  ({1} KB, {2} pages, {3} code lines)" -f $pdfPath, [math]::Round((Get-Item $pdfPath).Length / 1KB), ([regex]::Matches($t, '/Type\s*/Page[^s]')).Count, $totalLines)
