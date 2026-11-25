# make-flowchart.ps1 - build the program flowchart as a draw.io file (3.10-flowchart.drawio) and the same chart as SVG (for the PDF)
# Open the .drawio file in draw.io (app.diagrams.net or draw.io desktop) to edit it
$here = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding $false

# ---------- nodes: id, type (term/proc/ai/dec/io), center x, top y, width, height, label ('|' = new line) ----------
$Nodes = [ordered]@{}
function Node($id, $type, $cx, $y, $w, $h, $label) { $script:Nodes[$id] = @{ id = $id; type = $type; cx = $cx; y = $y; w = $w; h = $h; label = $label } }
Node 'start' 'term' 230 10 180 38 'เริ่ม: เปิดเกม'
Node 'boot'  'proc' 230 66 250 44 'BootScene|โหลดภาพ เสียง ไอเทม'
Node 'title' 'proc' 230 130 200 38 'TitleScene: หน้าปก'
Node 'menu1' 'dec'  230 188 210 78 'START หรือ|Continue?'
Node 'breed' 'io'   230 290 240 46 'เลือกหมา/แมว + ตั้งชื่อ'
Node 'make'  'proc' 230 356 240 46 'สร้างสัตว์ +|บันทึกลงไฟล์ว่าง'
Node 'load'  'io'   470 203 190 48 'เลือกไฟล์เซฟ|(Load Game)'
Node 'day'   'proc' 230 424 200 38 'DayScene: แสดง Day N'
Node 'game'  'proc' 230 482 200 38 'GameScene: หน้าเลี้ยง'
Node 'tick'  'proc' 230 540 260 44 'ทุกเฟรม: เวลาเดิน|ค่าสถานะลดลง'
Node 'emo'   'ai'   230 604 280 52 '1.1 Emotion AI + 1.3 Care Advisor|อารมณ์ + คำแนะนำ (ทุก 0.5 วิ)'
Node 'act'   'dec'  230 676 210 80 'ผู้เล่น|ทำอะไร?'
Node 'item'  'proc' 70 786 140 60 'ใช้ไอเทม|ค่าเปลี่ยน +|เก็บแต้มดูแล'
Node 'chat'  'ai'   230 786 150 60 '1.4 Chatbot|จับเจตนา →|ตอบตามบุคลิก'
Node 'pop'   'proc' 395 786 140 60 'เปิด Menu /|Book / Hint'
Node 'over'  'dec'  230 876 190 78 'หมดวัน|แล้ว?'
Node 'end'   'term' 395 966 140 38 'Main Menu: จบ'
Node 'next'  'io'   640 516 220 44 'กด NEXT DAY'
Node 'evo'   'ai'   640 582 250 56 '1.2 Evolution AI|วิเคราะห์สัดส่วนการดูแลทั้งวัน'
Node 'res'   'dec'  640 660 210 80 'ผลการ|ตัดสิน?'
Node 'evs'   'proc' 580 770 130 58 'EvolutionScene|ร่างใหม่ +|เหตุผล AI'
Node 'msg'   'proc' 722 770 116 58 'แจ้งผล|ในแชท'
Node 'save'  'proc' 640 866 230 46 'บันทึกอัตโนมัติ +|เริ่มวันใหม่'

# ---------- edges: from, from side, to, to side, label, waypoints (x,y pairs) ----------
$Edges = New-Object System.Collections.ArrayList
function Edge($a, $sa, $b, $sb, $label, $pts, $lx, $ly, $la) { [void]$script:Edges.Add(@{ a = $a; sa = $sa; b = $b; sb = $sb; label = $label; pts = $pts; lx = $lx; ly = $ly; la = $la }) }
Edge 'start' 'b' 'boot' 't' '' @()
Edge 'boot' 'b' 'title' 't' '' @()
Edge 'title' 'b' 'menu1' 't' '' @()
Edge 'menu1' 'b' 'breed' 't' 'START' @() 238 283 'start'
Edge 'menu1' 'r' 'load' 'l' 'Continue' @()
Edge 'breed' 'b' 'make' 't' '' @()
Edge 'make' 'b' 'day' 't' '' @()
Edge 'load' 'b' 'day' 'r' '' @(470, 443)
Edge 'day' 'b' 'game' 't' '' @()
Edge 'game' 'b' 'tick' 't' '' @()
Edge 'tick' 'b' 'emo' 't' '' @()
Edge 'emo' 'b' 'act' 't' '' @()
Edge 'act' 'l' 'item' 't' 'ใช้ไอเทม' @(70, 716)
Edge 'act' 'b' 'chat' 't' 'คุยแชท' @() 238 774 'start'
Edge 'act' 'r' 'pop' 't' 'เปิดเมนู' @(395, 716)
Edge 'item' 'b' 'over' 't' '' @(70, 862, 230, 862)
Edge 'chat' 'b' 'over' 't' '' @()
Edge 'pop' 'b' 'over' 't' '' @(395, 862, 230, 862)
Edge 'pop' 'r' 'end' 'r' 'Main Menu' @(482, 816, 482, 985) 476 866 'end'
Edge 'over' 'l' 'tick' 'l' 'ไม่' @(14, 915, 14, 562)
Edge 'over' 'r' 'next' 'l' 'ใช่' @(512, 915, 512, 538)
Edge 'next' 'b' 'evo' 't' '' @()
Edge 'evo' 'b' 'res' 't' '' @()
Edge 'res' 'l' 'evs' 't' 'ขึ้น/ถอยร่าง' @(580, 700) 584 748 'start'
Edge 'res' 'r' 'msg' 't' 'คง/เตือน' @(722, 700) 726 748 'start'
Edge 'evs' 'b' 'save' 't' '' @(580, 848, 640, 848)
Edge 'msg' 'b' 'save' 't' '' @(722, 848, 640, 848)
Edge 'save' 'r' 'day' 'r' 'วันถัดไป' @(772, 889, 772, 452, 330, 452) 766 500 'end'

