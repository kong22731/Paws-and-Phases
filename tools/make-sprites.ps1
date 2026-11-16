<#
  make-sprites.ps1 — แปลงรูปตัวละครต้นฉบับ (ไฟล์ใหญ่ พื้นขาว) ให้เป็นรูปเล็กพื้นใสสำหรับเกม

  อ่านจาก:
    assets/Dog (Starter).png, assets/Cat (Starter).png                 -> ร่างที่ 1
    assets/Evolution Route/<ชื่อสาย> Route/<Dog|Cat> Stages/<2-5>.png  -> ร่างที่ 2-5
  เขียนไปที่:
    assets/sprites/body/<key>.png       ตัวเต็ม (ลบพื้นขาว ตัดขอบ ย่อ)
    assets/sprites/portrait/<key>.png   รูปหัว (สี่เหลี่ยมจัตุรัส เกมจะตัดเป็นวงกลมเอง)
    assets/sprites/manifest.js          รายการรูปทั้งหมด (index.html โหลดไฟล์นี้)

  รูปที่พื้นหลังไม่ใช่สีขาว (เช่น ฉากกลางคืน) จะเก็บพื้นหลังไว้ และเกมจะแสดงเป็นกรอบรูปแทน

  วิธีใช้: คลิกขวา > Run with PowerShell  หรือ
           powershell -ExecutionPolicy Bypass -File tools\make-sprites.ps1
  เพิ่ม/เปลี่ยนรูปเมื่อไหร่ ให้รันสคริปต์นี้ใหม่
