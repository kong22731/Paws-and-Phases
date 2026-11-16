/*
 * TitleScene.js — หน้าปก "Paws & phases" (Figma: Cover)
 *  - ป้ายไม้ START = เริ่มเกมใหม่ / ป้ายไม้ Continue = เล่นต่อจากเซฟ
 *  - ปุ่มมุมขวาบน: เลือกวิธีควบคุม (มือผ่านกล้อง / เมาส์) — ตอนนี้ใช้ได้เฉพาะเมาส์
 * ตำแหน่งทุกชิ้นตามดีไซน์ Figma (960x600) ; รูปอยู่ใน assets/sprites/cover/
 */
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const W = D.WIDTH, H = D.HEIGHT;
    if (PetGame.chat) PetGame.chat.detach();
    this.cameras.main.setBackgroundColor('#ffffff');
    // เพลงพื้นหลัง: เริ่มตั้งแต่หน้าปก (หลังผู้เล่นคลิกครั้งแรก) แล้วเล่นต่อทุกหน้า ; หยุดเมื่อออกจากเกม (สลับแท็บ/ย่อหน้าต่าง)
    PetGame.Sound.startMusic(this);

    // วางรูปตามกล่องใน Figma: (x, y, w, h) = มุมซ้ายบน + ขนาด ; opt: alpha, flip, angle, shadow
    const put = (key, x, y, w, h, opt) => {
      opt = opt || {};
      if (!this.textures.exists('cover_' + key)) return null;
      if (opt.shadow) this.add.image(x + w / 2, y + h / 2 + 4, 'cover_' + key).setDisplaySize(w, h).setTintFill(0x000000).setAlpha(0.18).setAngle(opt.angle || 0);
      const img = this.add.image(x + w / 2, y + h / 2, 'cover_' + key).setDisplaySize(w, h);
      if (opt.alpha !== undefined) img.setAlpha(opt.alpha);
      if (opt.flip) img.setFlipX(true);
      if (opt.angle) img.setAngle(opt.angle);
      return img;
    };

    // พื้นหลัง (object-cover ทึบ 90%)
    const bg = this.add.image(W / 2, H / 2, 'cover_bg');
    bg.setScale(Math.max(W / bg.width, H / bg.height)).setAlpha(0.9);

    put('mushroom', -32, 300, 202, 202, { alpha: 0.9 });
    this.startSign = put('sign', 363, 153, 219, 389, { alpha: 0.9 });
    this.contSign = put('sign', 366, 303, 216, 383);
    put('flowers', 676, 359, 327, 327, { alpha: 0.75 });
    put('flowers', -32, 351, 341, 341, { alpha: 0.75, flip: true });

    // เหรียญสายวิวัฒนาการ 7 อัน (ลอยขึ้นลงเบา ๆ)
    [['badge1', 768, 374, 127, 108], ['badge2', 277, 177, 115, 111], ['badge4', 415, 142, 118, 112],
     ['badge5', 541, 147, 160, 177], ['badge6', 43, 348, 147, 142], ['badge7', 660, 205, 171, 166],
     ['badge3', 143, 236, 117, 109]].forEach(([k, x, y, w, h], i) => {
      const b = put(k, x, y, w, h, { shadow: true });
      if (b) this.tweens.add({ targets: b, y: b.y - 6, duration: 1300 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 120 });
    });

    // หมา/แมว starter (ใช้ภาพในเกม) — หายใจเบา ๆ
    const pet = (key, cx, bottom, maxW, maxH, flip) => {
      this.add.ellipse(cx, bottom - 6, maxW * 0.62, 26, 0x000000, 0.14);
      const img = this.add.image(cx, bottom, key).setOrigin(0.5, 1);
      img.setScale(Math.min(maxW / img.width, maxH / img.height)).setFlipX(!!flip);
      this.tweens.add({ targets: img, scaleY: img.scaleY * 1.03, duration: 900 + (flip ? 0 : 160), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return img;
    };
    // ขนาดตามตัวละครที่เห็นใน Figma (รูปใน Figma มีขอบว่างรอบตัว จึงไม่ใช้ขนาดกล่องตรง ๆ)
    pet('body_dog_baby', 312, 592, 270, 240, true);
    pet('body_cat_baby', 622, 600, 215, 250, false);

    // โลโก้ + ของตกแต่ง
    put('logo', 82, 26, 640, 110);
    put('peek', 127, -2, 125, 62, { angle: -1 });
    put('bone', 638 + 58 - 49, -7 + 57 - 32.5, 98, 65, { angle: 43 });

    // ปุ่มเลือกวิธีควบคุม (มือผ่านกล้อง / เมาส์)
    this.modeBtns = {};
    [['hand', 753, 'icon_hand', 754, 47, 90, 60, 0], ['mouse', 860, 'icon_mouse', 852, 43, 102, 68, -26.72]].forEach(([mode, bx, icon, ix, iy, iw, ih, ang]) => {
      const box = UI.box(this, bx, 40, 86, 75, { fill: C.oliveMid, stroke: C.olive, strokeW: 3, radius: 10 });
      put(icon, ix, iy, iw, ih, { angle: ang });
      const ring = this.add.graphics();
      const zone = this.add.zone(bx + 43, 77.5, 86, 75).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => { PetGame.Sound.play('toggle'); this.setMode(mode); });
      this.modeBtns[mode] = { box, ring, x: bx };
    });
    this.setMode(null, true);
    // ปิดกล้องจากแผงแชท -> อัปเดตกรอบที่ปุ่มด้วย
    const onHand = (on) => this.drawModeRing(on ? 'hand' : 'mouse');
    PetGame.Hand.on('change', onHand);
    this.events.once('shutdown', () => PetGame.Hand.off('change', onHand));

    // ข้อความบนป้ายไม้
    const save = PetGame.PetState.hasAnySave();
    const signText = (txt, x, y, size, color) => this.add.text(x, y, txt, {
      fontFamily: 'Inter, Sniglet, sans-serif', fontStyle: 'italic 800', fontSize: size, color,
      stroke: '#5b2d0c', strokeThickness: Math.round(size / 6)
    }).setOrigin(0.5);
    this.startText = signText('START', 474, 346, 38, '#fffb10');
    this.contText = signText('Continue', 476, 494, 24, '#ffffff');
    if (!save) this.contText.setAlpha(0.45);

    // พื้นที่กด (ป้าย START / Continue)
    const hot = (x, y, w, h, onClick, label) => {
      const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => this.tweens.add({ targets: label, scale: 1.12, duration: 120 }));
      z.on('pointerout', () => this.tweens.add({ targets: label, scale: 1, duration: 120 }));
      z.on('pointerdown', () => { this.tweens.add({ targets: label, scale: 0.92, duration: 70, yoyo: true }); PetGame.Sound.play('click'); onClick(); });
      return z;
    };
    // START = ไปเลือกสัตว์ได้เลย (เซฟเดิมไม่หาย) ; Continue = หน้าเลือกไฟล์เซฟ
    hot(474, 344, 200, 80, () => this.scene.start('Breed'), this.startText);
    hot(476, 494, 190, 70, () => {
      if (save) this.scene.start('Slots', { mode: 'load' });
      else this.toast('No saved pet yet — press START!');
    }, this.contText);
    this.tweens.add({ targets: this.startText, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // วิธีควบคุม: mouse / hand (ควบคุมด้วยมือผ่านกล้อง — เมาส์ยังใช้ได้เสมอ)
  setMode(mode, silent) {
    const Hand = PetGame.Hand;
    if (silent) mode = Hand.active ? 'hand' : 'mouse';
    else if (mode === 'hand' && !Hand.active) {
      this.toast('Starting camera… please allow camera access');
      Hand.start().then((ok) => {
        if (!this.sys.isActive()) return;
        if (ok) this.toast('Hand control ON — pinch 🤏 to tap!');
        else { this.toast(`Hand control unavailable: ${Hand.statusEl ? Hand.statusEl.textContent : 'camera error'}`); this.drawModeRing('mouse'); }
      });
    } else if (mode === 'mouse' && Hand.active) {
      Hand.stop();
      this.toast('Mouse control');
    }
    this.drawModeRing(mode);
  }

  drawModeRing(mode) {
    Object.entries(this.modeBtns).forEach(([k, b]) => {
      b.ring.clear();
      if (k === mode) b.ring.lineStyle(4, 0xfffb10, 1).strokeRoundedRect(b.x - 3, 37, 92, 81, 12);
    });
  }

  toast(msg) {
    if (this.toastText) this.toastText.destroy();
    this.toastText = PetGame.UI.text(this, 480, 150, msg, 18, '#ffffff', {
      backgroundColor: 'rgba(60,40,20,0.8)', padding: { x: 14, y: 6 }
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1800, duration: 500 });
  }

}
