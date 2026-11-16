/*
 * HandControl.js — ควบคุมเกมด้วยมือผ่านกล้อง (ฟีลเหมือนแตะจอมือถือ)
 *
 *  - ใช้ MediaPipe Hand Landmarker (โหลดจาก CDN ตอนเปิดใช้ครั้งแรก) หาจุดบนมือ 21 จุดจากเว็บแคม
 *  - "ถุงมือเล็ก ๆ" ลอยตาม "กลางฝ่ามือ" (เปลี่ยนท่ามือแล้วถุงมือไม่กระโดด) ทั่วทั้งหน้า (เกม + แชท)
 *  - ท่ามือ (ท่าใหญ่ ไม่ต้องเล็ง):
 *      ✋ แบมือแล้วขยับ        = เลื่อนถุงมือ
 *      ✊ กำมือ -> แบ          = แตะ / กดปุ่ม   (ตอนกำ ถุงมือหยุดนิ่ง 0.15 วิ กันเลื่อนหลุดปุ่ม)
 *      ✊ กำค้างแล้วขยับ        = ลาก
 *      ⏳ ชี้ค้างบนปุ่ม          = กดให้เอง (วงกลมค่อย ๆ เต็ม ; ต้องเลื่อนออกก่อนจึงกดซ้ำได้)
 *      🤚 วางฝ่ามือค้างบนตัวน้อง = ลูบหัว (GameScene จัดการผ่าน event 'frame')
 *      ✌️ ชูสองนิ้วค้าง         = ทักทาย (event 'peace')
 *      👍 ยกนิ้วโป้งค้าง        = ชมน้อง (event 'thumb')
 *  - การกดถูกส่งเป็น mouse/pointer event จริงเข้า element ใต้ถุงมือ ปุ่มเดิมทุกปุ่มจึงใช้ได้เลย
 *  - ตั้งค่า (เมนู): Hand Sensitivity (Normal / Easy) และ Dwell Click (ON / OFF)
 *  - ภาพกล้องประมวลผลในเครื่องเท่านั้น ไม่ส่งไปไหน
 */
window.PetGame = window.PetGame || {};

