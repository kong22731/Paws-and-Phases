/*
 * ProfileScene.js — ป๊อปอัป Profile (Figma: UI Profile) เปิดจากการกดรูป avatar
 * รูปสัตว์ + ชื่อ/พันธุ์/ร่าง + ความผูกพัน + ค่าสถานะ 4 ค่า
 */
class ProfileScene extends Phaser.Scene {
  constructor() { super('Profile'); }

  init(data) { this.pet = data.pet; }

  create() {
    const UI = PetGame.UI, C = PetGame.Data.COLORS;
    const p = this.pet;
    UI.tealPopup(this, 'Profile', () => this.close());

    // รูปสัตว์
    UI.card(this, 278, 175, 130, 114, 0xbdbfbf);
    const img = this.add.image(343, 280, p.bodyKey()).setOrigin(0.5, 1);
    img.setScale(Math.min(112 / img.width, 96 / img.height));

    // ข้อมูล
    UI.card(this, 418, 175, 262, 114, C.teal);
    [['Name', p.name], ['Breed', p.breedLabel()], ['Stage', `${p.formName()} (${p.stage}/${PetGame.Data.MAX_STAGE})`]].forEach(([k, v], i) => {
      const y = 185 + i * 22;
      UI.box(this, 430, y, 237, 20, { fill: C.tealLight, radius: 10 });
      const s = `${k}: ${v}`;
      UI.outlined(this, 437, y + 10, s, s.length > 30 ? 11 : s.length > 25 ? 12 : 14).setOrigin(0, 0.5).setStroke(C.tealCss, 3);
    });
    this.add.image(442.5, 265.5, 'ui_bond').setDisplaySize(25, 25);
    UI.pillMeter(this, 458, 256, 183, 20, { border: C.bondBorder, fill: C.bondFill, pad: 3 }).set(p.bond);
    UI.text(this, 648, 266, String(Math.round(p.bond)), 16, '#ffffff', { stroke: C.bondCss, strokeThickness: 3 }).setOrigin(0, 0.5);

    // ค่าสถานะ
    UI.card(this, 278, 301, 402, 168, C.teal);
    UI.outlined(this, 294, 312, 'Stats', 16);
    UI.statRows(this, p, 339);
    UI.text(this, 480, 476.5, `Day ${p.day}  ·  Social ${Math.round(p.bond)} (grows by chatting)`, 12, C.tealCss).setOrigin(0.5);
  }

  close() {
    this.scene.stop();
    this.scene.resume('Game');
  }
}