function Anchor($n, $side) {
  switch ($side) {
    't' { return @($n.cx, $n.y) }
    'b' { return @($n.cx, $n.y + $n.h) }
    'l' { return @(($n.cx - $n.w / 2), ($n.y + $n.h / 2)) }
    'r' { return @(($n.cx + $n.w / 2), ($n.y + $n.h / 2)) }
  }
}
function Esc([string]$t) { return $t.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;') }

# ---------- SVG ----------
$script:labels = @()
$SW = 790; $SH = 1020
$svg = New-Object System.Text.StringBuilder
[void]$svg.Append("<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 $SW $SH"" width=""100%"">")
[void]$svg.Append('<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#5d5f33"/></marker></defs>')
[void]$svg.Append('<style>text{font-family:"Leelawadee UI",Tahoma,sans-serif} .l{font-size:12px;fill:#23241a} .e{font-size:11px;fill:#17707a;font-weight:700} .ln{stroke:#5d5f33;stroke-width:1.8;fill:none;marker-end:url(#a)}</style>')
$style = @{
  term = @{ fill = '#7a7d47'; stroke = '#5d5f33'; text = '#ffffff' }
  proc = @{ fill = '#ffffff'; stroke = '#7a7d47'; text = '#23241a' }
  ai   = @{ fill = '#fdebe6'; stroke = '#e0533a'; text = '#23241a' }
  dec  = @{ fill = '#e6f8fa'; stroke = '#20a6b5'; text = '#23241a' }
  io   = @{ fill = '#f3f4e3'; stroke = '#b2b579'; text = '#23241a' }
}
foreach ($e in $Edges) {
  $a = Anchor $Nodes[$e.a] $e.sa; $b = Anchor $Nodes[$e.b] $e.sb
  $pts = @($a[0], $a[1]) + $e.pts + @($b[0], $b[1])
  $d = 'M' + (($(for ($i = 0; $i -lt $pts.Count; $i += 2) { "$($pts[$i]) $($pts[$i+1])" })) -join ' L')
  [void]$svg.Append("<path class=""ln"" d=""$d""/>")
  if ($e.label) {
    if ($e.lx) { $lx = $e.lx; $ly = $e.ly; $anchor = $e.la }
    else {
      $lx = ($pts[0] + $pts[2]) / 2; $ly = ($pts[1] + $pts[3]) / 2
      if ($pts[0] -eq $pts[2]) { $lx += 6; $anchor = 'start' } else { $ly -= 5; $anchor = 'middle' }
    }
    $script:labels += "<text class=""e"" x=""$lx"" y=""$ly"" text-anchor=""$anchor"" paint-order=""stroke"" stroke=""#ffffff"" stroke-width=""4"">$(Esc $e.label)</text>"
  }
}
foreach ($n in $Nodes.Values) {
  $s = $style[$n.type]; $x = $n.cx - $n.w / 2; $y = $n.y; $w = $n.w; $h = $n.h
  $sw = if ($n.type -eq 'ai') { 2.6 } else { 2 }
  switch ($n.type) {
    'term' { [void]$svg.Append("<rect x=""$x"" y=""$y"" width=""$w"" height=""$h"" rx=""$($h/2)"" fill=""$($s.fill)"" stroke=""$($s.stroke)"" stroke-width=""2""/>") }
    'dec'  { [void]$svg.Append("<polygon points=""$($n.cx),$y $($x+$w),$($y+$h/2) $($n.cx),$($y+$h) $x,$($y+$h/2)"" fill=""$($s.fill)"" stroke=""$($s.stroke)"" stroke-width=""2""/>") }
    'io'   { $k = 12; [void]$svg.Append("<polygon points=""$($x+$k),$y $($x+$w),$y $($x+$w-$k),$($y+$h) $x,$($y+$h)"" fill=""$($s.fill)"" stroke=""$($s.stroke)"" stroke-width=""2""/>") }
    default { [void]$svg.Append("<rect x=""$x"" y=""$y"" width=""$w"" height=""$h"" rx=""7"" fill=""$($s.fill)"" stroke=""$($s.stroke)"" stroke-width=""$sw""/>") }
  }
  $lines = $n.label -split '\|'
  $lh = 15; $ty = $y + $h / 2 - ($lines.Count - 1) * $lh / 2 + 4
  $weight = if ($n.type -eq 'ai') { ' font-weight="700"' } else { '' }
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $fw = if ($i -eq 0 -and $n.type -eq 'ai') { ' font-weight="700"' } else { '' }
    [void]$svg.Append("<text class=""l"" x=""$($n.cx)"" y=""$($ty + $i * $lh)"" text-anchor=""middle"" fill=""$($s.text)""$fw>$(Esc $lines[$i])</text>")
  }
}
foreach ($l in $script:labels) { [void]$svg.Append($l) }
[void]$svg.Append('</svg>')
[IO.File]::WriteAllText((Join-Path $here 'flowchart.svg'), $svg.ToString(), $utf8)

