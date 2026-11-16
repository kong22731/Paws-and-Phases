/*
 * Sound.js — เพลงพื้นหลัง + เสียงเอฟเฟกต์
 *  - เพลงพื้นหลัง: ไฟล์ใน assets/game sound (SOUND_FILES.bgm) เล่นวนตลอดเกม
 *  - เสียงเอฟเฟกต์: สังเคราะห์ด้วย Web Audio (ไม่ต้องมีไฟล์) — แก้/เพิ่มเสียงได้ที่ EFFECTS
 *  ใช้งาน: PetGame.Sound.play('click') ; PetGame.Sound.startMusic(scene)
 * เบราว์เซอร์จะยังไม่เล่นเสียงจนกว่าผู้เล่นจะคลิกครั้งแรก (Phaser ปลดล็อกให้อัตโนมัติ)
 */
window.PetGame = window.PetGame || {};

(function () {
  const ctx = () => PetGame.game && PetGame.game.sound && PetGame.game.sound.context;

  // เสียงโน้ตเดียว: freq -> to (เลื่อนเสียง), dur วินาที, type รูปคลื่น, vol ความดัง, at หน่วงเวลา
  function tone(freq, dur, o) {
    const c = ctx(); if (!c) return;
    o = Object.assign({ type: 'sine', vol: 0.5, at: 0, to: null }, o || {});
    const t0 = c.currentTime + o.at;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const v = o.vol * PetGame.Data.SFX_VOLUME;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // เสียงซ่า (noise) สั้น ๆ เช่น ฟองสบู่ / ลม
  function noise(dur, o) {
    const c = ctx(); if (!c) return;
    o = Object.assign({ vol: 0.25, at: 0, freq: 2000, q: 1 }, o || {});
    const t0 = c.currentTime + o.at;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    f.type = 'bandpass'; f.frequency.value = o.freq; f.Q.value = o.q;
    const v = o.vol * PetGame.Data.SFX_VOLUME;
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  }

  const notes = (list, gap, o) => list.forEach((f, i) => tone(f, (o && o.dur) || 0.16, Object.assign({}, o, { at: i * gap })));

  // ---------- เสียงเอฟเฟกต์ทั้งหมด ----------
  const EFFECTS = {
    click:   () => tone(700, 0.07, { type: 'triangle', to: 950, vol: 0.35 }),
    select:  () => notes([660, 990], 0.06, { type: 'triangle', vol: 0.35, dur: 0.1 }),
    open:    () => notes([523, 784], 0.07, { type: 'sine', vol: 0.4, dur: 0.12 }),
    close:   () => notes([784, 523], 0.07, { type: 'sine', vol: 0.35, dur: 0.12 }),
    error:   () => notes([220, 175], 0.09, { type: 'square', vol: 0.18, dur: 0.12 }),
    eat:     () => [0, 0.16, 0.32].forEach((at) => { tone(260, 0.09, { type: 'square', vol: 0.18, to: 180, at }); noise(0.06, { at: at + 0.02, freq: 900, vol: 0.15 }); }),
    play:    () => { tone(300, 0.22, { type: 'sine', to: 760, vol: 0.45 }); tone(760, 0.18, { type: 'sine', to: 380, vol: 0.3, at: 0.22 }); },
    care:    () => { for (let i = 0; i < 6; i++) tone(900 + Math.random() * 900, 0.07, { type: 'sine', vol: 0.3, at: i * 0.07, to: 1800 + Math.random() * 600 }); noise(0.35, { freq: 3500, vol: 0.08 }); },
    sleep:   () => notes([659, 523, 392], 0.22, { type: 'sine', vol: 0.35, dur: 0.35 }),
    wake:    () => notes([392, 523, 659, 784], 0.1, { type: 'triangle', vol: 0.35, dur: 0.16 }),
    pat:     () => notes([1047, 1319], 0.08, { type: 'sine', vol: 0.3, dur: 0.18 }),
    send:    () => tone(520, 0.08, { type: 'triangle', to: 780, vol: 0.3 }),
    chat:    () => notes([880, 1175], 0.07, { type: 'sine', vol: 0.3, dur: 0.12 }),
    evolve:  () => { notes([523, 659, 784, 1047, 1319], 0.09, { type: 'triangle', vol: 0.35, dur: 0.22 }); for (let i = 0; i < 8; i++) tone(1500 + Math.random() * 1500, 0.1, { vol: 0.15, at: 0.5 + i * 0.06 }); },
    charge:  () => tone(220, 1.6, { type: 'sine', to: 880, vol: 0.25 }),
    regress: () => notes([523, 440, 349, 262], 0.16, { type: 'triangle', vol: 0.3, dur: 0.26 }),
    day:     () => { notes([784, 988, 1175], 0.12, { type: 'sine', vol: 0.35, dur: 0.4 }); },
    dayEnd:  () => notes([1175, 988, 784, 587], 0.14, { type: 'sine', vol: 0.3, dur: 0.3 }),
    toggle:  () => tone(880, 0.06, { type: 'square', vol: 0.15 })
  };

  const Sound = {
    EFFECTS,
    play(name) {
      if (!PetGame.settings.sfx || !EFFECTS[name]) return;
      const c = ctx();
      if (!c || c.state !== 'running') return; // ยังไม่ได้ปลดล็อกเสียง (ยังไม่มีการคลิก)
      try { EFFECTS[name](); } catch (e) { /* ignore */ }
    },

    // เพลงพื้นหลัง: เริ่มครั้งเดียวแล้วเล่นวนข้ามทุกหน้า
    startMusic(scene) {
      if (!PetGame.settings.music || this.music || !scene.cache.audio.exists('bgm')) return;
      const go = () => {
        if (this.music || !PetGame.settings.music) return;
        this.music = scene.sound.add('bgm', { loop: true, volume: PetGame.Data.MUSIC_VOLUME });
        this.music.play();
      };
      if (scene.sound.locked) scene.sound.once('unlocked', go); else go();
    },
    stopMusic() {
      if (this.music) { this.music.stop(); this.music.destroy(); this.music = null; }
    },
    setMusic(on, scene) {
      PetGame.Settings.set('music', on);
      if (on) this.startMusic(scene); else this.stopMusic();
    },
    setSfx(on) { PetGame.Settings.set('sfx', on); }
  };

  // ออกจากเกม (สลับแท็บ / ย่อหน้าต่าง / ไปหน้าต่างอื่น / ปิดหน้า) -> หยุดเพลงชั่วคราว ; กลับมา -> เล่นต่อ
  const pause = () => { const m = Sound.music; if (m && m.isPlaying) m.pause(); };
  const resume = () => {
    const m = Sound.music;
    if (m && m.isPaused && PetGame.settings.music && !document.hidden) m.resume();
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
  window.addEventListener('blur', pause);
  window.addEventListener('focus', resume);
  window.addEventListener('pagehide', pause);

  PetGame.Sound = Sound;
})();
