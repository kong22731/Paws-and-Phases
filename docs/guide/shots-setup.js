/*
 * shots-setup.js — ใช้ถ่ายภาพหน้าจอสำหรับคู่มือ (docs/guide/make-shots.ps1) ไม่ได้ใช้ในตัวเกม
 * เปิด shots.html?s=<ชื่อภาพ> แล้วสคริปต์นี้จะจัดหน้าจอให้ตรงกับภาพนั้น
 */
(function () {
  const q = new URLSearchParams(location.search).get('s') || 'title';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const mk = (sp, name, line, stage, extra) => {
    const p = PetGame.PetState.create(sp, name);
    p.line = line; p.stage = stage; p.bond = 46; p.day = Math.max(1, stage * 2 - 1);
    p.stats = { fullness: 72, happiness: 85, health: 64, energy: 38 };
    p.dayTime = 70;
    if (line) for (let s = 2; s <= stage; s++) p.unlocked.push(`${sp}_${line}_${s}`);
    return Object.assign(p, extra || {});
  };
  const game = () => PetGame.game.scene.getScene('Game');
  // เบราว์เซอร์แบบไม่มีหน้าจอ (headless) แทบไม่เดินลูปเกมเอง -> สั่งเดินเฟรมเองให้แอนิเมชัน/การเปิดฉากเสร็จ
  let T = 0;
  const pump = async (ms) => {
    const g = PetGame.game;
    T = Math.max(T, performance.now());
    for (let i = 0; i < ms / 16.7; i++) { T += 16.7; g.step(T, 16.7); }
    await wait(30);
  };

  (async () => {
    while (!(window.PetGame && PetGame.game && PetGame.game.scene.isActive('Title'))) await wait(100);
    await wait(400);
    const g = PetGame.game;
    switch (q) {
      case 'title': break;
      case 'breed': {
        g.scene.start('Breed'); await pump(500);
        g.scene.getScene('Breed').select('cat');
        break;
      }
      case 'name': {
        g.scene.start('Breed'); await pump(500);
        const b = g.scene.getScene('Breed'); b.select('dog'); b.next(); await pump(200);
        const el = document.querySelector('.name-input'); if (el) el.value = 'Mochi';
        break;
      }
      case 'game': case 'chat': {
        const p = mk('cat', 'Mochi', null, 1);
        g.scene.start('Game', { pet: p }); await pump(1500);
        if (q === 'chat') {
          for (const m of ['สวัสดี', 'หิวไหม?', '❤️', 'ทำอะไรอยู่']) { PetGame.chat.send(m); await wait(800); }
        }
        break;
      }
      case 'grooming': case 'items': case 'rest': {
        const p = mk('dog', 'Bobo', null, 1, { stats: { fullness: 35, happiness: 70, health: 80, energy: 60 } });
        g.scene.start('Game', { pet: p }); await pump(1200);
        game().openGrooming(); await pump(400);
        if (q === 'items') game().showGroomView('feed');
        if (q === 'rest') game().showGroomView('rest');
        break;
      }
      case 'hint': case 'profile': case 'menu': {
        const p = mk('cat', 'Mochi', 'royal', 3, { careWindow: { feed: 18, play: 16, care: 14, rest: 12, chat: 2, neglect: 0, time: 70, wellSum: 0 } });
        g.scene.start('Game', { pet: p }); await pump(1200);
        game().openPopup({ hint: 'Hint', profile: 'Profile', menu: 'Menu' }[q]);
        break;
      }
      case 'book': case 'bookpage': {
        const p = mk('dog', 'Bobo', 'playful', 4, { completed: ['sleepy', 'gluttony', 'playful', 'royal'] });
        ['royal'].forEach((l) => { for (let s = 2; s <= 5; s++) p.unlocked.push(`dog_${l}_${s}`); });
        p.unlocked.push('dog_playful_5');
        g.scene.start('Game', { pet: p }); await pump(1200);
        game().openPopup('Codex'); await pump(300);
        if (q === 'bookpage') g.scene.getScene('Codex').showRoute('playful', 3);
        break;
      }
      case 'evolution': {
        const p = mk('cat', 'Mochi', 'selfcare', 2);
        g.scene.start('Game', { pet: p }); await pump(1200);
        const result = PetGame.EvolutionAI.analyze({ feed: 4, play: 3, care: 42, rest: 9, chat: 3, neglect: 0, time: 180, wellSum: 180 * 72 }, 1);
        game().showDayResult({ type: 'evolve', from: { key: 'body_cat_baby', name: 'Newborn' }, result });
        await pump(300);
        const ev = g.scene.getScene('Evolution'); ev.tweens.killAll(); ev.stage[2].setVisible(false); ev.stage[3].setAlpha(1);
        ev.showResult(PetGame.Data.LINES.selfcare);
        ev.tweens.killAll(); ev.stage.forEach((o) => { o.x = 250; }); ev.children.list.forEach((o) => { if (o.alpha === 0 && !(o.type === 'Rectangle' && o.width >= 900)) o.setAlpha(1); }); await pump(200);
        break;
      }
      case 'day': {
        g.scene.start('Day', { pet: mk('cat', 'Mochi', null, 1, { day: 2 }) });
        await pump(700);
        return;
      }
      case 'slots': {
        [mk('cat', 'Mochi', 'royal', 4), mk('dog', 'Bobo', 'playful', 2)].forEach((p, i) => { p.gameTime = 1500 + i * 900; p.save(i + 1); });
        g.scene.start('Slots', { mode: 'load' });
        break;
      }
      case 'nextday': {
        const p = mk('cat', 'Mochi', 'sleepy', 2, { dayTime: 9999 });
        g.scene.start('Game', { pet: p });
        break;
      }
    }
    await pump(1500);
  })();
})();
