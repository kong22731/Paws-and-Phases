/*
 * SlotScene.js — หน้าเลือกไฟล์เซฟ (3 ไฟล์) ใช้ 2 แบบ
 *   mode 'load' : จากปุ่ม Continue หน้าปก -> เลือกไฟล์แล้วเล่นต่อ (LOAD / COPY / CLEAR / BACK)
 *   mode 'save' : จากปุ่ม Save Game ในเมนู -> เลือกไฟล์ที่จะบันทึกสัตว์ตัวนี้ (SAVE / COPY / CLEAR / BACK)
 * กดการ์ดเพื่อเลือก (กดซ้ำ = LOAD/SAVE) ; สไตล์เดียวกับเมนู (กรอบเขียวมะกอก)
 */
class SlotScene extends Phaser.Scene {
  constructor() { super('Slots'); }

  // data: { mode, pet (โหมด save), onSaved(), onClose() }
  init(data) {
    this.mode = data.mode || 'load';
    this.pet = data.pet || null;
    this.onSaved = data.onSaved || null;
    this.onClose = data.onClose || null;
    // ไฟล์ที่เลือกไว้ก่อน: ไฟล์ของตัวนี้ / (โหมด save) ไฟล์ว่างไฟล์แรก / ไฟล์ 1
    const empty = PetGame.PetState.slots().findIndex((p) => !p) + 1;
    this.selected = this.pet && this.pet.slot ? this.pet.slot : (this.mode === 'save' && empty ? empty : 1);
    this.copyFrom = null;
  }

