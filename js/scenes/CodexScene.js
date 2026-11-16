/*
 * CodexScene.js — Evolution Book (Figma: UI Evo Book 1 / UI Evo Book 2)
 *  หน้า 1: รายชื่อสายวิวัฒนาการ (เลื่อนลงได้) สายที่ปลดล็อกแล้วแสดงแบนเนอร์ สายที่ยังไม่ปลดล็อกแสดง "???"
 *  หน้า 2: ร่างทั้งหมดของสายนั้น (เลื่อนซ้าย/ขวา) + คำอธิบาย
 */
class CodexScene extends Phaser.Scene {
  constructor() { super('Codex'); }

  init(data) { this.pet = data.pet; }

  create() {
    this.showList();
  }

  // ---------- โครงร่วม: พื้นมืด + กรอบสีมะกอก + ปุ่มปิด ----------
  frame(onClose) {
    const UI = PetGame.UI, C = PetGame.Data.COLORS;
    this.children.removeAll(true);
    this.input.removeAllListeners();
    if (this.input.keyboard) this.input.keyboard.removeAllListeners();
    UI.dim(this, 0.4);
    const g = UI.box(this, 45, 47, 870, 497, { fill: C.olivePale, stroke: C.olive, strokeW: 10, radius: 20 });
    g.setInteractive(new Phaser.Geom.Rectangle(45, 47, 870, 497), Phaser.Geom.Rectangle.Contains);
    UI.imageButton(this, 83, 88, 'close', 40, 40, onClose);
  }

  // สายจะปลดล็อก (เห็นชื่อ + แบนเนอร์ + กดดูได้) เมื่อเคยไปถึงร่างสูงสุดของสายนั้นแล้ว
  lineUnlocked(line) {
    const sp = this.pet.species;
    return this.pet.isCompleted(line) || this.pet.unlocked.includes(`${sp}_${line}_${PetGame.Data.MAX_STAGE}`);
  }

  // =====================================================================
  //  หน้า 1: รายชื่อสาย
  // =====================================================================
  showList() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    this.frame(() => this.close());
    const sp = this.pet.species;
    // สายลับ (Leader) จะไม่แสดงในหนังสือเลย จนกว่าจะปลดล็อกได้เอง
    const lines = Object.keys(D.LINES).filter((l) => !D.LINES[l].hidden || this.lineUnlocked(l));
    const rows = this.add.container(0, 0);
    lines.forEach((line, i) => {
      const L = D.LINES[line], y = 83 + i * 112;
      const open = this.lineUnlocked(line);
      const c = this.add.container(485.5, y + 48.5);
      c.add(UI.box(this, -352.5 + 5, -48.5 + 7, 705, 97, { fill: 0x000000, alpha: 0.25, radius: 20 }));
      if (open && this.textures.exists(`banner_${line}_${sp}`)) {
        c.add(this.add.image(0, 0, this.roundedBanner(`banner_${line}_${sp}`)));
      } else {
        c.add(UI.box(this, -352.5, -48.5, 705, 97, { fill: C.oliveMid, radius: 20 }));
      }
      c.add(UI.box(this, -352.5, -48.5, 705, 97, { fill: null, stroke: C.olive, strokeW: 5, radius: 20 }));
      c.add(UI.text(this, -320, 0, open ? `${L.label} Route` : '???', 48, '#ffffff', { stroke: '#7a7d47', strokeThickness: 6 }).setOrigin(0, 0.5));
      if (open) UI.clickable(this, c, 705, 97, () => this.showRoute(line, 0));
      else {
        // ยังไม่ปลดล็อก: บอกว่าต้องไปถึงร่างสูงสุดก่อน
        c.add(UI.text(this, 330, 30, 'Reach the final form to unlock', 13, '#ffffff').setOrigin(1, 0.5).setAlpha(0.85));
      }
      c.baseY = c.y;
      rows.add(c);
    });

