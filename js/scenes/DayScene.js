/*
 * DayScene.js — ฉากเปลี่ยนวัน: พื้นฟ้า + "Day N" (Figma: Change Day)
 * แสดงสั้น ๆ แล้วเข้าหน้าเลี้ยง ; data = { pet, fresh, away, dayResult }
 */
class DayScene extends Phaser.Scene {
  constructor() { super('Day'); }

  init(data) { this.data0 = data; this.leaving = false; }

  create() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    if (PetGame.chat) PetGame.chat.detach();
    this.cameras.main.setBackgroundColor(C.dayBg); // พื้นฟ้าตามดีไซน์ Figma (Change Day)
    const t = UI.title(this, D.WIDTH / 2, D.HEIGHT / 2, `Day ${this.data0.pet.day}`, 128, '#ffffff', C.tealCss)
      .setOrigin(0.5).setAlpha(0).setScale(0.8).setStroke(C.tealCss, 5);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 450, ease: 'Back.easeOut' });
    PetGame.Sound.play('day');
    this.cameras.main.fadeIn(250, 148, 226, 234);
    this.time.delayedCall(1500, () => this.leave(true));
    this.input.once('pointerdown', () => this.leave(false)); // กดเพื่อข้ามได้
  }

  leave(fade) {
    if (this.leaving) return;
    this.leaving = true;
    if (!fade) { this.scene.start('Game', this.data0); return; }
    this.cameras.main.fadeOut(300, 148, 226, 234);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', this.data0));
  }
}