#>
param(
  [int]$BodyMax = 360,      # ด้านที่ยาวที่สุดของรูปตัวเต็ม (px)
  [int]$PortraitSize = 220, # ขนาดรูปหัว (px)
  [switch]$Review           # สร้างรูปตรวจสอบใน assets/sprites/review (ฟ้า = ช่องที่ลบ, เขียว = สีขาวที่เก็บไว้)
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $root 'assets'
$outBody = Join-Path $assets 'sprites\body'
$outPortrait = Join-Path $assets 'sprites\portrait'
$outReview = Join-Path $assets 'sprites\review'
# ล้างไฟล์เก่าก่อน (Windows ไม่เปลี่ยนตัวพิมพ์ของชื่อไฟล์เดิมเวลาเขียนทับ)
foreach ($d in $outBody, $outPortrait, $outReview) { if (Test-Path $d) { Remove-Item -Recurse -Force $d } }
New-Item -ItemType Directory -Force $outBody, $outPortrait | Out-Null
if ($Review) { New-Item -ItemType Directory -Force $outReview | Out-Null }

# อ่านไฟล์แก้ไขด้วยมือ tools/sprite-fixes.txt  (บรรทัดละ: <key> <remove|keep> <x> <y>)
$fixes = @{}
$fixFile = Join-Path $PSScriptRoot 'sprite-fixes.txt'
if (Test-Path $fixFile) {
  foreach ($ln in Get-Content $fixFile -Encoding UTF8) {
    $t = ($ln -replace '#.*$', '').Trim()
    if (-not $t) { continue }
    $p = $t -split '\s+'
    if ($p[1] -eq 'pockets' -and $p.Count -ge 3) { $entry = "pockets:$($p[2])" }
    elseif ($p[1] -eq 'strict' -or $p[1] -eq 'keepshadow') { $entry = "$($p[1]):1" }
    elseif ($p.Count -ge 4) { $entry = "$($p[1]):$($p[2]),$($p[3])" }
    else { continue }
    $fixes[$p[0]] = (@($fixes[$p[0]]) + $entry | Where-Object { $_ }) -join ';'
  }
}

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SpriteTool {
  public static List<string> Log = new List<string>(); // รายการช่องสีขาวขนาดใหญ่ (แสดงตอนใช้ -Review)
  // คืนค่า "cutout" ถ้าพื้นหลังเป็นสีขาว (ลบพื้นหลังแล้ว), "scene" ถ้าเป็นภาพฉาก (เก็บพื้นหลังไว้)
  // fixes = "remove:x,y;keep:x,y" (x,y เป็นสัดส่วน 0-1 ของรูปต้นฉบับ) ใช้บังคับลบ/เก็บช่องสีขาวที่ถูกล้อมไว้
  // debugOut = path รูปตรวจสอบ (ช่องที่ลบ = ฟ้า, ช่องสีขาวที่เก็บไว้ = เขียว) หรือ "" ถ้าไม่ต้องการ
  public static string Process(string src, string bodyOut, string portraitOut, int bodyMax, int portraitSize, string fixes, string debugOut) {
    using (var orig = new Bitmap(src))
    using (var bmp = new Bitmap(orig.Width, orig.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bmp)) g.DrawImage(orig, 0, 0, orig.Width, orig.Height);
      int W = bmp.Width, H = bmp.Height, N = W * H;
      var rect = new Rectangle(0, 0, W, H);
      var bd = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      var px = new byte[N * 4];
      Marshal.Copy(bd.Scan0, px, 0, px.Length);

      // 1) ตรวจว่าขอบภาพเป็นสีขาวไหม
      int white = 0, total = 0;
      for (int x = 0; x < W; x += 6) { total += 2; if (IsWhite(px, x)) white++; if (IsWhite(px, (H - 1) * W + x)) white++; }
      for (int y = 0; y < H; y += 6) { total += 2; if (IsWhite(px, y * W)) white++; if (IsWhite(px, y * W + W - 1)) white++; }
      bool whiteBg = white > total * 0.85;

      int minX = 0, minY = 0, maxX = W - 1, maxY = H - 1;
      byte[] mark = null; // สำหรับรูปตรวจสอบ: 1 = ช่องที่ลบ, 2 = ช่องสีขาวที่เก็บไว้
      if (whiteBg) {
        // 2) flood fill จากขอบ: ลบพิกเซลสีอ่อน/ไม่อิ่มตัว (พื้นขาว + เงาจาง ๆ) ที่ต่อกับขอบ
        var bg = new bool[N];
        var q = new int[N];
        int head = 0, tail = 0;
        Action<int> push = null;
        // "strict" (ใน sprite-fixes.txt) = ลบเฉพาะสีขาวเกือบล้วน ใช้กับรูปที่มีฟอง/เมฆสีอ่อนติดขอบ (กันไม่ให้ถูกลบไปด้วย)
        bool strict = (fixes ?? "").Contains("strict");
        push = (int p) => { if (!bg[p] && (strict ? IsBgStrict(px, p) : IsBg(px, p))) { bg[p] = true; q[tail++] = p; } };
        for (int x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
        for (int y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
        while (head < tail) {
          int p = q[head++], x = p % W, y = p / W;
          if (x > 0) push(p - 1); if (x < W - 1) push(p + 1);
          if (y > 0) push(p - W); if (y < H - 1) push(p + W);
        }
        // 2a) เงาพื้นใต้เท้า (สีชมพู/เบจ/เทาอ่อน ไม่มีเส้นขอบ) — ลบออก เพราะในเกมวาดเงาเองแล้ว
        //     ไล่จากพื้นหลังเข้าไปเฉพาะส่วนล่าง 25% ของภาพ และเฉพาะสีโทนอุ่น/เทา (ไม่กินเมฆ/ฟองสีม่วงฟ้า)
        if (!(fixes ?? "").Contains("keepshadow")) {
          int yMin = (int)(H * 0.75);
          Func<int, bool> isShadow = p => {
            if (p / W < yMin) return false;
            int b0 = px[p * 4], g0 = px[p * 4 + 1], r0 = px[p * 4 + 2];
            int mn = Math.Min(r0, Math.Min(g0, b0)), mx = Math.Max(r0, Math.Max(g0, b0));
            return mn >= 140 && mx >= 190 && (mx - mn) <= 90 && r0 >= g0 - 6 && b0 <= g0 + 12;
          };
          head = 0; tail = 0;
          for (int p = yMin * W; p < N; p++) if (bg[p]) q[tail++] = p;
          while (head < tail) {
            int p = q[head++], x = p % W, y = p / W;
            int[] nb = { x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > yMin ? p - W : -1, y < H - 1 ? p + W : -1 };
            foreach (int n in nb) if (n >= 0 && !bg[n] && isShadow(n)) { bg[n] = true; q[tail++] = n; }
          }
        }

        // 2b) ช่องสีขาวที่ถูกล้อมไว้ (เช่น ช่องระหว่างขา ระหว่างตัวกับหาง) flood fill จากขอบเข้าไม่ถึง
        //     สีเหมือนพื้นหลังทุกประการ จึงแยกจากสีขาวในภาพ (ฟอง เมฆ แสงสะท้อน) ด้วย "ขอบ":
        //     ช่องพื้นหลังจะตัดกับเส้นขอบทันที ส่วนสีขาวในภาพจะค่อย ๆ ไล่เป็นเงาสีอ่อน
        mark = new byte[N];
        var fixList = new List<int[]>(); // { remove(1/0), pixelIndex }
        int pocketLight = -1;             // "pockets:<n>" = ลบทุกช่อง (ทุกขนาด) ที่ขอบมีเงาสีอ่อน ≤ n%
        foreach (var f in (fixes ?? "").Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)) {
          var kv = f.Split(':');
          if (kv[0].Trim() == "pockets") { pocketLight = int.Parse(kv[1].Split(',')[0]); continue; }
          if (kv[0].Trim() == "strict" || kv[0].Trim() == "keepshadow") continue;
          var xy = kv[1].Split(',');
          int fx = (int)(double.Parse(xy[0], System.Globalization.CultureInfo.InvariantCulture) * W);
          int fy = (int)(double.Parse(xy[1], System.Globalization.CultureInfo.InvariantCulture) * H);
          fixList.Add(new[] { kv[0].Trim() == "remove" ? 1 : 0, Math.Max(0, Math.Min(H - 1, fy)) * W + Math.Max(0, Math.Min(W - 1, fx)) });
        }
        var pid = new int[N];
        for (int i = 0; i < N; i++) pid[i] = -1;
        int minPocket = (int)(N * 0.00015), nextId = 0;
        for (int s = 0; s < N; s++) {
          if (bg[s] || pid[s] != -1 || !IsPocketWhite(px, s)) continue;
          int id = nextId++; head = 0; tail = 0; q[tail++] = s; pid[s] = id;
          while (head < tail) {
            int p = q[head++], x = p % W, y = p / W;
            int[] nb = { x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1 };
            foreach (int n in nb) if (n >= 0 && !bg[n] && pid[n] == -1 && IsPocketWhite(px, n)) { pid[n] = id; q[tail++] = n; }
          }
          bool forced = false, remove = false;
          foreach (var f in fixList) {
            // ยอมให้จุดคลาดเคลื่อนได้ ±4 px
            int fx0 = f[1] % W, fy0 = f[1] / W; bool hit = false;
            for (int dy = -4; dy <= 4 && !hit; dy++) for (int dx = -4; dx <= 4 && !hit; dx++) {
              int xx = fx0 + dx, yy = fy0 + dy;
              if (xx >= 0 && yy >= 0 && xx < W && yy < H && pid[yy * W + xx] == id) hit = true;
            }
            if (hit) { forced = true; remove = f[0] == 1; }
          }
          if (!forced) {
            if (tail < minPocket) continue;
            // วงรอบนอก 5px: dark = เส้นขอบเข้ม, light = สีอ่อนที่ไม่ใช่ขาวล้วน (เงาไล่สี)
            int ring = 0, dark = 0, light = 0;
            for (int k = 0; k < tail; k += 3) {
              int p = q[k], x = p % W, y = p / W;
              int[] dx = { 5, -5, 0, 0 }, dy = { 0, 0, 5, -5 };
              for (int j = 0; j < 4; j++) {
                int xx = x + dx[j], yy = y + dy[j];
                if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                int pp = yy * W + xx; if (pid[pp] == id) continue;
                ring++;
                int b0 = px[pp * 4], g0 = px[pp * 4 + 1], r0 = px[pp * 4 + 2];
                int mn = Math.Min(r0, Math.Min(g0, b0)), mx = Math.Max(r0, Math.Max(g0, b0));
                if (mx < 120) dark++; else if (mn >= 200) light++;
              }
            }
            int dk = ring > 0 ? dark * 100 / ring : 0, lt = ring > 0 ? light * 100 / ring : 100;
            // ลบอัตโนมัติเฉพาะช่องใหญ่ที่ล้อมด้วยเส้นขอบเข้ม (ช่องเล็ก เช่น แสงในตา ลายเท้าบนผ้า จะไม่ถูกแตะ)
            bool big = tail >= N * 0.002;
            remove = (big && dk >= 35 && lt <= 50) || (pocketLight >= 0 && lt <= pocketLight);
            if (tail >= N * 0.0005) Log.Add(string.Format("    {0} {1:0.000} {2:0.000}  size={3} dark={4}% light={5}%",
              remove ? "auto-remove" : "kept       ", (double)(q[0] % W) / W, (double)(q[0] / W) / H, tail, dk, lt));
          }
          for (int k = 0; k < tail; k++) { int p = q[k]; if (remove) bg[p] = true; mark[p] = (byte)(remove ? 1 : 2); }
        }
        for (int p = 0; p < N; p++) if (bg[p]) px[p * 4 + 3] = 0;

        // 3) ทิ้งเศษจุดเล็ก ๆ (น้อยกว่า 0.15% ของชิ้นใหญ่สุด)
        var comp = new int[N];
        for (int i = 0; i < N; i++) comp[i] = -1;
        var sizes = new List<int>();
        for (int p0 = 0; p0 < N; p0++) {
          if (px[p0 * 4 + 3] == 0 || comp[p0] != -1) continue;
          int id = sizes.Count, cnt = 0; head = 0; tail = 0;
          q[tail++] = p0; comp[p0] = id;
          while (head < tail) {
            int p = q[head++], x = p % W, y = p / W; cnt++;
            int[] nb = { x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1 };
            foreach (int n in nb) if (n >= 0 && comp[n] == -1 && px[n * 4 + 3] != 0) { comp[n] = id; q[tail++] = n; }
          }
          sizes.Add(cnt);
        }
        int biggest = 1; foreach (int s in sizes) if (s > biggest) biggest = s;
        for (int p = 0; p < N; p++) if (comp[p] != -1 && sizes[comp[p]] < biggest * 0.0015) px[p * 4 + 3] = 0;

        // 4) ขอบนุ่ม: พิกเซลที่ติดพื้นหลัง ยิ่งสว่างยิ่งโปร่ง
        var alpha2 = new byte[N];
        for (int p = 0; p < N; p++) {
          alpha2[p] = px[p * 4 + 3];
          if (px[p * 4 + 3] == 0) continue;
          int x = p % W, y = p / W;
          bool edge = (x > 0 && px[(p - 1) * 4 + 3] == 0) || (x < W - 1 && px[(p + 1) * 4 + 3] == 0) ||
                      (y > 0 && px[(p - W) * 4 + 3] == 0) || (y < H - 1 && px[(p + W) * 4 + 3] == 0);
          if (edge) {
            int mn = Math.Min(px[p * 4], Math.Min(px[p * 4 + 1], px[p * 4 + 2]));
            alpha2[p] = (byte)Math.Max(40, Math.Min(255, (255 - mn) * 255 / 110));
          }
        }
        for (int p = 0; p < N; p++) px[p * 4 + 3] = alpha2[p];

        // 5) หากรอบที่มีตัวละคร
        minX = W; minY = H; maxX = -1; maxY = -1;
        for (int p = 0; p < N; p++) if (px[p * 4 + 3] > 20) {
          int x = p % W, y = p / W;
          if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        if (maxX < 0) { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1; }
      }
      int bw = maxX - minX + 1, bh = maxY - minY + 1;
      double s1 = Math.Min(1.0, (double)bodyMax / Math.Max(bw, bh));

      // รูปตรวจสอบ: ระบายสีช่องสีขาวที่ถูกล้อมไว้ (ฟ้า = ลบ, เขียว = เก็บ)
      if (!string.IsNullOrEmpty(debugOut) && mark != null) {
        var dpx = (byte[])px.Clone();
        for (int p = 0; p < N; p++) {
          if (mark[p] == 1) { dpx[p*4] = 255; dpx[p*4+1] = 255; dpx[p*4+2] = 0; dpx[p*4+3] = 255; }
          else if (mark[p] == 2) { dpx[p*4] = 60; dpx[p*4+1] = 200; dpx[p*4+2] = 60; }
        }
        Marshal.Copy(dpx, 0, bd.Scan0, dpx.Length);
        bmp.UnlockBits(bd);
        SaveScaled(bmp, new Rectangle(minX, minY, bw, bh), (int)Math.Round(bw * s1), (int)Math.Round(bh * s1), debugOut);
        bd = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      }
      Marshal.Copy(px, 0, bd.Scan0, px.Length);
      bmp.UnlockBits(bd);

      // ตัวเต็ม
      SaveScaled(bmp, new Rectangle(minX, minY, bw, bh), (int)Math.Round(bw * s1), (int)Math.Round(bh * s1), bodyOut);

      // รูปหัว: สี่เหลี่ยมจัตุรัสส่วนบนของตัวละคร (จุดกลางแนวนอน = ค่าเฉลี่ยของพิกเซลในส่วนบน)
      int side, sx, sy;
      if (whiteBg) {
        side = (int)(Math.Min(bw, bh) * 0.66);
        long sumX = 0, cnt2 = 0;
        for (int y = minY; y < Math.Min(maxY, minY + side); y += 2)
          for (int x = minX; x <= maxX; x += 2)
            if (px[(y * W + x) * 4 + 3] > 100) { sumX += x; cnt2++; }
        int cx = cnt2 > 0 ? (int)(sumX / cnt2) : (minX + maxX) / 2;
        sx = Math.Max(minX, Math.Min(maxX - side, cx - side / 2));
        sy = Math.Max(0, minY - side / 20);
      } else {
        side = (int)(Math.Min(W, H) * 0.62);
        sx = Math.Max(0, Math.Min(W - side, W / 2 - side / 2));
        sy = Math.Max(0, Math.Min(H - side, (int)(H * 0.40) - side / 2));
      }
      SaveScaled(bmp, new Rectangle(sx, sy, side, Math.Min(side, H - sy)), portraitSize, portraitSize, portraitOut);
      return whiteBg ? "cutout" : "scene";
    }
  }

  // ย่อรูปทั่วไป (ไอเทม แบนเนอร์ ไอคอนหมวด) ; removeBg = ถ้าขอบภาพทึบ ให้ลบพื้นสีเดียวกับมุมภาพ (เช่น พื้นดำ/ขาว)
  public static string Resize(string src, string dst, int maxW, int maxH, bool removeBg, bool jpeg) {
    using (var orig = new Bitmap(src))
    using (var bmp = new Bitmap(orig.Width, orig.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bmp)) g.DrawImage(orig, 0, 0, orig.Width, orig.Height);
      int W = bmp.Width, H = bmp.Height, N = W * H;
      var rect = new Rectangle(0, 0, W, H);
      int minX = 0, minY = 0, maxX = W - 1, maxY = H - 1;
      if (removeBg) {
        var bd = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        var px = new byte[N * 4];
        Marshal.Copy(bd.Scan0, px, 0, px.Length);
        if (px[3] == 255) {
          int cb = px[0], cg = px[1], cr = px[2];
          var bg = new bool[N]; var q = new int[N]; int head = 0, tail = 0;
          Func<int, bool> near = p => Math.Abs(px[p*4] - cb) + Math.Abs(px[p*4+1] - cg) + Math.Abs(px[p*4+2] - cr) <= 60;
          Action<int> push = p => { if (!bg[p] && near(p)) { bg[p] = true; q[tail++] = p; } };
          for (int x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
          for (int y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
          while (head < tail) {
            int p = q[head++], x = p % W, y = p / W;
            if (x > 0) push(p - 1); if (x < W - 1) push(p + 1); if (y > 0) push(p - W); if (y < H - 1) push(p + W);
          }
          for (int p = 0; p < N; p++) if (bg[p]) px[p * 4 + 3] = 0;
        }
        // ตัดขอบว่าง
        minX = W; minY = H; maxX = -1; maxY = -1;
        for (int p = 0; p < N; p++) if (px[p * 4 + 3] > 20) {
          int x = p % W, y = p / W;
          if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        if (maxX < 0) { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1; }
        Marshal.Copy(px, 0, bd.Scan0, px.Length);
        bmp.UnlockBits(bd);
      }
      int bw = maxX - minX + 1, bh = maxY - minY + 1;
      double s = Math.Min(1.0, Math.Min((double)maxW / bw, (double)maxH / bh));
      int w = Math.Max(1, (int)Math.Round(bw * s)), h = Math.Max(1, (int)Math.Round(bh * s));
      if (jpeg) {
        using (var outBmp = new Bitmap(w, h, PixelFormat.Format24bppRgb))
        using (var g = Graphics.FromImage(outBmp)) {
          g.InterpolationMode = InterpolationMode.HighQualityBicubic;
          g.PixelOffsetMode = PixelOffsetMode.HighQuality;
          g.DrawImage(bmp, new Rectangle(0, 0, w, h), minX, minY, bw, bh, GraphicsUnit.Pixel);
          var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg");
          var ps = new EncoderParameters(1); ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 85L);
          outBmp.Save(dst, enc, ps);
        }
      } else {
        SaveScaled(bmp, new Rectangle(minX, minY, bw, bh), w, h, dst);
      }
      return w + "x" + h;
    }
  }

  static bool IsWhite(byte[] px, int p) {
    int b = px[p * 4], g = px[p * 4 + 1], r = px[p * 4 + 2];
    return Math.Min(r, Math.Min(g, b)) >= 235;
  }
  // สีขาวแบบเดียวกับพื้นหลัง (ใช้หาช่องที่ถูกล้อมไว้)
  static bool IsPocketWhite(byte[] px, int p) {
    int b = px[p * 4], g = px[p * 4 + 1], r = px[p * 4 + 2];
    int mn = Math.Min(r, Math.Min(g, b)), mx = Math.Max(r, Math.Max(g, b));
    return mn >= 246 && (mx - mn) <= 8;
  }
  // พื้นหลัง = สว่าง และสีไม่จัด (รวมเงาจาง ๆ ใต้เท้า)
  static bool IsBgStrict(byte[] px, int p) {
    int b = px[p * 4], g = px[p * 4 + 1], r = px[p * 4 + 2];
    int mn = Math.Min(r, Math.Min(g, b)), mx = Math.Max(r, Math.Max(g, b));
    return mn >= 242 && (mx - mn) <= 10;
  }
  static bool IsBg(byte[] px, int p) {
    int b = px[p * 4], g = px[p * 4 + 1], r = px[p * 4 + 2];
    int mn = Math.Min(r, Math.Min(g, b)), mx = Math.Max(r, Math.Max(g, b));
    return mn >= 175 && (mx - mn) <= 55;
  }

  static void SaveScaled(Bitmap src, Rectangle from, int w, int h, string path) {
    using (var outBmp = new Bitmap(Math.Max(1, w), Math.Max(1, h), PixelFormat.Format32bppArgb))
    using (var g = Graphics.FromImage(outBmp)) {
      g.Clear(Color.Transparent);
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.CompositingQuality = CompositingQuality.HighQuality;
      using (var ia = new ImageAttributes()) {
        ia.SetWrapMode(WrapMode.TileFlipXY);
        g.DrawImage(src, new Rectangle(0, 0, outBmp.Width, outBmp.Height), from.X, from.Y, from.Width, from.Height, GraphicsUnit.Pixel, ia);
      }
      outBmp.Save(path, ImageFormat.Png);
    }
  }
}
"@

# ชื่อโฟลเดอร์สาย -> key ที่ใช้ในเกม
$routes = [ordered]@{
  'sleepy'   = 'Sleepy Route'
  'gluttony' = 'Gluttony Route'
  'neglect'  = 'Neglect Route'
  'selfcare' = 'Self-Care Route'
  'playful'  = 'Playful Route'
  'royal'    = 'Royal Route'
  'leader'   = 'President Route (Hidden)'
}

function Find-Image([string]$dir, [string]$base) {
  foreach ($ext in 'png', 'jpg', 'jpeg', 'webp') {
    $p = Join-Path $dir "$base.$ext"
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

$jobs = @()
foreach ($sp in 'dog', 'cat') {
  $folderName = if ($sp -eq 'dog') { 'Dog' } else { 'Cat' }
  $jobs += @{ key = "${sp}_baby"; src = (Find-Image $assets "$folderName (Starter)") }
  foreach ($line in $routes.Keys) {
    $dir = Join-Path $assets "Evolution Route\$($routes[$line])\$folderName Stages"
    foreach ($st in 2..5) { $jobs += @{ key = "${sp}_${line}_${st}"; src = (Find-Image $dir "$st") } }
  }
}

$manifest = [ordered]@{}
foreach ($j in $jobs) {
  if (-not $j.src) { Write-Host "  - ไม่พบรูป: $($j.key)" -ForegroundColor Yellow; continue }
  $fix = if ($fixes.ContainsKey($j.key)) { [string]$fixes[$j.key] } else { '' }
  $dbg = if ($Review) { [string](Join-Path $outReview "$($j.key).png") } else { '' }
  $manifest[$j.key] = [string][SpriteTool]::Process([string]$j.src, [string](Join-Path $outBody "$($j.key).png"), [string](Join-Path $outPortrait "$($j.key).png"), [int]$BodyMax, [int]$PortraitSize, $fix, $dbg)
  Write-Host ("  ok  {0,-22} {1}" -f $j.key, $manifest[$j.key])
  if ($Review) { [SpriteTool]::Log | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray } }
  [SpriteTool]::Log.Clear()
}

# ---------- ไอเทม (assets/Grooming Items/<หมวด>/*) -> assets/sprites/items/<หมวด>/<ชื่อไฟล์เดิม>.png ----------
$itemsOut = Join-Path $assets 'sprites\items'
if (Test-Path $itemsOut) { Remove-Item -Recurse -Force $itemsOut }
$itemCount = 0
Get-ChildItem (Join-Path $assets 'Grooming Items') -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $cat = $_.Name.ToLower()
  $dir = New-Item -ItemType Directory -Force (Join-Path $itemsOut $cat)
  Get-ChildItem $_.FullName -File | Where-Object { $_.Extension -match '\.(png|jpe?g|webp)$' } | ForEach-Object {
    [void][SpriteTool]::Resize($_.FullName, (Join-Path $dir "$($_.BaseName).png"), 300, 220, $true, $false)
    $itemCount++
  }
}
Write-Host "  ok  ไอเทม $itemCount รูป -> assets/sprites/items/"

# ---------- แบนเนอร์สาย (Evolution Route/<สาย>/banner/<Dog|Cat>.png) -> assets/sprites/banner/<สาย>_<dog|cat>.jpg ----------
$bannerOut = Join-Path $assets 'sprites\banner'
if (Test-Path $bannerOut) { Remove-Item -Recurse -Force $bannerOut }
New-Item -ItemType Directory -Force $bannerOut | Out-Null
$bannerCount = 0
foreach ($line in $routes.Keys) {
  foreach ($sp in 'dog', 'cat') {
    $folderName = if ($sp -eq 'dog') { 'Dog' } else { 'Cat' }
    $src = Find-Image (Join-Path $assets "Evolution Route\$($routes[$line])\banner") $folderName
    if ($src) { [void][SpriteTool]::Resize($src, (Join-Path $bannerOut "${line}_$sp.jpg"), 720, 260, $false, $true); $bannerCount++ }
  }
}
Write-Host "  ok  แบนเนอร์ $bannerCount รูป -> assets/sprites/banner/"

# ---------- รูป UI ขนาดใหญ่จาก Figma (assets/ui/big/*) -> assets/sprites/ui/*.png ----------
$uiBig = Join-Path $assets 'ui\big'
$uiOut = Join-Path $assets 'sprites\ui'
if (Test-Path $uiOut) { Remove-Item -Recurse -Force $uiOut }
if (Test-Path $uiBig) {
  New-Item -ItemType Directory -Force $uiOut | Out-Null
  Get-ChildItem $uiBig -File | ForEach-Object { [void][SpriteTool]::Resize($_.FullName, (Join-Path $uiOut "$($_.BaseName).png"), 360, 300, $true, $false) }
  Write-Host "  ok  รูป UI -> assets/sprites/ui/"
}

# ---------- หน้าปก (assets/Game cover items/*) -> assets/sprites/cover/<ชื่อ>.png (ย่อ ไม่ตัดขอบ เพื่อให้ตำแหน่งตรงกับ Figma) ----------
$coverIn = Join-Path $assets 'Game cover items'
$coverOut = Join-Path $assets 'sprites\cover'
if (Test-Path $coverOut) { Remove-Item -Recurse -Force $coverOut }
if (Test-Path $coverIn) {
  New-Item -ItemType Directory -Force $coverOut | Out-Null
  # ชื่อไฟล์ต้นฉบับ (ขึ้นต้นด้วย) -> ชื่อที่เกมใช้
  $coverNames = [ordered]@{
    '_cover_bg' = 'bg'; '_logo' = 'logo'; '01c7d5b1' = 'sign'; '02dc49fc' = 'flowers'; '55ff8caf' = 'mushroom';
    '4b9e832a' = 'icon_hand'; 'a6718831' = 'icon_mouse'; '5fe1fe4b' = 'bone'; '88425f9d' = 'peek';
    'Untitled design-Photoroom' = 'badge1'; 'Untitled design (1)' = 'badge2'; 'Untitled design (2)' = 'badge3'; 'Untitled design (3)' = 'badge4';
    'Screenshot 2026-11-08 210654' = 'badge5'; 'Screenshot 2026-11-08 210710' = 'badge6'; 'Screenshot 2026-11-08 210717' = 'badge7'
  }
  Get-ChildItem $coverIn -File | ForEach-Object {
    $f = $_; $name = $null
    foreach ($k in $coverNames.Keys) { if ($f.Name.StartsWith($k)) { $name = $coverNames[$k]; break } }
    # โลโก้ export มาพร้อมพื้นเทา -> ลบพื้นหลังและตัดขอบ
    if ($name) { [void][SpriteTool]::Resize($f.FullName, (Join-Path $coverOut "$name.png"), 760, 760, ($name -eq 'logo'), $false) }
  }
  Write-Host "  ok  หน้าปก -> assets/sprites/cover/"
}

$lines = $manifest.Keys | ForEach-Object { "  '$_': '$($manifest[$_])'" }
$js = @"
/* สร้างอัตโนมัติโดย tools/make-sprites.ps1 — อย่าแก้ด้วยมือ (รันสคริปต์ใหม่แทน)
 * cutout = ลบพื้นหลังแล้ว, scene = ภาพมีฉากหลัง (เกมแสดงเป็นกรอบรูป) */
window.PetGame = window.PetGame || {};
PetGame.SPRITES = {
$($lines -join ",`n")
};
"@
[System.IO.File]::WriteAllText((Join-Path $assets 'sprites\manifest.js'), $js, (New-Object System.Text.UTF8Encoding $false))
Write-Host "`nเสร็จแล้ว: $($manifest.Count) รูป -> assets/sprites/"