(function () {
  const VER = '0.10.14';
  const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  // ความไว: margin = ขอบภาพกล้องที่ตัดทิ้ง (มาก = ขยับแขนน้อยลง) ; smooth = ความไวตามมือ (น้อย = นิ่งกว่า)
  const PROFILES = {
    normal: { marginX: 0.22, marginY: 0.2, dwellMs: 1000, smooth: 0.38 },
    easy: { marginX: 0.27, marginY: 0.25, dwellMs: 700, smooth: 0.24 }
  };
  const FREEZE_MS = 150;        // ถุงมือหยุดนิ่งหลังกำมือ
  const HOLD_POSE_MS = 450;     // ✌️ / 👍 ต้องค้างเท่านี้ถึงนับ
  const LOST_MS = 350;          // มือหายเกินนี้ = ซ่อนถุงมือ
  const DWELL_MOVE = 28;        // ขยับเกินนี้ (px) = เริ่มนับชี้ค้างใหม่
  const DWELL_UNLOCK = 40;      // กดด้วยการชี้ค้างแล้ว ต้องเลื่อนออกเท่านี้ก่อนกดซ้ำ
  const DRAG_START = 14;        // กำแล้วขยับเกินนี้ = กำลังลาก

  // ---------- รูปถุงมือ (SVG 64x64) ; จุดอ้างอิง = กลางฝ่ามือ (36, 40) ----------
  const ST = '#1c6f78';
  const OPEN_SVG = `
    <svg viewBox="0 0 64 64" width="64" height="64">
      <g fill="#ffffff" stroke="${ST}" stroke-width="3" stroke-linejoin="round">
        <rect x="16" y="13" width="9" height="24" rx="4.5"/>
        <rect x="27.5" y="7" width="9" height="28" rx="4.5"/>
        <rect x="39" y="11" width="9" height="25" rx="4.5"/>
        <rect x="49" y="19" width="8" height="19" rx="4"/>
        <ellipse cx="12" cy="38" rx="5.5" ry="10" transform="rotate(-38 12 38)"/>
        <rect x="14" y="27" width="44" height="25" rx="12"/>
      </g>
      <path d="M22 30v6M33 30v6M44 30v6" stroke="#cfe9ec" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="19" y="50" width="34" height="10" rx="4" fill="#20a6b5" stroke="${ST}" stroke-width="3"/>
    </svg>`;
  const FIST_SVG = `
    <svg viewBox="0 0 64 64" width="64" height="64">
      <g fill="#ffffff" stroke="${ST}" stroke-width="3" stroke-linejoin="round">
        <circle cx="21" cy="25" r="7"/><circle cx="31" cy="22" r="7.5"/><circle cx="41" cy="22.5" r="7"/><circle cx="50" cy="26" r="6"/>
        <rect x="13" y="25" width="45" height="27" rx="13"/>
        <ellipse cx="27" cy="37" rx="12" ry="5.5"/>
      </g>
      <rect x="19" y="50" width="34" height="10" rx="4" fill="#ffd84d" stroke="${ST}" stroke-width="3"/>
    </svg>`;
  const RING_SVG = `
    <svg viewBox="0 0 80 80" width="80" height="80" class="g-ring">
      <circle cx="40" cy="40" r="34" class="r-bg"/>
      <circle cx="40" cy="40" r="34" class="r-fg" transform="rotate(-90 40 40)"/>
    </svg>`;
  const RING_LEN = 2 * Math.PI * 34;
  const HOT_X = 36, HOT_Y = 40, GLOVE_SCALE = 0.78;

  // โครงมือ (ไว้วาดทับภาพกล้อง)
  const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
  const GESTURES = [['open', '✋', 'move'], ['fist', '✊', 'tap'], ['peace', '✌️', 'hi'], ['thumb', '👍', 'praise']];

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // แยกท่ามือจาก 21 จุด (หมุนมือได้ — ใช้ระยะจากข้อมือ ไม่ใช้แกน y)
  function classify(P) {
    const size = Math.max(0.02, dist(P[0], P[9]));
    // นิ้วชี้-กลาง-นาง-ก้อย: 1 = เหยียด, -1 = งอ, 0 = ไม่แน่ใจ
    const st = [8, 12, 16, 20].map((t) => {
      const r = dist(P[t], P[0]) / Math.max(1e-4, dist(P[t - 2], P[0]));
      return r > 1.15 ? 1 : (r < 1.0 ? -1 : 0);
    });
    const ext = st.filter((v) => v === 1).length, fold = st.filter((v) => v === -1).length;
    const thumbFar = dist(P[4], P[5]) / size;
    const thumbUp = thumbFar > 0.7 && P[4].y < P[3].y && P[3].y < P[2].y && P[4].y < P[5].y - 0.25 * size;
    if (fold === 4) return thumbUp ? 'thumb' : (thumbFar < 0.75 ? 'fist' : 'other');
    if (st[0] === 1 && st[1] === 1 && st[2] === -1 && st[3] === -1) return 'peace';
    if (ext >= 3) return 'open';
    return 'other';
  }

  const Hand = {
    active: false,
    status: 'off',          // off | loading | nohand | tracking | error
    gesture: null,          // ท่าที่นิ่งแล้ว: open | fist | peace | thumb | other
    x: 0, y: 0,             // ตำแหน่งถุงมือบนหน้าจอ (px)
    visible: false,
    pressed: false,
    listeners: {},
    classify,

    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    off(ev, fn) { this.listeners[ev] = (this.listeners[ev] || []).filter((f) => f !== fn); },
    emit(ev, ...a) { (this.listeners[ev] || []).forEach((f) => { try { f(...a); } catch (e) { console.error(e); } }); },
    prof() { return PROFILES[PetGame.settings.handSensitivity === 'easy' ? 'easy' : 'normal']; },

    // ---------- เปิด / ปิด ----------
    async start() {
      if (this.active) return true;
      this.buildDom();
      this.active = true;
      this.setStatus('loading');
      this.panel.hidden = false;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Camera is not supported in this browser');
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
        if (!this.active) { this.stopStream(); return false; }
        this.video.srcObject = this.stream;
        await this.video.play();
        if (!this.landmarker) this.landmarker = await this.loadModel();
        if (!this.active) return false;
        this.setStatus('nohand');
        PetGame.inputMode = 'hand';
        this.lastVideoTime = -1;
        this.loop();
        this.emit('change', true);
        if (!PetGame.settings.handTutorialDone) this.showTutorial();
        return true;
      } catch (e) {
        console.warn('Hand control:', e);
        this.setStatus('error', /denied|NotAllowed/i.test(String(e && (e.name || e.message))) ? 'Camera permission was denied' : (e && e.message) || 'Camera error');
        this.active = false;
        this.stopStream();
        this.emit('change', false);
        return false;
      }
    },

    stop() {
      this.active = false;
      PetGame.inputMode = 'mouse';
      cancelAnimationFrame(this.raf);
      this.stopStream();
      this.releasePress();
      this.reset();
      this.closeTutorial();
      if (this.panel) this.panel.hidden = true;
      this.setStatus('off');
      this.emit('change', false);
    },

    toggle() { return this.active ? (this.stop(), Promise.resolve(false)) : this.start(); },

    stopStream() {
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      if (this.video) this.video.srcObject = null;
    },

    async loadModel() {
      const vision = await import(`${CDN}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      const make = (delegate) => vision.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.5
      });
      try { return await make('GPU'); } catch (e) { return make('CPU'); }
    },

    loop() {
      if (!this.active) return;
      this.raf = requestAnimationFrame(() => this.loop());
      const v = this.video;
      if (!this.landmarker || v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
      this.lastVideoTime = v.currentTime;
      const now = performance.now();
      let res = null;
      try { res = this.landmarker.detectForVideo(v, now); } catch (e) { return; }
      const lm = res && res.landmarks && res.landmarks[0];
      this.drawPreview(lm);
      this.feed(lm || null, now);
    },

    // มือหาย / ปิดกล้อง: ล้างสถานะทั้งหมด
    reset() {
      this.showGlove(false);
      this.gesture = null;
      this.candidate = null;
      this.dwellTarget = null;
      this.dwellLock = null;
      this.setDwell(0);
      this.updateIcons();
    },

    // ---------- แปลงจุดบนมือ -> ถุงมือ + ท่ามือ (แยกออกมาเพื่อทดสอบได้โดยไม่ต้องมีกล้อง) ----------
    feed(lm, now) {
      now = now || performance.now();
      if (!lm) {
        if (this.visible && now - (this.lastSeen || 0) > LOST_MS) {
          this.releasePress();
          this.reset();
          this.setStatus('nohand');
          this.emit('frame', null);
        }
        return;
      }
      this.lastSeen = now;
      if (this.status !== 'tracking') this.setStatus('tracking');
      const P = lm.map((p) => ({ x: 1 - p.x, y: p.y })); // กลับซ้าย-ขวาแบบกระจก
      const prof = this.prof();

      // ท่ามือ: ต้องเห็นท่าเดิมติดกัน 2 เฟรม (✌️ / 👍 ต้องค้าง 0.45 วิ) จึงนับ
      const g = classify(P);
      if (g !== this.candidate) { this.candidate = g; this.candSince = now; this.candFrames = 0; }
      this.candFrames++;
      const needMs = (g === 'peace' || g === 'thumb') ? HOLD_POSE_MS : 0;
      const changing = this.candidate !== this.gesture;
      if (changing && this.candFrames >= 2 && now - this.candSince >= needMs) this.setGesture(g, now);

      // ตำแหน่ง = กลางฝ่ามือ
      const mx = (P[0].x + P[5].x + P[9].x + P[13].x + P[17].x) / 5;
      const my = (P[0].y + P[5].y + P[9].y + P[13].y + P[17].y) / 5;
      const vw = window.innerWidth, vh = window.innerHeight;
      const tx = clamp01((mx - prof.marginX) / (1 - prof.marginX * 2)) * vw;
      const ty = clamp01((my - prof.marginY) / (1 - prof.marginY * 2)) * vh;
      if (!this.visible) { this.x = tx; this.y = ty; this.showGlove(true); }
      if (now >= (this.freezeUntil || 0)) {
        const d = Math.hypot(tx - this.x, ty - this.y);
        if (d > 1.2) {
          let a = Math.min(0.75, prof.smooth + d / 500);
          if (changing) a *= 0.4; // กำลังเปลี่ยนท่า -> ถุงมือขยับช้าลง
          this.x += (tx - this.x) * a;
          this.y += (ty - this.y) * a;
        }
      }
      this.placeGlove();
      this.pointerMove();
      if (this.pressed && !this.dragging && Math.hypot(this.x - this.pressX, this.y - this.pressY) > DRAG_START) {
        this.dragging = true;
        this.glove.classList.add('dragging');
      }
      this.updateDwell(now);
      this.emit('frame', this.gesture);
    },

    setGesture(g, now) {
      this.gesture = g;
      if (g === 'fist') {
        if (!this.pressed) { this.freezeUntil = now + FREEZE_MS; this.press(); }
      } else if (this.pressed) this.releasePress();
      if (g === 'peace') this.emit('peace', this.x, this.y);
      if (g === 'thumb') this.emit('thumb', this.x, this.y);
      this.glove.classList.toggle('fist', g === 'fist');
      this.updateIcons();
      this.emit('gesture', g);
    },

    // ---------- ชี้ค้าง (Dwell Click) ----------
    updateDwell(now) {
      const off = PetGame.settings.dwell === false || this.pressed || this.gesture === 'fist' || this.gesture === 'peace' || this.gesture === 'thumb';
      const t = off ? null : this.clickableAt();
      // กดไปแล้ว: ต้องเลื่อนออกจากจุดเดิม (หรือออกจากปุ่ม) ก่อนจึงนับใหม่
      if (this.dwellLock && (!t || Math.hypot(this.x - this.dwellLock.x, this.y - this.dwellLock.y) > DWELL_UNLOCK)) this.dwellLock = null;
      if (!t || this.dwellLock) { this.dwellTarget = null; this.setDwell(0); return; }
      if (t !== this.dwellTarget || Math.hypot(this.x - this.dwellX, this.y - this.dwellY) > DWELL_MOVE) {
        this.dwellTarget = t; this.dwellStart = now; this.dwellX = this.x; this.dwellY = this.y;
      }
      const p = (now - this.dwellStart) / this.prof().dwellMs;
      this.setDwell(Math.min(1, p));
      if (p >= 1) {
        this.dwellLock = { x: this.x, y: this.y };
        this.dwellTarget = null;
        this.setDwell(0);
        if (!(t instanceof Phaser.GameObjects.GameObject)) PetGame.Sound.play('toggle'); // ปุ่มในเกมมีเสียงของตัวเองอยู่แล้ว
        this.tap();
      }
    },
    setDwell(p) {
      if (!this.ringFg) return;
      this.glove.classList.toggle('dwelling', p > 0.04);
      this.ringFg.style.strokeDashoffset = String(RING_LEN * (1 - p));
    },
    // สิ่งที่กดได้ใต้ถุงมือ (ปุ่ม HTML หรือปุ่มในเกม) ; null = ไม่มี
    clickableAt() {
      const el = document.elementFromPoint(this.x, this.y);
      if (!el) return null;
      if (el.tagName === 'CANVAS') return this.phaserButtonAt();
      return el.closest('button, [data-say], input, textarea, a') || null;
    },
    phaserButtonAt() {
      const g = PetGame.game;
      if (!g) return null;
      const p = g.input.mousePointer;
      const scenes = g.scene.getScenes(true).slice().reverse(); // ซีนบนสุดก่อน
      for (const s of scenes) {
        if (!s.input || !s.input.enabled) continue;
        let hits = s.input.hitTestPointer(p);
        if (!hits.length) continue;
        if (hits.length > 1 && s.input.sortGameObjects) hits = s.input.sortGameObjects(hits, p);
        const top = hits[0];
        // ปุ่ม = ตั้ง useHandCursor ไว้ ; ตัวน้อง/แผงกันกดทะลุ/พื้นมืด ไม่นับ
        return top.input && top.input.cursor && !top.noDwell ? top : null;
      }
      return null;
    },

    // ---------- ส่ง event เหมือนเมาส์/นิ้วจริง ----------
    targetAt() {
      return document.elementFromPoint(this.x, this.y) || document.body;
    },
    fire(type, target) {
      const init = { bubbles: true, cancelable: true, view: window, clientX: this.x, clientY: this.y, screenX: this.x, screenY: this.y,
        button: 0, buttons: this.pressed ? 1 : 0 };
      const pType = { mousemove: 'pointermove', mousedown: 'pointerdown', mouseup: 'pointerup' }[type];
      if (pType && window.PointerEvent) target.dispatchEvent(new PointerEvent(pType, Object.assign({ pointerId: 77, pointerType: 'mouse', isPrimary: true }, init)));
      target.dispatchEvent(new MouseEvent(type, init));
    },
    pointerMove() {
      const t = this.targetAt();
      // ปุ่ม HTML ใต้ถุงมือ -> ไฮไลต์ (เหมือน hover)
      const b = (t.closest && t.closest('button')) || null;
      if (this.hoverBtn !== b) {
        if (this.hoverBtn) this.hoverBtn.classList.remove('hand-hover');
        this.hoverBtn = b;
        if (b) b.classList.add('hand-hover');
      }
      this.fire('mousemove', t);
    },
    press() {
      this.pressed = true;
      this.dragging = false;
      this.pressX = this.x; this.pressY = this.y;
      const t = this.downEl = this.targetAt();
      this.fire('mousedown', t);
      if (t.matches && t.matches('input, textarea')) t.focus();
      this.glove.classList.add('pressed');
      this.ripple();
      this.emit('press', this.x, this.y);
    },
    releasePress() {
      if (!this.pressed) return;
      this.pressed = false;
      this.dragging = false;
      const t = this.targetAt();
      this.fire('mouseup', t);
      // ปุ่ม HTML (แชท) ต้องการ click ; canvas ของ Phaser ใช้แค่ down/up
      const sel = 'button, a, label, [data-say]';
      const btn = t.closest && t.closest(sel);
      const downBtn = this.downEl && this.downEl.closest && this.downEl.closest(sel);
      if (btn && btn === downBtn) btn.click();
      this.downEl = null;
      if (this.glove) this.glove.classList.remove('pressed', 'dragging');
      this.emit('release', this.x, this.y);
    },
    // แตะ 1 ครั้ง (ชี้ค้างครบเวลา)
    tap() {
      this.press();
      setTimeout(() => { if (this.pressed && this.gesture !== 'fist') this.releasePress(); }, 70);
    },

    // ---------- DOM: ถุงมือ + กล่องภาพกล้องใต้หัวแชท ----------
    buildDom() {
      if (this.glove) return;
      const g = this.glove = document.createElement('div');
      g.id = 'hand-glove';
      g.innerHTML = `<div class="g-ringwrap">${RING_SVG}</div><div class="g-open">${OPEN_SVG}</div><div class="g-fist">${FIST_SVG}</div>`;
      g.style.setProperty('--hot-x', `${-HOT_X * GLOVE_SCALE}px`);
      g.style.setProperty('--hot-y', `${-HOT_Y * GLOVE_SCALE}px`);
      g.style.setProperty('--glove-scale', GLOVE_SCALE);
      document.body.appendChild(g);
      this.ringFg = g.querySelector('.r-fg');
      this.ringFg.style.strokeDasharray = String(RING_LEN);
      this.ringFg.style.strokeDashoffset = String(RING_LEN);

      const p = this.panel = document.createElement('div');
      p.id = 'cam-panel';
      p.hidden = true;
      p.innerHTML = `
        <div class="cam-bar">
          <span class="cam-dot"></span><span class="cam-status"></span>
          <button type="button" class="cam-btn cam-help" title="How to play with your hand">?</button>
          <button type="button" class="cam-btn cam-eye" title="Show / hide camera preview">👁</button>
          <button type="button" class="cam-btn cam-off" title="Turn off hand control">✕</button>
        </div>
        <div class="cam-gestures">${GESTURES.map(([k, e, l]) => `<span data-g="${k}"><b>${e}</b>${l}</span>`).join('')}</div>
        <div class="cam-box">
          <video playsinline muted></video>
          <canvas width="320" height="240"></canvas>
        </div>
        <div class="cam-note">🔒 Camera images stay on this device</div>`;
      const chat = document.getElementById('chat-screen');
      const head = chat && chat.querySelector('.cs-head');
      if (head) head.after(p); else document.body.appendChild(p);
      this.video = p.querySelector('video');
      this.canvas = p.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.statusEl = p.querySelector('.cam-status');
      this.iconEls = Array.from(p.querySelectorAll('.cam-gestures span'));
      // จอเล็ก: ซ่อนภาพกล้องเป็นค่าเริ่มต้น
      const small = window.innerHeight < 640 || window.innerWidth < 760;
      const showPrev = PetGame.settings.camPreview === undefined ? !small : PetGame.settings.camPreview;
      p.classList.toggle('collapsed', !showPrev);
      p.querySelector('.cam-eye').addEventListener('click', () => {
        const c = !p.classList.toggle('collapsed');
        PetGame.Settings.set('camPreview', c);
      });
      p.querySelector('.cam-off').addEventListener('click', () => this.stop());
      p.querySelector('.cam-help').addEventListener('click', () => this.showTutorial());
    },

    updateIcons() {
      if (!this.iconEls) return;
      const live = this.gesture === 'other' ? 'open' : this.gesture;
      this.iconEls.forEach((el) => el.classList.toggle('on', el.dataset.g === live));
    },

    setStatus(s, msg) {
      this.status = s;
      if (!this.statusEl) return;
      const text = {
        off: 'Hand control off',
        loading: 'Starting camera…',
        nohand: 'Show your hand to the camera',
        tracking: '✋ Hand detected',
        error: msg || 'Camera error'
      }[s];
      this.statusEl.textContent = text;
      this.panel.dataset.status = s;
    },

    showGlove(on) {
      this.visible = on;
      if (this.glove) this.glove.classList.toggle('show', on);
    },
    placeGlove() {
      this.glove.style.transform = `translate(${this.x}px, ${this.y}px)`;
    },
    ripple() {
      const r = document.createElement('div');
      r.className = 'hand-ripple';
      r.style.left = `${this.x}px`;
      r.style.top = `${this.y}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 450);
    },

    drawPreview(lm) {
      const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
      c.clearRect(0, 0, W, H);
      if (!lm || this.panel.classList.contains('collapsed')) return;
      // ภาพวิดีโอกลับด้านด้วย CSS -> วาดโครงมือกลับด้านด้วย
      const pt = (p) => [(1 - p.x) * W, p.y * H];
      c.lineWidth = 3;
      c.strokeStyle = this.gesture === 'fist' ? '#ffd84d' : '#8ee8f2';
      c.beginPath();
      BONES.forEach(([a, b]) => { const [x1, y1] = pt(lm[a]), [x2, y2] = pt(lm[b]); c.moveTo(x1, y1); c.lineTo(x2, y2); });
      c.stroke();
      c.fillStyle = '#20a6b5';
      lm.forEach((p) => { const [x, y] = pt(p); c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); });
    },

    // ตำแหน่งถุงมือในพิกัดเกม (960x600) ; null = อยู่นอกจอเกม
    gamePoint(game) {
      if (!this.visible || !game) return null;
      const r = game.canvas.getBoundingClientRect();
      if (this.x < r.left || this.x > r.right || this.y < r.top || this.y > r.bottom) return null;
      return { x: (this.x - r.left) / r.width * PetGame.Data.WIDTH, y: (this.y - r.top) / r.height * PetGame.Data.HEIGHT };
    },

    // ---------- หน้าสอนเล่น (ครั้งแรกที่เปิดกล้อง / ปุ่ม ? ในแผงกล้อง) ----------
    showTutorial() {
      this.closeTutorial();
      const host = document.getElementById('app') || document.body;
      const o = this.tut = document.createElement('div');
      o.id = 'hand-tutorial';
      host.appendChild(o);
      this.tutStep = 0;
      this.tutMoved = 0;
      this.tutLast = null;
      this.renderTutorial();
      // ขั้น 1: ขยับมือให้ถุงมือเดินพอสมควร ; ขั้น 3: ✌️ หรือ 👍
      this.tutFrame = () => {
        if (this.tutStep !== 0 || !this.visible) return;
        if (this.tutLast) this.tutMoved += Math.hypot(this.x - this.tutLast.x, this.y - this.tutLast.y);
        this.tutLast = { x: this.x, y: this.y };
        const bar = o.querySelector('.ht-meter i');
        if (bar) bar.style.width = `${Math.min(100, this.tutMoved / 6)}%`;
        if (this.tutMoved > 600) this.nextTutorial();
      };
      this.tutPose = () => { if (this.tutStep === 2) this.nextTutorial(); };
      this.on('frame', this.tutFrame);
      this.on('peace', this.tutPose);
      this.on('thumb', this.tutPose);
    },
    renderTutorial() {
      const o = this.tut;
      if (!o) return;
      const steps = [
        { icon: '✋', title: 'Move', text: 'Open your hand and move it.<br>The little glove follows your palm.', body: '<div class="ht-meter"><i></i></div>' },
        { icon: '✊', title: 'Tap', text: 'Make a fist, then open your hand = tap.<br>Or just hold the glove still on a button for a moment.', body: '<button type="button" class="ht-try">Tap me!</button>' },
        { icon: '✌️ 👍', title: 'Say hi & praise', text: '✌️ Peace sign = say hi · 👍 Thumbs up = praise<br>🤚 Hold your palm on your pet = pat<br>✊ Hold a fist and move = drag', body: '<button type="button" class="ht-done">Let\'s play!</button>' }
      ];
      const s = steps[this.tutStep];
      o.innerHTML = `
        <div class="ht-card">
          <button type="button" class="ht-skip">Skip</button>
          <div class="ht-step">Hand Control · ${this.tutStep + 1} / ${steps.length}</div>
          <div class="ht-icon">${s.icon}</div>
          <div class="ht-title">${s.title}</div>
          <p>${s.text}</p>
          ${s.body}
          <div class="ht-dots">${steps.map((_, i) => `<span class="${i === this.tutStep ? 'on' : ''}"></span>`).join('')}</div>
        </div>`;
      o.querySelector('.ht-skip').addEventListener('click', () => this.finishTutorial());
      const tryBtn = o.querySelector('.ht-try');
      if (tryBtn) tryBtn.addEventListener('click', () => { tryBtn.textContent = 'Nice! 🎉'; PetGame.Sound.play('select'); setTimeout(() => this.nextTutorial(), 500); });
      const done = o.querySelector('.ht-done');
      if (done) done.addEventListener('click', () => this.finishTutorial());
    },
    nextTutorial() {
      if (!this.tut) return;
      this.tutStep++;
      if (this.tutStep > 2) { this.finishTutorial(); return; }
      PetGame.Sound.play('select');
      this.renderTutorial();
    },
    finishTutorial() {
      PetGame.Settings.set('handTutorialDone', true);
      this.closeTutorial();
    },
    closeTutorial() {
      if (this.tutFrame) { this.off('frame', this.tutFrame); this.off('peace', this.tutPose); this.off('thumb', this.tutPose); }
      this.tutFrame = this.tutPose = null;
      if (this.tut) this.tut.remove();
      this.tut = null;
    }
  };

  PetGame.Hand = Hand;
})();
