/*
 * BootScene.js — โหลดภาพ และสร้างภาพที่ใช้ในเกม
 *  - body_<key>     : ตัวเต็มพื้นใส (จาก assets/sprites/body) ; ภาพที่มีฉากหลังจะใส่กรอบรูปให้
 *  - portrait_<key> : รูปวงกลม (avatar / แชท / Report / Evolution Book)
 *  - bg_park        : พื้นหลังหน้าเลี้ยง (จากไฟล์ ถ้าไม่มีจะวาดด้วยโค้ด)
 *  key = dog_baby, dog_playful_2 ... (ดูรายการใน assets/sprites/manifest.js)
 */
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const D = PetGame.Data;
    const W = D.WIDTH, H = D.HEIGHT;
    const bar = this.add.rectangle(W / 2 - 150, H / 2, 0, 16, D.COLORS.olive).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 304, 22).setStrokeStyle(3, D.COLORS.olive);
    PetGame.UI.text(this, W / 2, H / 2 - 44, 'Loading...', 28, D.COLORS.oliveCss).setOrigin(0.5);
    this.load.on('progress', (p) => { bar.width = 300 * p; });

    Object.entries(D.ASSET_FILES).forEach(([key, file]) => { if (file) this.load.image(key + '_src', file); });

    // ไอคอนจาก Figma และรูป UI ขนาดใหญ่ (ย่อแล้ว)
    D.UI_ICONS.forEach((k) => this.load.image('ui_' + k, `assets/ui/icon_${k}.png`));
    D.UI_IMAGES.forEach((k) => this.load.image('ui_' + k, `${D.SPRITE_DIR}/ui/${k}.png`));
    Object.entries(D.SOUND_FILES).forEach(([k, f]) => this.load.audio(k, encodeURI(f)));
    D.COVER_IMAGES.forEach((k) => this.load.image('cover_' + k, `${D.SPRITE_DIR}/cover/${k}.png`));

    // ไอเทมในเมนู Grooming (assets/sprites/items/<หมวด>/<file>.png)
    Object.entries(D.ITEMS).forEach(([cat, items]) => items.forEach((it) => {
      this.load.image('item_' + it.key, `${D.SPRITE_DIR}/items/${cat}/${it.file}.png`);
    }));

    // แบนเนอร์สายวิวัฒนาการ (Evolution Book)
    Object.keys(D.LINES).forEach((line) => ['dog', 'cat'].forEach((sp) => {
      this.load.image(`banner_${line}_${sp}`, `${D.SPRITE_DIR}/banner/${line}_${sp}.jpg`);
    }));
    // ไฟล์ไหนหาไม่เจอ ไม่ต้องหยุดเกม (เช่น ยังไม่ได้ใส่รูป) — จะใช้รูปสำรองแทน
    this.load.on('loaderror', (file) => console.warn('Missing asset:', file.key, file.url));

    // ภาพตัวละครทุกร่าง (สร้างด้วย tools/make-sprites.ps1)
    Object.keys(PetGame.SPRITES || {}).forEach((key) => {
      this.load.image(`body_${key}_src`, `${D.SPRITE_DIR}/body/${key}.png`);
      this.load.image(`portrait_${key}_src`, `${D.SPRITE_DIR}/portrait/${key}.png`);
    });
  }

  create() {
    this.buildPetTextures();
    this.buildAssetTextures();
    if (new URLSearchParams(location.search).get('crops')) this.showSpritePreview();
    else this.scene.start('Title');
  }

  // ---------------------------------------------------------------
  buildPetTextures() {
    const D = PetGame.Data;
    const kind = PetGame.SPRITES || {};
    ['dog', 'cat'].forEach((sp) => {
      const keys = [`${sp}_baby`];
      Object.keys(D.LINES).forEach((line) => { for (let st = 2; st <= D.MAX_STAGE; st++) keys.push(`${sp}_${line}_${st}`); });
      keys.forEach((k) => {
        const body = `body_${k}_src`, face = `portrait_${k}_src`;
        if (!this.textures.exists(body)) { this.makePlaceholder(k); return; }
        if (kind[k] === 'scene') this.makeFramed(`body_${k}`, body);
        else this.textures.addImage(`body_${k}`, this.textures.get(body).getSourceImage());
        this.makeCircle(`portrait_${k}`, this.textures.exists(face) ? face : body);
      });
    });
  }

  // ไอเทมใช้ไฟล์ตรง ๆ ; พื้นหลังตัดขอบ (BG_INSET) แล้วขยายให้เต็มจอเกม
  buildAssetTextures() {
    const D = PetGame.Data;
    Object.keys(D.ASSET_FILES).forEach((key) => {
      const src = key + '_src';
      if (!this.textures.exists(src)) return;
      if (key === 'bg_park') this.makeBackground(src);
      else this.textures.addImage(key, this.textures.get(src).getSourceImage());
    });
    // รูปที่หาไม่เจอ -> สี่เหลี่ยมโปร่งใส (เกมไม่พัง)
    const needed = D.UI_ICONS.map((k) => 'ui_' + k).concat(D.UI_IMAGES.map((k) => 'ui_' + k));
    Object.values(D.ITEMS).forEach((items) => items.forEach((it) => needed.push('item_' + it.key)));
    needed.forEach((k) => {
      if (this.textures.exists(k)) return;
      const t = this.textures.createCanvas(k, 64, 64);
      const ctx = t.getContext();
      ctx.fillStyle = '#dcdcdc'; ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#888'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 32, 34);
      t.refresh();
    });
    if (!this.textures.exists('bg_park')) this.drawParkBackground();
  }

  makeBackground(srcKey) {
    const D = PetGame.Data, W = D.WIDTH, H = D.HEIGHT, inset = D.BG_INSET || 0;
    const img = this.textures.get(srcKey).getSourceImage();
    const sw = img.width - inset * 2, sh = img.height - inset * 2;
    const s = Math.max(W / sw, H / sh);                 // cover: เต็มจอ ตัดส่วนเกิน
    const cw = W / s, ch = H / s;
    const tex = this.textures.createCanvas('bg_park', W, H);
    const ctx = tex.getContext();
    ctx.imageSmoothingQuality = 'high';
    // ดีไซน์ใช้ภาพที่ความทึบ 85% บนพื้นขาว (สีอ่อนลงเล็กน้อย ให้ UI เด่น)
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(img, inset + (sw - cw) / 2, inset + (sh - ch) / 2, cw, ch, 0, 0, W, H);
    ctx.globalAlpha = 1;
    tex.refresh();
  }

  // ตัดภาพเป็นวงกลม 256x256 (พื้นสีขาว)
  makeCircle(key, srcKey) {
    const size = 256;
    const src = this.textures.get(srcKey).getSourceImage();
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const s = Math.max(size / src.width, size / src.height);
    ctx.drawImage(src, (size - src.width * s) / 2, (size - src.height * s) / 2, src.width * s, src.height * s);
    ctx.restore();
    tex.refresh();
  }

  // ภาพที่มีฉากหลัง (เช่น สาย Sleepy) -> กรอบรูปมุมมนขอบขาว
  makeFramed(key, srcKey) {
    const src = this.textures.get(srcKey).getSourceImage();
    const pad = Math.round(Math.max(src.width, src.height) * 0.025), r = pad * 3;
    const w = src.width + pad * 2, h = src.height + pad * 2;
    const tex = this.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    const round = (x, y, rw, rh, rr) => {
      ctx.beginPath();
      ctx.moveTo(x + rr, y); ctx.arcTo(x + rw, y, x + rw, y + rh, rr); ctx.arcTo(x + rw, y + rh, x, y + rh, rr);
      ctx.arcTo(x, y + rh, x, y, rr); ctx.arcTo(x, y, x + rw, y, rr); ctx.closePath();
    };
    ctx.fillStyle = '#ffffff';
    round(0, 0, w, h, r); ctx.fill();
    ctx.save();
    round(pad, pad, src.width, src.height, r * 0.7); ctx.clip();
    ctx.drawImage(src, pad, pad);
    ctx.restore();
    tex.refresh();
  }

  // ถ้ายังไม่มีรูปร่างไหน: วงกลมพร้อมเครื่องหมาย ?
  makePlaceholder(k) {
    ['body_', 'portrait_'].forEach((pre) => {
      const tex = this.textures.createCanvas(pre + k, 200, 200);
      const ctx = tex.getContext();
      ctx.fillStyle = '#dcd795'; ctx.beginPath(); ctx.arc(100, 100, 96, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9b8f4e'; ctx.font = 'bold 110px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', 100, 108);
      tex.refresh();
    });
  }

  // ---------------------------------------------------------------
  // พื้นหลังสวนสไตล์สีน้ำ (ใช้แทนจนกว่าจะมีไฟล์ bg_park จริง)
  drawParkBackground() {
    const W = PetGame.Data.WIDTH, H = PetGame.Data.HEIGHT;
    const tex = this.textures.createCanvas('bg_park', W, H);
    const ctx = tex.getContext();
    const rnd = new Phaser.Math.RandomDataGenerator(['lovely-pet']);
    const blob = (x, y, r, color, a) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * rnd.realInRange(0.6, 1), rnd.realInRange(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    };

    // ท้องฟ้า (ฉากสูง ~470 ด้านล่างเป็นแถบไอเทม)
    const sky = ctx.createLinearGradient(0, 0, 0, 470);
    sky.addColorStop(0, '#78acd8');
    sky.addColorStop(0.6, '#a9cde6');
    sky.addColorStop(1, '#d6e8f0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) blob(rnd.between(0, W), rnd.between(0, 470), rnd.between(20, 80), rnd.pick(['#ffffff', '#5f95c8', '#9fc4e2']), 0.05);

    // พื้นหญ้า
    const grass = ctx.createLinearGradient(0, 370, 0, 480);
    grass.addColorStop(0, '#c9cf7a');
    grass.addColorStop(1, '#a9b85c');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grass;
    ctx.beginPath();
    ctx.moveTo(0, 392);
    ctx.bezierCurveTo(280, 372, 600, 410, W, 380);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 180; i++) blob(rnd.between(0, W), rnd.between(392, 475), rnd.between(8, 36), rnd.pick(['#e2d36a', '#8fb35a', '#b9c86b', '#d9c25a']), 0.25);

    // ต้นไม้ (ซ้าย)
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#6b5446';
    ctx.beginPath();
    ctx.moveTo(120, 410); ctx.lineTo(166, 410); ctx.lineTo(160, 320); ctx.lineTo(200, 240); ctx.lineTo(188, 236); ctx.lineTo(152, 290);
    ctx.lineTo(134, 214); ctx.lineTo(124, 218); ctx.lineTo(136, 320); ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 300; i++) {
      const a = rnd.realInRange(0, Math.PI * 2), r = rnd.realInRange(0, 1);
      blob(165 + Math.cos(a) * 170 * r, 170 + Math.sin(a) * 130 * r, rnd.between(12, 30),
        rnd.pick(['#f4d23c', '#e8bf27', '#f7e47c', '#c9d256', '#e3c94a']), 0.35);
    }
    ctx.globalAlpha = 1;
    tex.refresh();
  }

  // โหมดตรวจภาพตัวละครทั้งหมด: เปิด index.html?crops=1
  showSpritePreview() {
    const D = PetGame.Data;
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor('#cfe3ef');
    const lines = Object.keys(D.LINES);
    ['dog', 'cat'].forEach((sp, si) => {
      lines.forEach((line, li) => {
        for (let st = 1; st <= D.MAX_STAGE; st++) {
          const key = st === 1 ? `${sp}_baby` : `${sp}_${line}_${st}`;
          const x = 40 + si * 470 + (st - 1) * 90, y = 78 + li * 80;
          const img = this.add.image(x, y, 'body_' + key).setOrigin(0.5, 1);
          img.setScale(Math.min(64 / img.width, 70 / img.height));
          this.add.image(x + 36, y - 10, 'portrait_' + key).setDisplaySize(24, 24);
        }
      });
    });
  }
}
