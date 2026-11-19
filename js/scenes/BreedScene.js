/*
 * BreedScene.js — "Choose Your Pet" (Figma: Choosing Pet / Put A Name)
 * เลือกหมาหรือแมว แล้วตั้งชื่อ -> ฉาก DAY 1 -> หน้าเลี้ยง
 */
class BreedScene extends Phaser.Scene {
  constructor() { super('Breed'); }

  create() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const W = D.WIDTH;
    this.cameras.main.setBackgroundColor('#ffffff');
    this.species = null;
    // พื้นหลังทุ่งดอกไม้ (ทึบ 75%)
    if (this.textures.exists('bg_choose')) this.add.image(-56, 0, 'bg_choose').setOrigin(0).setDisplaySize(1071, 600).setAlpha(0.75);
    UI.title(this, W / 2, 96, 'Choose Your Pet', 80, C.oliveTitleCss, C.oliveCss).setOrigin(0.5);

    // แผงเลือกสัตว์
    UI.box(this, 165, 167, 633, 280, { fill: 0xfcfcfc, stroke: C.olive, strokeW: 5, radius: 20 });
    this.highlight = this.add.graphics();
    this.slots = { dog: { x: 204, img: [339.5, 307, 288, 263] }, cat: { x: 487, img: [633.7, 310.3, 237, 226] } };
    this.pets = {};
    Object.entries(this.slots).forEach(([sp, s]) => {
      const [cx, cy, mw, mh] = s.img;
      const img = this.add.image(cx, cy, `body_${sp}_baby`);
      img.setScale(Math.min(mw / img.width, mh / img.height));
      img.baseScale = img.scale;
      this.pets[sp] = img;
      const zone = this.add.zone(s.x + 136, 308.5, 272, 237).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.select(sp)); // select() เล่นเสียงเอง
      zone.on('pointerover', () => this.tweens.add({ targets: img, scale: img.baseScale * 1.05, duration: 120 }));
      zone.on('pointerout', () => this.tweens.add({ targets: img, scale: img.baseScale, duration: 120 }));
    });

    // ปุ่มย้อนกลับ -> หน้าปก (มุมซ้ายบน)
    const back = UI.iconButton(this, 52, 52, 60, 'back', () => this.scene.start('Title'), { fill: C.oliveMid, stroke: C.olive, iconSize: 40 });
    UI.text(this, 52, 94, 'BACK', 15, '#ffffff', { stroke: C.oliveCss, strokeThickness: 4 }).setOrigin(0.5);
    back.setDepth(10);

    this.nextBtn = UI.bar(this, W / 2, 509.5, 308, 83, 'NEXT', () => this.next(), { size: 36, arrow: true });
    this.nextBtn.setAlpha(0.5);
  }

  select(sp) {
    const C = PetGame.Data.COLORS;
    this.species = sp;
    PetGame.Sound.play('select');
    const x = this.slots[sp].x;
    this.highlight.clear()
      .fillStyle(C.oliveMid, 1).fillRoundedRect(x, 190, 272, 237, 20)
      .lineStyle(10, C.olive, 1).strokeRoundedRect(x + 5, 195, 262, 227, 15);
    this.tweens.add({ targets: this.pets[sp], y: this.pets[sp].y - 12, duration: 140, yoyo: true });
    this.nextBtn.setAlpha(1);
  }

  next() {
    if (!this.species) {
      this.tweens.add({ targets: this.nextBtn, x: this.nextBtn.x + 8, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    this.askName();
  }

  // ป๊อปอัปตั้งชื่อ (Figma: Put A Name)
  askName() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const layer = this.add.container(0, 0).setDepth(100);
    layer.add(UI.dim(this, 0.4));
    layer.add(UI.box(this, 240, 141, 479, 318, { fill: C.olivePale, stroke: C.olive, strokeW: 10, radius: 20 }));
    layer.add(UI.title(this, 479.5, 204, 'Name Your Pet', 48, '#ffffff', C.oliveCss).setOrigin(0.5));
    const def = 'Name'; // ชื่อเริ่มต้น (ผู้เล่นพิมพ์ทับได้)
    const input = this.add.dom(479.5, 291).createFromHTML(`<input class="name-input" type="text" maxlength="12" value="${def}">`);
    layer.add(input);
    const el = input.node.querySelector('input') || input.node;
    setTimeout(() => { el.focus(); el.select(); }, 50);
    const go = () => this.start((el.value || '').trim() || def);
    el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    layer.add(UI.bar(this, 370.5, 390, 129, 74, 'BACK', () => layer.destroy(), { strokeW: 0, align: 'center', size: 32 }));
    layer.add(UI.bar(this, 549, 390, 208, 74, 'START', go, { fill: C.olive, strokeW: 0, size: 32, arrow: true }));
  }

  start(name) {
    // บันทึกลงไฟล์ว่างช่องแรกทันที (autosave ตลอด) ; ถ้าไฟล์เต็มทั้ง 3 ช่อง -> ต้องกด Save ที่เมนูเอง
    const pet = PetGame.PetState.create(this.species, name);
    const empty = PetGame.PetState.slots().findIndex((s) => !s);
    if (empty >= 0) pet.save(empty + 1);
    this.scene.start('Day', { pet, fresh: true });
  }
}
