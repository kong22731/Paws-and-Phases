/*
 * EvolutionScene.js — ฉากวิวัฒนาการ + แสดงผลการวิเคราะห์ของ AI ว่าทำไมได้สายนี้
 * จอแนวนอน: วิวัฒนาการกลางจอ แล้วเลื่อนตัวสัตว์ไปซ้าย ผลวิเคราะห์ขึ้นด้านขวา
 */
class EvolutionScene extends Phaser.Scene {
  constructor() { super('Evolution'); }

  init(data) {
    this.pet = data.pet;
    this.from = data.from;
    this.result = data.result;
    this.regress = !!data.regress; // true = ไม่ถึงเป้า ถอยกลับ 1 ขั้น
  }

  create() {
    const UI = PetGame.UI, D = PetGame.Data;
    const W = D.WIDTH, H = D.HEIGHT, cx = W / 2, cy = 300;
    // สีของสายปัจจุบัน (ร่างแรกไม่มีสาย -> สีฟ้า) ; ถอยร่างใช้สีเทา
    const line = this.pet.line ? D.LINES[this.pet.line] : { color: D.COLORS.teal, icon: '🐣', label: 'Newborn' };
    const rayColor = this.regress ? 0x8a8f99 : line.color;

    this.add.rectangle(W / 2, H / 2, W, H, 0x2b2814, 0.92).setInteractive();
    this.title = UI.text(this, cx, 48, this.regress ? `${this.pet.name} is changing back...` : `${this.pet.name} is evolving...`, 34, '#ffffff').setOrigin(0.5);

    const rays = this.add.graphics({ x: cx, y: cy });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillStyle(rayColor, 0.35).slice(0, 0, 260, a, a + 0.14, false).fillPath();
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
    const glow = this.add.circle(cx, cy, 125, 0xffffff, 0.12);

    const fit = (img) => img.setScale(Math.min(220 / img.height, 260 / img.width));
    const oldImg = fit(this.add.image(cx, cy + 115, this.from.key).setOrigin(0.5, 1));
    const newImg = fit(this.add.image(cx, cy + 115, this.pet.bodyKey()).setOrigin(0.5, 1)).setAlpha(0);
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0);
    this.stage = [rays, glow, oldImg, newImg];

    PetGame.Sound.play(this.regress ? 'regress' : 'charge');
    this.tweens.add({
      targets: oldImg, alpha: 0.2, duration: 160, yoyo: true, repeat: 7,
      onComplete: () => this.tweens.add({
        targets: flash, alpha: 1, duration: 300, yoyo: true,
        onYoyo: () => { oldImg.setVisible(false); newImg.setAlpha(1); if (!this.regress) PetGame.Sound.play('evolve'); },
        onComplete: () => this.showResult(line)
      })
    });
    this.tweens.add({ targets: [oldImg, newImg], scaleY: '*=1.03', duration: 500, yoyo: true, repeat: -1 });
  }

  showResult(line) {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const r = this.result, lx = 250, p = this.pet;
    this.title.setText(this.regress ? `${this.from.name} ➜ ${p.formName()}...` : `${this.from.name} ➜ ${p.formName()}!`);

    // เลื่อนตัวสัตว์ไปซ้าย แล้วค่อยแสดงผลวิเคราะห์ด้านขวา
    this.tweens.add({ targets: this.stage, x: lx, duration: 500, ease: 'Sine.easeInOut' });
    // ชื่อสายเปิดเผยเมื่อไปถึงร่างสูงสุดของสายนั้นแล้วเท่านั้น
    let lineLabel;
    if (!p.line) lineLabel = `🐣 Newborn (Stage 1)`;
    else if (p.isCompleted(p.line)) lineLabel = `${line.icon} ${line.label} Route${p.isMax() ? ' — completed!' : ''}`;
    else lineLabel = `❓ ??? Route · Stage ${p.stage}`;
    const lineText = UI.text(this, lx, 450, lineLabel, 24, '#ffffff').setOrigin(0.5).setAlpha(0);

    const box = this.add.container(0, 0).setAlpha(0);
    const x0 = 480, tx = 505;
    box.add(UI.box(this, x0, 100, 440, 400, { fill: C.tealPale, stroke: C.teal, strokeW: 10, radius: 20 }));
    box.add(UI.text(this, tx, 120, this.regress ? '📉 Goal not met yesterday' : '🧠 AI care analysis (yesterday)', 20, '#1f4f57'));
    const why = this.regress ? `${r.reason}.\nCare in the same style as before to grow again!` : `Reason: ${r.reason}`;
    box.add(UI.text(this, tx, 158, why, 16, '#1f1f1f', { wordWrap: { width: 390, useAdvancedWrap: true } }));

    [['feed', '🍔 Food', 0xf59e3b], ['play', '⚽ Play', 0x3b82f6], ['care', '🛁 Care', 0x0fae96], ['rest', '💤 Rest', 0x6366f1]].forEach(([k, label, col], i) => {
      const y = 262 + i * 38;
      box.add(UI.text(this, tx, y, label, 17));
      const m = UI.meter(this, 610, y + 5, 230, 15, col, { bg: 0xdedfd6 }).set(r.shares[k] * 100);
      box.add(m.graphics);
      box.add(UI.text(this, 895, y, `${Math.round(r.shares[k] * 100)}%`, 16, C.tealCss).setOrigin(1, 0));
    });
    box.add(UI.text(this, tx, 428, `Chats: ${r.chats}  ·  Care points: ${Math.round(r.total)}  ·  Avg. wellbeing ${Math.round(r.avgWell)}/100`, 13, C.tealCss, { wordWrap: { width: 390 } }));

    const btn = UI.bar(this, 700, 548, 360, 60, this.regress ? 'OK' : 'Great!', () => {
      this.scene.stop();
      this.scene.resume('Game');
    }, { fill: C.tealLight, stroke: C.teal, arrow: true, size: 28 }).setAlpha(0);

    this.tweens.add({ targets: [lineText, box, btn], alpha: 1, delay: 400, duration: 400 });
  }
}