  create() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const W = D.WIDTH, H = D.HEIGHT;
    const isLoad = this.mode === 'load';
    if (isLoad) {
      // พื้นหลังหน้าปกจาง ๆ
      if (this.textures.exists('cover_bg')) {
        const bg = this.add.image(W / 2, H / 2, 'cover_bg');
        bg.setScale(Math.max(W / bg.width, H / bg.height));
      }
      this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.35);
    } else {
      UI.dim(this, 0.45);
    }
    const px = 150, py = 22, pw = 660, ph = 556;
    const panel = UI.box(this, px, py, pw, ph, { fill: C.olivePale, stroke: C.olive, strokeW: 10, radius: 20 });
    panel.setInteractive(new Phaser.Geom.Rectangle(px, py, pw, ph), Phaser.Geom.Rectangle.Contains);
    UI.title(this, W / 2, 70, isLoad ? 'Load Game' : 'Save Game', 46, '#ffffff', C.oliveCss).setOrigin(0.5);
    UI.imageButton(this, px + 38, py + 38, 'close', 40, 40, () => this.close());
    this.hint = UI.text(this, W / 2, 112, '', 15, C.oliveCss, { align: 'center' }).setOrigin(0.5);

    this.cardLayer = this.add.container(0, 0);
    this.renderCards();

    // ปุ่มด้านล่าง
    const by = 528, bw = 140, bh = 50, opts = { align: 'center', size: 22 };
    UI.bar(this, 246, by, bw, bh, isLoad ? 'LOAD' : 'SAVE', () => this.primary(this.selected), Object.assign({ fill: C.olive }, opts));
    this.copyBtn = UI.bar(this, 402, by, bw, bh, 'COPY', () => this.startCopy(), opts);
    UI.bar(this, 558, by, bw, bh, 'CLEAR', () => this.clearSlot(), opts);
    UI.bar(this, 714, by, bw, bh, 'BACK', () => this.close(), opts);

    if (isLoad) PetGame.Sound.startMusic(this);
    this.setHint();
  }

  setHint(msg) {
    const def = this.mode === 'load'
      ? 'Choose a file to continue (click again to load)'
      : `Choose a file to save ${this.pet.name} (auto-save will keep it updated)`;
    this.hint.setText(msg || def).setColor(msg ? '#c0392b' : PetGame.Data.COLORS.oliveCss);
  }

  // ---------- การ์ดไฟล์เซฟ ----------
  renderCards() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    this.cardLayer.removeAll(true);
    this.slots = PetGame.PetState.slots();
    const cx = 480, cw = 560, ch = 112, top = 132, gap = 12;
    this.slots.forEach((pet, i) => {
      const n = i + 1, y = top + i * (ch + gap), x = cx - cw / 2;
      const sel = n === this.selected, src = n === this.copyFrom;
      const c = this.add.container(0, 0);
      c.add(UI.box(this, x, y, cw, ch, {
        fill: sel ? C.tealPale : C.white, stroke: sel ? C.teal : (src ? C.statMid : C.olive),
        strokeW: sel ? 6 : 4, radius: 16, shadow: true
      }));
      // ป้ายเลขไฟล์
      c.add(UI.box(this, x + 14, y + 12, 70, 26, { fill: sel ? C.teal : C.oliveMid, radius: 13 }));
      c.add(UI.text(this, x + 49, y + 25, `File ${n}`, 15, '#ffffff').setOrigin(0.5));
      if (sel) {
        // ตัวชี้ ◆ ด้านซ้ายของไฟล์ที่เลือก
        const m = this.add.graphics();
        m.fillStyle(C.teal, 1).fillPoints([{ x: x - 30, y: y + ch / 2 }, { x: x - 20, y: y + ch / 2 - 10 }, { x: x - 10, y: y + ch / 2 }, { x: x - 20, y: y + ch / 2 + 10 }], true);
        c.add(m);
        this.tweens.add({ targets: m, x: 4, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      if (pet) {
        const dim = this.mode === 'save' && this.pet && pet.id === this.pet.id;
        // รูปหน้า
        c.add(UI.box(this, x + 22, y + 42, 62, 62, { fill: C.tealPale, stroke: C.teal, strokeW: 3, radius: 31 }));
        if (this.textures.exists(pet.portraitKey())) c.add(this.add.image(x + 53, y + 73, pet.portraitKey()).setDisplaySize(56, 56));
        // ชื่อ / ร่าง / Social
        c.add(UI.text(this, x + 100, y + 14, pet.name, 24, C.oliveDarkCss));
        c.add(UI.text(this, x + 100, y + 48, `${pet.formName()} · Stage ${pet.stage}`, 16, '#3f4122'));
        c.add(UI.box(this, x + 100, y + 78, 150, 16, { fill: C.white, stroke: C.bondBorder, strokeW: 3, radius: 8 }));
        const bw = Math.max(0, Math.min(100, pet.bond)) / 100 * 144;
        if (bw > 1) c.add(UI.box(this, x + 103, y + 81, Math.max(10, bw), 10, { fill: C.bondFill, radius: 5 }));
        c.add(UI.text(this, x + 258, y + 86, 'Social', 13, C.bondCss).setOrigin(0, 0.5));
        // ขวา: วัน / เวลาเล่น / วันที่บันทึก
        c.add(UI.text(this, x + cw - 22, y + 16, `Day ${pet.day}`, 24, C.oliveDarkCss).setOrigin(1, 0));
        c.add(UI.text(this, x + cw - 22, y + 50, `Time ${SlotScene.hms(pet.gameTime)}`, 17, '#3f4122').setOrigin(1, 0));
        c.add(UI.text(this, x + cw - 22, y + 78, dim ? 'Playing now' : `Saved ${SlotScene.when(pet.savedAt)}`, 13, dim ? C.tealCss : '#8a8c62').setOrigin(1, 0));
      } else {
        c.add(UI.text(this, cx, y + ch / 2 + 6, '— Empty —', 24, '#a7a979').setOrigin(0.5));
      }
      const zone = this.add.zone(cx, y + ch / 2, cw, ch).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.pick(n));
      c.add(zone);
      this.cardLayer.add(c);
    });
    if (this.copyBtn) this.copyBtn.setAlpha(this.copyFrom ? 0.6 : 1);
  }

  static hms(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const p = (v) => String(v).padStart(2, '0');
    return `${p(Math.floor(sec / 3600))}:${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}`;
  }
  static when(ms) {
    if (!ms) return '-';
    const d = new Date(ms), p = (v) => String(v).padStart(2, '0');
    return `${d.getDate()}/${d.getMonth() + 1} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // กดการ์ด: โหมดคัดลอก -> เลือกปลายทาง ; กดการ์ดที่เลือกอยู่ซ้ำ -> LOAD/SAVE
  pick(n) {
    if (this.copyFrom) { this.finishCopy(n); return; }
    if (n === this.selected) { this.primary(n); return; }
    PetGame.Sound.play('select');
    this.selected = n;
    this.setHint();
    this.renderCards();
  }

  primary(n) {
    const pet = this.slots[n - 1];
    if (this.mode === 'load') {
      if (!pet) { PetGame.Sound.play('error'); this.setHint(`File ${n} is empty.`); return; }
      PetGame.Sound.play('select');
      this.scene.start('Day', { pet });
      return;
    }
    // โหมด save: ไฟล์ว่าง / ไฟล์ของตัวนี้เอง -> บันทึกเลย ; ไฟล์ของตัวอื่น -> ถามก่อนเขียนทับ
    const doSave = () => {
      if (this.pet.slot && this.pet.slot !== n) PetGame.PetState.clearSlot(this.pet.slot); // ย้ายไฟล์
      this.pet.save(n);
      PetGame.Sound.play('select');
      const cb = this.onSaved;
      this.finish();
      if (cb) cb(n);
    };
    if (pet && pet.id !== this.pet.id) {
      PetGame.UI.confirm(this, `File ${n} has "${pet.name}" (Day ${pet.day}).\nSaving will replace it.`, doSave,
        { question: 'Overwrite?', yes: 'SAVE', no: 'CANCEL' });
    } else doSave();
  }

  startCopy() {
    if (this.copyFrom) { this.copyFrom = null; this.setHint(); this.renderCards(); return; } // กดซ้ำ = ยกเลิก
    if (!this.slots[this.selected - 1]) { PetGame.Sound.play('error'); this.setHint('Choose a file with a pet to copy.'); return; }
    this.copyFrom = this.selected;
    this.setHint(`Copy File ${this.copyFrom} to which file? (press COPY again to cancel)`);
    this.renderCards();
  }

  finishCopy(to) {
    const from = this.copyFrom;
    if (to === from) { this.copyFrom = null; this.setHint(); this.renderCards(); return; }
    const target = this.slots[to - 1];
    const doCopy = () => {
      PetGame.PetState.copySlot(from, to);
      PetGame.Sound.play('select');
      this.copyFrom = null;
      this.selected = to;
      this.setHint();
      this.renderCards();
    };
    if (target) {
      if (this.pet && target.id === this.pet.id) { PetGame.Sound.play('error'); this.setHint('Cannot copy over the pet you are playing.'); return; }
      PetGame.UI.confirm(this, `File ${to} has "${target.name}" (Day ${target.day}).\nCopying will replace it.`, doCopy,
        { question: 'Overwrite?', yes: 'COPY', no: 'CANCEL' });
    } else doCopy();
  }

  clearSlot() {
    const n = this.selected, pet = this.slots[n - 1];
    this.copyFrom = null;
    if (!pet) { PetGame.Sound.play('error'); this.setHint(`File ${n} is already empty.`); this.renderCards(); return; }
    const playing = this.pet && pet.id === this.pet.id;
    PetGame.UI.confirm(this, `Delete File ${n} "${pet.name}" (Day ${pet.day})?\nThis cannot be undone.`, () => {
      PetGame.PetState.clearSlot(n);
      if (playing) this.pet.slot = null; // ตัวที่เล่นอยู่กลายเป็นยังไม่บันทึก (หยุด autosave)
      PetGame.Sound.play('close');
      this.setHint();
      this.renderCards();
    }, { question: 'Clear file?', yes: 'CLEAR', no: 'CANCEL' });
  }

  finish() {
    if (this.mode === 'load') { this.scene.start('Title'); return; }
    const cb = this.onClose;
    this.scene.stop();
    if (cb) cb();
  }

  close() {
    if (this.copyFrom) { this.copyFrom = null; this.setHint(); this.renderCards(); return; }
    this.finish();
  }
}