# ---------- draw.io ----------
$dstyle = @{
  term = 'rounded=1;whiteSpace=wrap;html=1;arcSize=50;fillColor=#7a7d47;strokeColor=#5d5f33;fontColor=#ffffff;fontStyle=1;'
  proc = 'rounded=1;whiteSpace=wrap;html=1;arcSize=14;fillColor=#ffffff;strokeColor=#7a7d47;strokeWidth=2;'
  ai   = 'rounded=1;whiteSpace=wrap;html=1;arcSize=14;fillColor=#fdebe6;strokeColor=#e0533a;strokeWidth=3;fontStyle=1;'
  dec  = 'rhombus;whiteSpace=wrap;html=1;fillColor=#e6f8fa;strokeColor=#20a6b5;strokeWidth=2;'
  io   = 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;size=0.08;fillColor=#f3f4e3;strokeColor=#b2b579;strokeWidth=2;'
}
$side = @{ t = @(0.5, 0); b = @(0.5, 1); l = @(0, 0.5); r = @(1, 0.5) }
$x = New-Object System.Text.StringBuilder
[void]$x.Append('<mxfile host="app.diagrams.net"><diagram name="3.10 Flowchart" id="paws-flow"><mxGraphModel dx="1000" dy="1100" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>')
foreach ($n in $Nodes.Values) {
  $label = Esc (($n.label -split '\|') -join '<br>')
  [void]$x.Append("<mxCell id=""$($n.id)"" value=""$label"" style=""$($dstyle[$n.type])fontFamily=Leelawadee UI;fontSize=12;"" vertex=""1"" parent=""1""><mxGeometry x=""$($n.cx - $n.w / 2 + 18)"" y=""$($n.y + 40)"" width=""$($n.w)"" height=""$($n.h)"" as=""geometry""/></mxCell>")
}
$i = 0
foreach ($e in $Edges) {
  $i++
  $sa = $side[$e.sa]; $sb = $side[$e.sb]
  $st = "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endFill=1;strokeColor=#5d5f33;strokeWidth=2;fontColor=#17707a;fontStyle=1;fontSize=11;exitX=$($sa[0]);exitY=$($sa[1]);exitDx=0;exitDy=0;entryX=$($sb[0]);entryY=$($sb[1]);entryDx=0;entryDy=0;"
  $pts = ''
  if ($e.pts.Count) { $pts = '<Array as="points">' + (($(for ($k = 0; $k -lt $e.pts.Count; $k += 2) { "<mxPoint x=""$($e.pts[$k] + 18)"" y=""$($e.pts[$k+1] + 40)""/>" })) -join '') + '</Array>' }
  [void]$x.Append("<mxCell id=""e$i"" value=""$(Esc $e.label)"" style=""$st"" edge=""1"" parent=""1"" source=""$($e.a)"" target=""$($e.b)""><mxGeometry relative=""1"" as=""geometry"">$pts</mxGeometry></mxCell>")
}
# legend
[void]$x.Append('<mxCell id="title" value="&lt;b&gt;3.10 ผังงานการทำงานของโปรแกรม Paws &amp;amp; Phases&lt;/b&gt;" style="text;html=1;fontSize=16;fontFamily=Leelawadee UI;align=left;" vertex="1" parent="1"><mxGeometry x="18" y="5" width="520" height="28" as="geometry"/></mxCell>')
[void]$x.Append('<mxCell id="lg" value="กรอบสีแดง = ส่วนที่ AI ทำงาน" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fdebe6;strokeColor=#e0533a;strokeWidth=3;fontStyle=1;fontFamily=Leelawadee UI;" vertex="1" parent="1"><mxGeometry x="560" y="60" width="230" height="34" as="geometry"/></mxCell>')
[void]$x.Append('</root></mxGraphModel></diagram></mxfile>')
[IO.File]::WriteAllText((Join-Path $here '3.10-flowchart.drawio'), $x.ToString(), $utf8)
Write-Host "flowchart.svg + 3.10-flowchart.drawio written"
