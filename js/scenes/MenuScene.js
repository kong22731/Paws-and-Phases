/*
 * MenuScene.js — ป๊อปอัปเมนู: เล่นต่อ, ความยาววัน, ความเร็วเวลา, เปิด/ปิดเพลงและเสียง, กลับหน้าแรก
 * (ไม่มีในดีไซน์ Figma — ใช้สไตล์เดียวกับ Evolution Book)
 */
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(data) { this.pet = data.pet; this.gameScene = data.game; }

  create() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const W = D.WIDTH;
    UI.dim(this, 0.4).on('pointerdown', () => this.close());
    const px = W / 2 - 240, py = 40, pw = 480, ph = 520;
    const panel = UI.box(this, px, py, pw, ph, { fill: C.olivePale, stroke: C.olive, strokeW: 10, radius: 20 });
    panel.setInteractive(new Phaser.Geom.Rectangle(px, py, pw, ph), Phaser.Geom.Rectangle.Contains);
    UI.title(this, W / 2, 92, 'Menu', 48, '#ffffff', C.oliveCss).setOrigin(0.5);
    UI.imageButton(this, px + 38, py + 38, 'close', 40, 40, () => this.close());

    const opts = { size: 24, align: 'center' };
    const row = (i) => 150 + i * 56, bh = 48, half = Object.assign({}, opts, { size: 20 });
    UI.bar(this, W / 2, row(0), 400, bh, 'Resume', () => this.close(), Object.assign({ fill: C.olive }, opts));
    // บันทึกเกม (กดครั้งแรกแล้วตัวนี้จะ autosave ตลอด)
    this.saveBtn = UI.bar(this, W / 2, row(1), 400, bh, '', () => this.saveGame(), opts);
    // ความยาว 1 วัน (3 / 5 / 7 / 10 นาที)
    this.dayBtn = UI.bar(this, W / 2, row(2), 400, bh, '', () => this.cycleDay(), opts);
    this.speedBtn = UI.bar(this, W / 2, row(3), 400, bh, '', () => this.cycleSpeed(), opts);
    // เพลง / เสียงเอฟเฟกต์ (ครึ่งปุ่ม)
    this.musicBtn = UI.bar(this, W / 2 - 102, row(4), 196, bh, '', () => this.toggle('music'), half);
    this.sfxBtn = UI.bar(this, W / 2 + 102, row(4), 196, bh, '', () => this.toggle('sfx'), half);
    // ควบคุมด้วยมือ: ความไว (Normal / Easy) + ชี้ค้างเพื่อกด (ON / OFF)
    this.handBtn = UI.bar(this, W / 2 - 102, row(5), 196, bh, '', () => this.cycleHand(), half);
    this.dwellBtn = UI.bar(this, W / 2 + 102, row(5), 196, bh, '', () => this.toggleDwell(), half);
    UI.bar(this, W / 2, row(6), 400, bh, 'Main Menu', () => this.goHome(), opts);
    this.note = UI.text(this, W / 2, 530, '', 13, C.oliveCss, { align: 'center' }).setOrigin(0.5);
    this.refreshLabels();
  }

  refreshLabels() {
    const s = PetGame.settings;
    this.dayBtn.label.setText(`Day Length:  ${s.dayMinutes} min`);
    this.speedBtn.label.setText(`Time Speed:  x${PetGame.speed}`);
    this.musicBtn.label.setText(`Music: ${s.music ? 'ON' : 'OFF'}`);
    this.sfxBtn.label.setText(`Sound: ${s.sfx ? 'ON' : 'OFF'}`);
    this.musicBtn.setAlpha(s.music ? 1 : 0.6);
    this.sfxBtn.setAlpha(s.sfx ? 1 : 0.6);
    this.handBtn.label.setText(`Hand: ${s.handSensitivity === 'easy' ? 'Easy' : 'Normal'}`);
    this.dwellBtn.label.setText(`Dwell: ${s.dwell !== false ? 'ON' : 'OFF'}`);
    this.dwellBtn.setAlpha(s.dwell !== false ? 1 : 0.6);
    this.saveBtn.label.setText(this.pet.slot ? `Save Game  (File ${this.pet.slot} · Auto-save)` : 'Save Game');
    this.saveBtn.label.setFontSize(this.pet.slot ? 20 : 24);
    const left = this.pet ? Math.ceil(this.pet.dayLeft() / 60) : 0;
    this.note.setText(`1 day = ${s.dayMinutes} min at x1 (about ${left} min left today)\nDay length is saved for every day`);
  }

  cycleDay() {
    PetGame.Settings.nextDayLength();
    this.refreshLabels();
  }

  cycleSpeed() {
    const speeds = PetGame.Data.SPEEDS;
    PetGame.speed = speeds[(speeds.indexOf(PetGame.speed) + 1) % speeds.length];
    this.refreshLabels();
  }

  // ความไวมือ: Easy = ถุงมือนิ่งขึ้น ขยับแขนน้อยลง ชี้ค้างสั้นลง (0.7 วิ)
  cycleHand() {
    PetGame.Settings.set('handSensitivity', PetGame.settings.handSensitivity === 'easy' ? 'normal' : 'easy');
    this.refreshLabels();
  }

  // ชี้ค้างบนปุ่มเพื่อกด (Dwell Click)
  toggleDwell() {
    PetGame.Settings.set('dwell', PetGame.settings.dwell === false);
    this.refreshLabels();
  }

  toggle(key) {
    const on = !PetGame.settings[key];
    if (key === 'music') PetGame.Sound.setMusic(on, this);
    else PetGame.Sound.setSfx(on);
    this.refreshLabels();
  }

  // บันทึก: เปิดหน้าเลือกไฟล์ (Save Game) ; บันทึกแล้วตัวนี้จะ autosave ลงไฟล์นั้นต่อไปเอง
  saveGame(then) {
    this.scene.pause();
    this.scene.launch('Slots', {
      mode: 'save', pet: this.pet,
      onClose: () => { this.scene.resume(); this.refreshLabels(); },
      onSaved: (n) => {
        this.toast(`${this.pet.name} saved to File ${n}! Auto-save is now ON.`);
        if (then) then();
      }
    });
  }

  // กลับหน้าแรก: ตัวที่ยังไม่เคยบันทึก -> เตือนให้ Save ก่อน (ไม่งั้นจะหายไป)
  goHome() {
    const leave = () => { this.scene.stop('Game'); this.scene.start('Title'); };
    if (this.pet.slot) { this.pet.autosave(); leave(); return; }
    PetGame.UI.confirm(this, `${this.pet.name} is not saved yet.\nUnsaved progress will be lost.`, () => this.saveGame(leave),
      { question: 'Save before leaving?', yes: 'SAVE', no: "DON'T SAVE", onNo: leave, closable: true });
  }

  toast(msg) {
    if (this.toastText) this.toastText.destroy();
    this.toastText = PetGame.UI.text(this, PetGame.Data.WIDTH / 2, 20, msg, 18, '#ffffff', {
      backgroundColor: 'rgba(60,65,34,0.9)', padding: { x: 14, y: 6 }
    }).setOrigin(0.5, 0).setDepth(60);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1800, duration: 500 });
  }

  close() {
    this.scene.stop();
    this.scene.resume('Game');
  }
}
