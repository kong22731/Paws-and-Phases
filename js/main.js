/*
 * main.js — ตั้งค่าและเริ่ม Phaser
 */
window.PetGame = window.PetGame || {};
PetGame.speed = 1; // ความเร็วเวลาในเกม (ปรับได้ที่เมนู)

(function start() {
  const boot = () => {
    if (PetGame.game) return;
    PetGame.chat = new PetGame.ChatPanel();
    PetGame.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-container',
      width: PetGame.Data.WIDTH,
      height: PetGame.Data.HEIGHT,
      backgroundColor: '#ffffff',
      dom: { createContainer: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
      scene: [BootScene, TitleScene, BreedScene, DayScene, GameScene, ProfileScene, HintScene, MenuScene, SlotScene, EvolutionScene, CodexScene]
    });
  };
  // รอฟอนต์โหลดก่อน (ไม่เกิน 2 วินาที) เพื่อให้ตัวอักษรใน canvas แสดงถูกต้อง
  const fontReady = document.fonts
    ? Promise.all(['20px Kanit', '500 20px Kanit', '600 20px Kanit', '20px Sniglet', 'bold 20px Sniglet','20px Amarante', 'italic 800 20px Inter'].map((f) => document.fonts.load(f)))
    : Promise.resolve();
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 2000))]).then(boot, boot);
})();