    // เลื่อน (เห็นทีละ 4 แถว)
    const maskG = this.make.graphics({ add: false }).fillRect(120, 72, 730, 456);
    rows.setMask(maskG.createGeometryMask());
    const maxScroll = Math.max(0, (lines.length - 4) * 112);
    UI.box(this, 882, 82, 10, 431, { fill: 0xe6e6e6, stroke: 0x999999, strokeW: 1, radius: 5 });
    const thumb = this.add.graphics();
    let offset = 0;
    const apply = () => {
      rows.list.forEach((c) => { c.y = c.baseY - offset; });
      const h = 431 * Math.min(1, 4 / lines.length);
      thumb.clear().fillStyle(C.olive, 1).fillRoundedRect(883, 82 + (431 - h) * (maxScroll ? offset / maxScroll : 0), 8, h, 4);
    };
    apply();
    this.input.on('wheel', (p, o, dx, dy) => { offset = Phaser.Math.Clamp(offset + dy * 0.6, 0, maxScroll); apply(); });
    let dragY = null;
    this.input.on('pointerdown', (p) => { dragY = p.y; });
    this.input.on('pointermove', (p) => {
      if (dragY === null || !p.isDown) return;
      offset = Phaser.Math.Clamp(offset - (p.y - dragY), 0, maxScroll); dragY = p.y; apply();
    });
    this.input.on('pointerup', () => { dragY = null; });
  }

  // =====================================================================
  //  หน้า 2: ร่างในสายนั้น
  // =====================================================================
  showRoute(line, index) {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    this.frame(() => this.showList());
    const sp = this.pet.species, L = D.LINES[line];
    // ร่างที่ 1 (Newborn) + ร่าง 2-5 ของสายนี้
    const forms = [{ key: `${sp}_baby`, stage: 1, name: D.FORM_NAMES[sp].baby }];
    for (let st = 2; st <= D.MAX_STAGE; st++) forms.push({ key: `${sp}_${line}_${st}`, stage: st, name: D.FORM_NAMES[sp][line][st - 1] });
    index = Phaser.Math.Clamp(index, 0, forms.length - 1);
    const f = forms[index];
    const has = (k) => this.pet.unlocked.includes(k);

    // การ์ดด้านหลัง (ร่างก่อนหน้า / ถัดไป)
    [[-1, 152], [1, 292]].forEach(([d, x]) => {
      const nf = forms[index + d];
      UI.card(this, x, 130, 207, 256, C.olive);
      if (nf) this.formImage(nf, x + 103.5, 258, 185, 230, has(nf.key), 0.6);
      UI.box(this, x, 130, 207, 256, { fill: 0x000000, alpha: 0.3, radius: 10 });
    });
    // การ์ดหลัก
    UI.card(this, 202, 109, 247, 296, C.olive);
    this.formImage(f, 325.5, 257, 225, 272, has(f.key), 1);

    if (index > 0) UI.imageButton(this, 117, 244, 'prev_big', 100, 100, () => this.showRoute(line, index - 1));
    if (index < forms.length - 1) UI.imageButton(this, 534, 247, 'next_big', 100, 100, () => this.showRoute(line, index + 1));

    UI.box(this, 105, 437, 441, 60, { fill: C.oliveMid, stroke: C.olive, strokeW: 5, radius: 20 });
    UI.text(this, 325.5, 467, `${L.label} Route`, 32, '#ffffff').setOrigin(0.5);

    // คำอธิบาย
    this.add.rectangle(592.5, 299.5, 7, 431, C.olive);
    UI.title(this, 749, 118, 'Description', 48, '#ffffff', C.oliveCss).setOrigin(0.5);
    UI.card(this, 619, 158, 260, 45, C.oliveDark, { fill: C.olive });
    UI.text(this, 635, 180.5, `Stage: ${f.stage} / ${D.MAX_STAGE}`, 20, '#ffffff').setOrigin(0, 0.5);
    UI.card(this, 619, 209, 260, 45, C.oliveDark, { fill: C.olive });
    const known = has(f.key);
    UI.text(this, 635, 231.5, `Called: ${known ? f.name : '???'}`, f.name.length > 16 ? 15 : 20, '#ffffff', {
      wordWrap: { width: 236, useAdvancedWrap: true }
    }).setOrigin(0, 0.5);
    UI.card(this, 619, 265, 260, 250, C.olive);
    // คำอธิบายร่าง (petData.js -> BABY_DESC / LINE_GUIDE.forms)
    const formDesc = f.stage === 1 ? D.BABY_DESC : D.LINE_GUIDE[line].forms[f.stage - 2];
    const desc = known
      ? `${formDesc}${this.pet.formKey() === f.key ? '\n\n★ Your pet is in this form now!' : ''}`
      : 'Not discovered yet.';
    UI.text(this, 637, 282, desc, 16, '#3f4122', { wordWrap: { width: 226, useAdvancedWrap: true }, lineSpacing: 3 });

    // ปัด/กดลูกศรคีย์บอร์ด
    this.input.keyboard.once('keydown-LEFT', () => index > 0 && this.showRoute(line, index - 1));
    this.input.keyboard.once('keydown-RIGHT', () => index < forms.length - 1 && this.showRoute(line, index + 1));
  }

  // แบนเนอร์มุมมน 705x97 (ทึบ 70% บนพื้นขาว) — สร้างครั้งเดียวแล้วใช้ซ้ำ
  roundedBanner(src) {
    const key = src + '_row';
    if (this.textures.exists(key)) return key;
    const img = this.textures.get(src).getSourceImage();
    const w = 705, h = 97, r = 20;
    const tex = this.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.7;
    const s = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) * 0.3, img.width * s, img.height * s);
    tex.refresh();
    return key;
  }

  // รูปร่างสัตว์จัดกึ่งกลางในการ์ด (cx, cy = จุดกึ่งกลางการ์ด)
  formImage(f, cx, cy, maxW, maxH, unlocked, alpha) {
    const img = this.add.image(cx, cy, 'body_' + f.key).setAlpha(alpha);
    img.setScale(Math.min(maxW / img.width, maxH / img.height));
    if (!unlocked) img.setTint(0x222222).setAlpha(alpha * 0.55);
    return img;
  }

  close() {
    this.scene.stop();
    this.scene.resume('Game');
  }
}
