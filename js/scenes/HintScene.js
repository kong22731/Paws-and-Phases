/*
 * HintScene.js — ป๊อปอัป Hint (Figma: UI Hint) เปิดจากปุ่มหลอดไฟ (ขึ้นเมื่อบรรลุร่างที่ 3 ของสาย)
 * Summary            = วิธีไปร่างถัดไปของสายนี้ (stage 3 -> 4, 4 -> 5) + วันนี้ทำตามเป้าแล้วหรือยัง
 * Stats Recommendation = ระดับที่แนะนำของแต่ละด้าน (Feed / Care / Play / Rest) สำหรับสายนี้
 */
class HintScene extends Phaser.Scene {
  constructor() { super('Hint'); }

  init(data) { this.pet = data.pet; }

  create() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const p = this.pet;
    const guide = D.LINE_GUIDE[p.line];
    UI.tealPopup(this, `Hint for Stage ${Math.min(D.MAX_STAGE, p.stage + 1)}`, () => this.close());

    // Summary
    const today = PetGame.EvolutionAI.analyze(p.careWindow, p.stage);
    const ok = today.met[p.line];
    UI.card(this, 278, 175, 402, 114, C.teal);
    UI.outlined(this, 292, 185, 'Summary', 16);
    let tip = guide ? guide.tip : 'Keep caring for your pet every day.';
    if (guide && guide.social) tip += ` (Chat ${PetGame.EvolutionAI.CFG.leaderChats}+ times a day — today: ${today.chats})`;
    UI.text(this, 294, 207, tip, 14, '#1f4f57', { wordWrap: { width: 374, useAdvancedWrap: true }, lineSpacing: 2 });
    const left = p.missesLeft();
    const warn = left <= 1 ? '⚠️ Not on track yet — missing today will change it back 1 stage!'
      : `⚠️ Not on track yet today (${left} missed days in a row → back 1 stage)`;
    UI.text(this, 294, 268, ok ? '✅ Today you are on track!' : warn, 12.5, ok ? '#2e8b57' : '#c0392b');

    // Stats Recommendation: แถบ = ระดับที่แนะนำ, ตัวเลข = ระดับที่แนะนำ (0-100)
    UI.card(this, 278, 301, 402, 168, C.teal);
    UI.outlined(this, 294, 312, 'Stats Recommendation', 16);
    const targets = guide ? guide.targets : { fullness: 50, health: 50, happiness: 50, energy: 50 };
    D.STAT_ORDER.forEach((k, i) => {
      const y = 339 + i * 30.7, v = targets[k];
      this.add.image(305, y + 10, 'ui_' + D.STAT_INFO[k].img + '_teal').setDisplaySize(25, 25);
      UI.pillMeter(this, 326, y, 305, 21).set(v);
      UI.outlined(this, 641, y + 1, v >= 70 ? 'High' : v <= 20 ? 'Low' : 'Mid', 14);
    });
  }

  close() {
    this.scene.stop();
    this.scene.resume('Game');
  }
}
