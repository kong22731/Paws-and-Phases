/*
 * GameScene.js — หน้าเลี้ยงสัตว์หลัก (Figma: UI Lobby / UI Grooming / UI Stage 3 Have Hint)
 * เชื่อมระบบทั้ง 4: EmotionAI, EvolutionAI, CareAdvisor, PetChatbot
 *
 *  ซ้ายบน : avatar (กด = Profile) + ชื่อ + แถบความผูกพัน     กลางบน : ปุ่ม Hint (หลอดไฟ)
 *  ซ้าย   : กล่องค่าสถานะ 4 ช่อง                              ขวา    : Menu / Evolution Book / Restart / Grooming
 *  ซ้ายล่าง: ปุ่ม NEXT DAY                                     Grooming: แผงด้านบน (หมวด -> ไอเทม)
 */
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.pet = data.pet;
    this.fresh = !!data.fresh;
    this.away = data.away || 0;
    this.dayResult = data.dayResult || null; // ผลการตัดสินตอนขึ้นวันใหม่ (evolve / regress / stay / max)
    this.emotion = null;
    this.advice = null;
    this.evolving = false;
    this.pauseReason = null;
    this.lastActionAt = 0;
    this.lastCalloutAt = 0;
    this.timers = { ui: 0, ai: 0, save: 0, fx: 0 };
    this.groomOpen = false;
    this.groomView = 'menu';
    this.scrollRow = 0;
    // Scene ถูกใช้ซ้ำทุกครั้งที่เริ่มใหม่ (เช่น หลัง NEXT DAY) — ล้างการอ้างถึงวัตถุของรอบก่อนที่ถูกทำลายไปแล้ว
    this.avatarImg = null;
    this.groomGlow = null;
    this.groomGlowIn = null;
    this.itemCards = null;
    this.restCards = null;
    this.shownSleeping = undefined;
    this.dayEndNotified = false;
  }

  create() {
    const D = PetGame.Data;
    this.W = D.WIDTH;
    this.groundY = 552;  // ตำแหน่งเท้าของสัตว์ (ตามดีไซน์)
    this.petX = 480;

    this.add.image(0, 0, 'bg_park').setOrigin(0).setDisplaySize(D.WIDTH, D.HEIGHT);
    this.night = this.add.rectangle(this.W / 2, D.HEIGHT / 2, this.W, D.HEIGHT, 0x0b1030, 0).setDepth(5);

    this.buildPet();
    this.buildLobbyUI();
    this.buildStatBoxes();
    this.buildGrooming();

    this.toast = PetGame.UI.text(this, this.W / 2, 578, '', 17, '#ffffff', {
      backgroundColor: 'rgba(32,90,100,0.78)', padding: { x: 14, y: 6 }, align: 'center'
    }).setOrigin(0.5).setDepth(90).setAlpha(0);

    // เพลงพื้นหลัง (ถ้าเล่นอยู่แล้วจากหน้าปก จะไม่เริ่มใหม่)
    PetGame.Sound.startMusic(this);

    // ---------- แชท ----------
    PetGame.chat.attach(this);
    if (this.fresh) {
      this.time.delayedCall(700, () => this.petSpeak(`สวัสดี! เราชื่อ ${this.pet.name} ฝากตัวด้วยนะ!`, true));
    } else if (this.away > 60) {
      PetGame.chat.system(`You were away for ${Math.round(this.away / 60)} min. ${this.pet.name}'s status changed meanwhile.`);
    }
    PetGame.chat.system(`Day ${this.pet.day}`);

    this.updateAI(true);
    this.refreshUI();
    if (this.dayResult) this.time.delayedCall(250, () => this.showDayResult(this.dayResult));

    // บันทึกเมื่อปิด/สลับแท็บ (เฉพาะตัวที่เคยกด Save แล้ว) ; ตัวที่ยังไม่บันทึก -> เบราว์เซอร์ถามก่อนปิดหน้า
    this.onHide = (e) => {
      if (this.pet.saved) this.pet.autosave();
      else if (e && e.type === 'beforeunload') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', this.onHide);
    document.addEventListener('visibilitychange', this.onHide);
    this.events.on('resume', this.onResume, this);
    this.events.once('shutdown', () => {
      window.removeEventListener('beforeunload', this.onHide);
      document.removeEventListener('visibilitychange', this.onHide);
      this.events.off('resume', this.onResume, this);
      PetGame.chat.close();
    });
  }

  // =====================================================================
  //  ตัวสัตว์
  // =====================================================================
  buildPet() {
    this.shadow = this.add.ellipse(this.petX, this.groundY - 4, 200, 26, 0x000000, 0.14).setDepth(9);
    // ชั้นของตัวสัตว์ (แยกแต่ละแอนิเมชันไม่ให้ชนกัน):
    //   petC    = ตำแหน่ง (เดินไปมา) + ท่าตอนใช้ไอเทม
    //   petStep = ก้าวเดิน (เด้ง/เอียงตอนเดิน)
    //   petBody = ท่าประจำร่าง/อารมณ์ (หายใจ ลอย ส่าย ฯลฯ)
    this.petC = this.add.container(this.petX, this.groundY).setDepth(10);
    this.petStep = this.add.container(0, 0);
    this.petBody = this.add.container(0, 0);
    this.petImg = this.add.image(0, 0, this.pet.bodyKey()).setOrigin(0.5, 1);
    this.petBody.add(this.petImg);
    this.petStep.add(this.petBody);
    this.petC.add(this.petStep);
    this.walk = { active: false, nextAt: 2500 };
    this.petImg.setInteractive({ useHandCursor: true });
    this.petImg.on('pointerdown', () => this.pat());

    // ฟองอารมณ์
    this.emoBubble = this.add.container(0, 0).setDepth(20);
    const eb = this.add.graphics();
    eb.fillStyle(0xffffff, 1).fillCircle(0, 0, 26).fillCircle(-23, 26, 6).fillCircle(-32, 37, 3);
    eb.lineStyle(3, PetGame.Data.COLORS.teal, 1).strokeCircle(0, 0, 26);
    this.emoText = PetGame.UI.text(this, 0, 0, '🙂', 26).setOrigin(0.5);
    this.emoBubble.add([eb, this.emoText]);

    // ฟองคำพูด
    this.speech = this.add.container(this.petX, 0).setDepth(30).setAlpha(0);
    this.speechBg = this.add.graphics();
    this.speechText = PetGame.UI.text(this, 0, 0, '', 18, '#1f1f1f', { align: 'center', wordWrap: { width: 340, useAdvancedWrap: true } }).setOrigin(0.5);
    this.speech.add([this.speechBg, this.speechText]);

    this.refreshPetLook();
  }

  // ภาพที่ใช้แสดงตอนนี้ (หมาร่างแรกตอนหลับใช้ภาพนอนจากดีไซน์)
  petTexture() {
    if (this.pet.sleeping && this.pet.formKey() === 'dog_baby' && this.textures.exists('ui_dog_sleeping')) return 'ui_dog_sleeping';
    return this.pet.bodyKey();
  }

  refreshPetLook() {
    const heights = [270, 280, 290, 300, 310]; // ความสูงตามร่าง 1-5
    const tex = this.petTexture();
    this.petImg.setTexture(tex);
    this.shownSleeping = this.pet.sleeping;
    const h = tex === 'ui_dog_sleeping' ? 170 : heights[this.pet.stage - 1];
    const s = Math.min(h / this.petImg.height, 340 / this.petImg.width);
    this.petImg.setScale(s);
    this.petTop = this.groundY - this.petImg.displayHeight;
    this.shadow.width = Math.min(260, this.petImg.displayWidth * 0.7);
    this.emoBubble.setPosition(this.petX + this.petImg.displayWidth / 2 - 6, this.petTop + 20);
    this.speech.y = Math.max(215, this.petTop - 34);
    if (this.avatarImg) this.avatarImg.setTexture(this.pet.portraitKey()).setDisplaySize(84, 84);
  }

  // =====================================================================
  //  UI หน้าเลี้ยง (Figma: UI Lobby)
  // =====================================================================
  buildLobbyUI() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const L = this.lobbyUI = this.add.container(0, 0).setDepth(40);

    // avatar วงกลม (กด = Profile)
    const av = this.add.graphics().fillStyle(0xffffff, 1).fillCircle(83, 72, 47.5).lineStyle(5, C.teal, 1).strokeCircle(83, 72, 45);
    this.avatarImg = this.add.image(83, 72, this.pet.portraitKey()).setDisplaySize(84, 84);
    this.avatarEmo = UI.text(this, 124, 110, '🙂', 22).setOrigin(0.5);
    const avZone = this.add.zone(83, 72, 100, 100).setInteractive({ useHandCursor: true });
    avZone.on('pointerdown', () => this.openPopup('Profile'));
    L.add([av, this.avatarImg, this.avatarEmo, avZone]);

    // กล่องชื่อ + แถบความผูกพัน
    L.add(UI.box(this, 149, 22, 245, 100, { fill: 0xffffff, stroke: C.teal, strokeW: 5, radius: 20 }));
    L.add(UI.box(this, 167, 38, 208, 30, { fill: C.tealLight, radius: 15 }));
    this.nameText = UI.text(this, 176, 40, '', 20, '#ffffff');
    L.add(this.nameText);
    L.add(this.add.image(182, 88, 'ui_bond').setDisplaySize(30, 30));
    this.bondMeter = UI.pillMeter(this, 202, 73, 173, 30, { border: C.bondBorder, fill: C.bondFill, pad: 3 });
    L.add([this.bondMeter.frame, this.bondMeter.graphics]);

    // ปุ่ม Hint (หลอดไฟ)
    this.hintBtn = UI.iconButton(this, 460, 72, 100, 'hint', () => this.openPopup('Hint'), { fill: C.tealLight, stroke: C.teal, iconSize: 70 });
    this.tweens.add({ targets: this.hintBtn.list[1], alpha: { from: 1, to: 0.55 }, duration: 800, yoyo: true, repeat: -1 });
    L.add(this.hintBtn);

    // ปุ่มด้านขวา (ขนาด SIDE_BTN; ไอคอน ~70% ของปุ่ม)
    const bs = this.sideBtnSize = 54, gap = 62, bx = this.sideBtnX = 960 - 26 - bs / 2, by = 22 + bs / 2;
    this.sideBtnY = (i) => by + i * gap;
    const ic = { iconSize: bs * 0.7, strokeW: 4, radius: 16 };
    L.add(UI.iconButton(this, bx, this.sideBtnY(0), bs, 'menu', () => this.openPopup('Menu'), ic));
    L.add(UI.iconButton(this, bx, this.sideBtnY(1), bs, 'book', () => this.openPopup('Codex'), Object.assign({ iconAlpha: 0.8 }, ic)));
    // Rebirth: กดได้เมื่อถึงร่างสูงสุดของสายแล้วเท่านั้น
    this.rebirthBtn = UI.iconButton(this, bx, this.sideBtnY(2), bs, 'restart', () => this.confirmRebirth(), ic);
    L.add(this.rebirthBtn);
    this.groomBtn = UI.iconButton(this, bx, this.sideBtnY(3), bs, 'grooming', () => this.openGrooming(), Object.assign({}, ic, { iconSize: bs * 0.58 }));
    this.groomBtn.silent = true; // ใช้เสียง open แทน
    L.add(this.groomBtn);
    this.groomGlow = this.add.graphics();
    this.tweens.add({ targets: this.groomGlow, alpha: { from: 1, to: 0.2 }, duration: 650, yoyo: true, repeat: -1 });
    L.add(this.groomGlow);
    // ปุ่มที่ 5: เปิด/ปิดควบคุมด้วยมือผ่านกล้อง
    this.camBtn = UI.iconButton(this, bx, this.sideBtnY(4), bs, (c) => {
      c.camBg = UI.box(this, -bs / 2, -bs / 2, bs, bs, { fill: C.tealLight, stroke: C.teal, strokeW: 4, radius: 16 }).setVisible(false);
      c.add(c.camBg);
      if (this.textures.exists('cover_icon_hand')) c.add(this.add.image(0, 0, 'cover_icon_hand').setDisplaySize(bs * 0.72, bs * 0.48));
      else c.add(UI.text(this, 0, 0, '✋', 26).setOrigin(0.5));
    }, () => this.toggleHand(), ic);
    L.add(this.camBtn);
    this.setupHand();

    // ปุ่ม NEXT DAY (ขึ้นเมื่อหมดวัน) — ระหว่างวันแสดงนาฬิกาเวลาที่เหลือแทน
    const nd = this.nextDayBtn = this.add.container(137.5, 542);
    nd.add(UI.box(this, -89.5, -29, 179, 58, { fill: C.tealLight, stroke: C.teal, strokeW: 5, radius: 20 }));
    nd.add(UI.text(this, -72.5, 0, 'NEXT DAY', 24, '#ffffff').setOrigin(0, 0.5));
    nd.add(this.add.image(60, 0, 'ui_next').setDisplaySize(35, 43));
    UI.clickable(this, nd, 179, 58, () => this.nextDay());
    this.tweens.add({ targets: nd, scale: 1.06, duration: 600, yoyo: true, repeat: -1 });
    const clock = this.dayClock = this.add.container(137.5, 542);
    clock.add(UI.box(this, -89.5, -24, 179, 48, { fill: 0xffffff, alpha: 0.9, stroke: C.teal, strokeW: 4, radius: 20 }));
    this.dayClockText = UI.text(this, 0, -8, '', 18, C.tealCss).setOrigin(0.5);
    this.dayBar = this.add.graphics();
    clock.add([this.dayClockText, this.dayBar]);
    L.add([nd, clock]);
  }

  // นาฬิกาวัน: "Day 2 · 3:41" + แถบเวลาที่ผ่านไป
  refreshDayClock() {
    const p = this.pet, over = p.isDayOver();
    this.nextDayBtn.setVisible(over);
    this.dayClock.setVisible(!over);
    if (over) return;
    const left = Math.ceil(p.dayLeft()), m = Math.floor(left / 60), s = left % 60;
    this.dayClockText.setText(`Day ${p.day}  ·  ${m}:${String(s).padStart(2, '0')}`);
    this.dayBar.clear().fillStyle(0xd9fbff, 1).fillRoundedRect(-72, 9, 144, 8, 4)
      .fillStyle(PetGame.Data.COLORS.teal, 1).fillRoundedRect(-72, 9, Math.max(8, 144 * p.dayProgress() / 100), 8, 4);
  }

  // กล่องค่าสถานะ 4 ช่อง (เติมสีจากล่างขึ้นบน: เขียว > 60, เหลือง > 30, แดง)
  buildStatBoxes() {
    const D = PetGame.Data, C = D.COLORS;
    this.statsC = this.add.container(0, 0).setDepth(80);
    this.statBoxes = {};
    const S = 54, B = 4, GAP = 62; // ขนาดกล่อง, ความหนาขอบ, ระยะห่างแนวตั้ง
    D.STAT_ORDER.forEach((k, i) => {
      const x = 42, y = 150 + i * GAP;
      const frame = this.add.graphics().fillStyle(0xffffff, 1).fillRect(x, y, S, S).lineStyle(B, C.oliveDark, 1).strokeRect(x + B / 2, y + B / 2, S - B, S - B);
      const fill = this.add.graphics();
      const icon = this.add.image(x + S / 2, y + S / 2, 'ui_' + D.STAT_INFO[k].img).setDisplaySize(S * 0.72, S * 0.72);
      const zone = this.add.zone(x + S / 2, y + S / 2, S, S).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.showToast(`${D.STAT_INFO[k].label}: ${Math.round(this.pet.stats[k])} / 100`));
      this.statsC.add([frame, fill, icon, zone]);
      this.statBoxes[k] = { fill, x: x + B, y: y + B, s: S - B * 2, last: -1 };
    });
  }

  // =====================================================================
  //  เมนู Grooming (Figma: UI Grooming / Feed / Play / Care / Rest)
  // =====================================================================
  buildGrooming() {
    const UI = PetGame.UI, D = PetGame.Data, C = D.COLORS;
    const G = this.groomC = this.add.container(0, 0).setDepth(70).setVisible(false);
    // แผงด้านบน (กันกดทะลุ)
    const panel = UI.box(this, 0, -25, 960, 215, { fill: 0xffffff, stroke: C.oliveDark, strokeW: 10, radius: 20 });
    G.add(panel);
    G.add(this.add.zone(480, 82.5, 960, 215).setInteractive());
    this.groomBack = UI.imageButton(this, 35, 115, 'back', 40, 40, () => this.showGroomView('menu'));
    G.add(this.groomBack);
    G.add(UI.imageButton(this, 35, 155, 'close', 40, 40, () => this.closeGrooming()));

    // ---- หน้าเลือกหมวด ----
    const M = this.groomMenu = this.add.container(0, 0);
    M.add(UI.box(this, 201, -20, 563, 80, { fill: C.oliveMid, stroke: C.olive, strokeW: 5, radius: 10 }));
    M.add(UI.text(this, 482.5, 28, 'Grooming', 34, '#e3c7a7', { stroke: '#5b3a22', strokeThickness: 6 }).setOrigin(0.5));
    this.catCards = {};
    [95, 311, 531, 751].forEach((x, i) => {
      const cat = D.CATEGORIES[i];
      const c = this.add.container(x + 80.5, 122);
      c.add(UI.box(this, -80.5, -46, 161, 92, { fill: cat.fill, alpha: cat.fillAlpha, stroke: cat.border, strokeW: 5, radius: 10 }));
      const img = this.add.image(0, -12, 'ui_' + cat.img);
      img.setScale(Math.min(112 / img.width, 62 / img.height));
      c.add(img);
      c.add(UI.text(this, 0, 28, cat.label, 24, cat.text, { stroke: '#ffffff', strokeThickness: 3 }).setOrigin(0.5));
      UI.clickable(this, c, 161, 92, () => this.showGroomView(cat.key));
      this.catCards[cat.key] = c;
      M.add(c);
    });
    G.add(M);

    // ---- หน้าไอเทม (feed / play / care): แถวละ 4 ใบ เลื่อนลงได้ ----
    this.itemsC = this.add.container(0, 0);
    this.itemRows = this.add.container(0, 0);
    this.itemsC.add(this.itemRows);
    const maskG = this.make.graphics({ add: false }).fillRect(60, 0, 862, 170);
    this.itemRows.setMask(maskG.createGeometryMask());
    this.scrollTrack = UI.box(this, 931, 10, 10, 161, { fill: 0xe6e6e6, stroke: 0x000000, strokeW: 1, radius: 5 });
    this.scrollThumb = this.add.graphics();
    this.itemsC.add([this.scrollTrack, this.scrollThumb]);
    G.add(this.itemsC);

    // ---- หน้าพักผ่อน (rest) ----
    const R = this.restC = this.add.container(0, 0);
    this.restCards = {};
    const rest = D.CATEGORIES.find((c) => c.key === 'rest');
    [[144, 320, 'nap'], [545, 318, 'sleep']].forEach(([x, w, key]) => {
      const it = D.ITEMS.rest.find((i) => i.key === key);
      const c = this.add.container(x + w / 2, 91.5);
      c.add(UI.box(this, -w / 2, -68.5, w, 137, { fill: rest.fill, stroke: rest.border, strokeW: 5, radius: 10 }));
      const img = this.add.image(-w / 2 + 82, 0, 'item_' + key);
      img.setScale(Math.min(118 / img.width, 118 / img.height));
      c.add(img);
      const title = UI.text(this, 58, -12, it.label, 32, key === 'nap' ? '#e7b405' : '#ffc800', { stroke: '#7a4a00', strokeThickness: 5 }).setOrigin(0.5);
      const sub = UI.text(this, 58, 22, it.sub, 16, '#ffffff').setOrigin(0.5);
      c.add([title, sub]);
      c.silent = true; // เสียงมาจาก useItem
      UI.clickable(this, c, w, 137, () => this.useItem(key, c));
      Object.assign(c, { title, sub, img, itemKey: key });
      this.restCards[key] = c;
      R.add(c);
    });
    G.add(R);

    this.groomGlowIn = this.add.graphics();
    this.tweens.add({ targets: this.groomGlowIn, alpha: { from: 1, to: 0.25 }, duration: 650, yoyo: true, repeat: -1 });
    G.add(this.groomGlowIn);

    // เลื่อนรายการไอเทม: ล้อเมาส์ / ลาก / กดแถบเลื่อน
    this.input.on('wheel', (p, objs, dx, dy) => {
      if (this.groomOpen && this.itemsC.visible && p.y < 190) this.scrollItems(dy > 0 ? 1 : -1);
    });
    this.input.on('pointerdown', (p) => { this.dragStartY = p.y; });
    this.input.on('pointerup', (p) => {
      if (!this.groomOpen || !this.itemsC.visible || this.dragStartY === undefined || p.y > 190) return;
      const d = p.y - this.dragStartY;
      if (Math.abs(d) > 30) this.scrollItems(d < 0 ? 1 : -1);
    });
    this.scrollTrack.setInteractive(new Phaser.Geom.Rectangle(926, 5, 20, 171), Phaser.Geom.Rectangle.Contains);
    this.scrollTrack.on('pointerdown', (p) => this.scrollItems(p.y > this.thumbMid ? 1 : -1));
  }

  openGrooming() {
    if (this.evolving || this.groomOpen) return;
    if (this.pet.isDayOver()) { this.showToast('The day is over! Press NEXT DAY to continue.'); PetGame.Sound.play('error'); return; }
    PetGame.Sound.play('open');
    this.groomOpen = true;
    this.groomC.setVisible(true).setAlpha(0).setY(-40);
    this.tweens.add({ targets: this.groomC, alpha: 1, y: 0, duration: 220, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.lobbyUI, alpha: 0, duration: 160, onComplete: () => this.lobbyUI.setVisible(false) });
    this.tweens.add({ targets: this.statsC, x: -8, y: 66, duration: 220 }); // เลื่อนลงใต้แผง Grooming
    this.showGroomView('menu');
  }

  closeGrooming() {
    if (!this.groomOpen) return;
    this.groomOpen = false;
    PetGame.Sound.play('close');
    this.tweens.add({ targets: this.groomC, alpha: 0, y: -40, duration: 180, onComplete: () => this.groomC.setVisible(false) });
    this.lobbyUI.setVisible(true);
    this.tweens.add({ targets: this.lobbyUI, alpha: 1, duration: 200 });
    this.tweens.add({ targets: this.statsC, x: 0, y: 0, duration: 220 });
  }

  showGroomView(view) {
    this.groomView = view;
    this.groomMenu.setVisible(view === 'menu');
    this.restC.setVisible(view === 'rest');
    this.itemsC.setVisible(view !== 'menu' && view !== 'rest');
    this.groomBack.setVisible(view !== 'menu');
    if (this.itemsC.visible) this.buildItemCards(view);
    this.refreshRestCards();
    this.drawRecommendation();
  }

  buildItemCards(catKey) {
    const UI = PetGame.UI, D = PetGame.Data;
    const cat = D.CATEGORIES.find((c) => c.key === catKey);
    this.itemRows.removeAll(true);
    this.itemCards = [];
    const xs = [76, 294, 512, 730];
    D.ITEMS[catKey].forEach((it, i) => {
      const x = xs[i % 4] + 88.5, y = 89 + Math.floor(i / 4) * 150;
      const c = this.add.container(x, y);
      c.add(UI.box(this, -88.5, -66, 177, 132, { fill: cat.fill, alpha: cat.fillAlpha, stroke: cat.border, strokeW: 5, radius: 10 }));
      const img = this.add.image(0, -4, 'item_' + it.key);
      img.setScale(Math.min(150 / img.width, 108 / img.height));
      c.add(img);
      c.silent = true; // เสียงมาจาก useItem
      UI.clickable(this, c, 177, 132, () => this.useItem(it.key, c));
      Object.assign(c, { itemKey: it.key, img });
      this.itemCards.push(c);
      this.itemRows.add(c);
    });
    this.rows = Math.ceil(D.ITEMS[catKey].length / 4);
    this.scrollRow = 0;
    this.itemRows.y = 0;
    this.drawScrollbar();
  }

  scrollItems(dir) {
    const next = Phaser.Math.Clamp(this.scrollRow + dir, 0, this.rows - 1);
    if (next === this.scrollRow) return;
    this.scrollRow = next;
    this.tweens.add({ targets: this.itemRows, y: -150 * next, duration: 220, ease: 'Quad.easeOut', onUpdate: () => this.drawRecommendation() });
    this.drawScrollbar();
  }

  drawScrollbar() {
    const show = this.rows > 1;
    this.scrollTrack.setVisible(show);
    this.scrollThumb.clear();
    if (!show) return;
    const h = 161 / this.rows, y = 10 + h * this.scrollRow;
    this.thumbMid = y + h / 2;
    this.scrollThumb.fillStyle(0x7a7d47, 1).fillRoundedRect(932, y + 2, 8, h - 4, 4);
  }

  refreshRestCards() {
    if (!this.restCards) return;
    const asleep = this.pet.sleeping;
    Object.values(this.restCards).forEach((c) => {
      const it = PetGame.Data.ITEMS.rest.find((i) => i.key === c.itemKey);
      const active = asleep && ((c.itemKey === 'nap' && this.pet.sleepMode === 'nap') || (c.itemKey === 'sleep' && this.pet.sleepMode !== 'nap'));
      c.title.setText(active ? 'Wake up' : it.label);
      c.sub.setText(active ? (c.itemKey === 'nap' ? `(${Math.max(0, Math.ceil(this.pet.napUntil - this.pet.gameTime))} sec left)` : '(Sleeping...)') : it.sub);
    });
  }

  // =====================================================================
  //  ลูปหลัก
  // =====================================================================
  update(time, delta) {
    if (this.evolving) return;
    const dt = Math.min(delta, 250) / 1000;
    this.pet.tick(dt * PetGame.speed);
    const T = this.timers;
    T.ui += dt; T.ai += dt; T.save += dt; T.fx += dt;
    if (T.ui > 0.2) { T.ui = 0; this.refreshUI(); }
    if (T.ai > 0.5) { T.ai = 0; this.updateAI(false); }
    if (T.save > 5) { T.save = 0; this.pet.autosave(); }
    if (T.fx > 1.4) { T.fx = 0; this.ambientFx(); }
    this.updateWalk(delta);
    // หมดวัน: ปิดเมนู Grooming และแจ้งให้กด NEXT DAY (ครั้งเดียว)
    if (this.pet.isDayOver() && !this.dayEndNotified) {
      this.dayEndNotified = true;
      if (this.groomOpen) this.closeGrooming();
      PetGame.Sound.play('dayEnd');
      this.showToast('The day is over! Press NEXT DAY.');
      PetGame.chat.system(`Day ${this.pet.day} is over — press NEXT DAY`);
      this.refreshUI();
    }
  }

  // =====================================================================
  //  เดินไปมาในสวน + ท่าประจำร่าง (อิงจาก Animation Sheet ของแต่ละสาย)
  // =====================================================================
  // ท่าประจำสาย: speed = ความเร็วเดิน (px/วิ), step = จังหวะก้าว (ms), bob = เด้งตอนก้าว (px),
  //   glide = ลอยไปไม่ก้าว, idle = ท่าตอนยืนเฉย ๆ, fx = อีโมจิที่ลอยขึ้นเป็นครั้งคราว
  petStyle() {
    const p = this.pet, high = p.stage >= 4;
    const S = {
      baby:     { speed: 70,  step: 170, bob: 7,  idle: 'breathe', fx: null },
      sleepy:   { speed: 38,  step: 600, bob: 0,  glide: true, idle: 'float', fx: high ? '✨' : '💤' },
      gluttony: { speed: 40,  step: 280, bob: 4,  idle: 'wobble', fx: '🍖' },
      neglect:  high ? { speed: 60, step: 500, bob: 0, glide: true, idle: 'hover', fx: '👾' }
                     : { speed: 30, step: 320, bob: 3, idle: 'shake', fx: '💧' },
      selfcare: { speed: 55,  step: 210, bob: 5,  idle: 'sway', fx: '🫧' },
      playful:  { speed: 115, step: 130, bob: 11, idle: 'flex', fx: '💪' },
      royal:    { speed: 45,  step: 320, bob: 3,  idle: 'grace', fx: '✨' },
      leader:   { speed: 50,  step: 280, bob: 4,  idle: 'nod', fx: high ? '🎩' : '📋' }
    };
    return S[p.line] || S.baby;
  }

  // เดินไปจุดใหม่เป็นระยะ ๆ (ไม่เดินตอนหลับ ป่วย เหนื่อย หรือหมดวัน)
  updateWalk(delta) {
    const w = this.walk, p = this.pet;
    // ของที่ตามตัวสัตว์: เงา ฟองอารมณ์ ฟองคำพูด
    this.petX = this.petC.x;
    this.shadow.x = this.petX;
    this.emoBubble.x = this.petX + this.petImg.displayWidth / 2 - 6;
    this.speech.x = Phaser.Math.Clamp(this.petX, 200, 760);
    if (w.active) return;
    w.nextAt -= delta;
    if (w.nextAt > 0) return;
    w.nextAt = Phaser.Math.Between(3500, 7500);
    const e = this.emotion && this.emotion.key;
    if (p.sleeping || p.isDayOver() || ['sick', 'tired', 'sleeping'].includes(e)) return;
    let target = Phaser.Math.Between(330, 690);
    if (Math.abs(target - this.petC.x) < 80) target = this.petC.x < 510 ? target + 140 : target - 140;
    this.walkTo(target);
  }

  walkTo(target) {
    const st = this.petStyle(), w = this.walk;
    const dist = Math.abs(target - this.petC.x);
    w.active = true;
    // ภาพส่วนใหญ่หันซ้าย -> เดินไปขวาให้กลับด้าน
    this.petImg.setFlipX(target > this.petC.x);
    const steps = [];
    if (st.glide) {
      steps.push(this.tweens.add({ targets: this.petStep, angle: { from: -3, to: 3 }, duration: st.step, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    } else {
      steps.push(this.tweens.add({ targets: this.petStep, y: -st.bob, duration: st.step / 2, yoyo: true, repeat: -1, ease: 'Quad.easeOut' }));
      steps.push(this.tweens.add({ targets: this.petStep, angle: { from: -2.5, to: 2.5 }, duration: st.step, yoyo: true, repeat: -1 }));
    }
    this.tweens.add({
      targets: this.petC, x: target, duration: (dist / st.speed) * 1000, ease: 'Sine.easeInOut',
      onComplete: () => {
        steps.forEach((t) => t.stop());
        this.tweens.add({ targets: this.petStep, y: 0, angle: 0, duration: 150 });
        w.active = false;
      }
    });
  }

  refreshUI() {
    const p = this.pet, C = PetGame.Data.COLORS;
    this.nameText.setText(p.name);
    this.bondMeter.set(p.bond);

    Object.entries(this.statBoxes).forEach(([k, b]) => {
      const v = Math.round(p.stats[k]);
      if (v === b.last) return;
      b.last = v;
      const color = v > 60 ? C.statHigh : v > 30 ? C.statMid : C.statLow;
      const h = b.s * v / 100;
      b.fill.clear().fillStyle(color, 1).fillRect(b.x, b.y + b.s - h, b.s, h);
    });

    this.night.setAlpha(p.sleeping ? 0.3 : 0);
    if (p.sleeping !== this.shownSleeping) this.refreshPetLook();
    // Hint: ขึ้นเมื่อบรรลุร่างที่ 3 ของสายนั้น (และยังไม่ถึงร่างสูงสุด)
    this.hintBtn.setVisible(p.stage >= PetGame.Data.HINT_FROM_STAGE && !p.isMax());
    this.rebirthBtn.setAlpha(p.isMax() ? 1 : 0.4);
    this.groomBtn.setAlpha(p.isDayOver() ? 0.4 : 1);
    this.refreshDayClock();
    this.refreshRestCards();
  }

  // วิเคราะห์อารมณ์ + คำแนะนำ (เรียกทุก 0.5 วินาที)
  updateAI(force) {
    const p = this.pet;
    const emo = PetGame.EmotionAI.evaluate(p);
    const changed = !this.emotion || this.emotion.key !== emo.key;
    this.emotion = emo;
    this.advice = PetGame.CareAdvisor.recommend(p, emo);
    this.drawRecommendation();

    if (changed || force) {
      this.applyEmotionAnimation(emo);
      this.emoText.setText(emo.emoji);      this.avatarEmo.setText(emo.emoji);
      PetGame.chat.setMood(emo, p);
      if (changed && !force && emo.need && emo.intensity > 0.2) this.callout(true);
    }
    if (emo.need && emo.intensity > 0.35 && this.time.now - this.lastCalloutAt > 20000) this.callout(false);
  }

  // ไฮไลต์สิ่งที่ AI แนะนำ: ปุ่ม Grooming -> การ์ดหมวด -> การ์ดไอเทม
  drawRecommendation() {
    if (!this.groomGlow) return;
    this.groomGlow.clear();
    this.groomGlowIn.clear();
    const a = this.advice && this.advice.action;
    if (!a) return;
    if (!this.groomOpen) {
      const h = this.sideBtnSize / 2 + 4;
      this.groomGlow.lineStyle(4, 0xffd84d, 1).strokeRoundedRect(this.sideBtnX - h, this.sideBtnY(3) - h, h * 2, h * 2, 18);
      return;
    }
    const item = this.advice.item;
    if (this.groomView === 'menu') {
      const c = this.catCards[a];
      if (c) this.groomGlowIn.lineStyle(5, 0xffd84d, 1).strokeRoundedRect(c.x - 86, c.y - 52, 172, 104, 12);
    } else if (this.groomView === 'rest') {
      const c = this.restCards[item];
      if (c && a === 'rest') this.groomGlowIn.lineStyle(5, 0xffd84d, 1).strokeRoundedRect(c.x - 166, c.y - 74, 332, 148, 12);
    } else if (this.itemCards) {
      const c = this.itemCards.find((k) => k.itemKey === item);
      const y = c ? c.y + this.itemRows.y : -999;
      if (c && y > 0 && y < 190) this.groomGlowIn.lineStyle(5, 0xffd84d, 1).strokeRoundedRect(c.x - 94, y - 72, 188, 144, 12);
    }
  }

  callout(force) {
    if (!force && this.time.now - this.lastCalloutAt < 8000) return;
    let line = PetGame.EmotionAI.callout(this.emotion, this.pet);
    if (!line) return;
    line = PetGame.PetChatbot.voice(line, this.pet); // พูดตามบุคลิกของร่างปัจจุบัน
    this.lastCalloutAt = this.time.now;
    this.petSpeak(line, true);
  }

  // =====================================================================
  //  แอนิเมชันตามอารมณ์ (1.1) — หมุน/ย่อขยายรอบ "เท้า" ของสัตว์
  // =====================================================================
  applyEmotionAnimation(emo) {
    const b = this.petBody;
    this.tweens.killTweensOf(b);
    b.setPosition(0, 0).setScale(1).setAngle(0);
    this.petImg.clearTint();
    const loop = (cfg) => this.tweens.add(Object.assign({ targets: b, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }, cfg));

    // อารมณ์ปกติ/ดีใจ -> ใช้ท่าประจำร่าง ; อารมณ์อื่น (ป่วย เหนื่อย เหงา ฯลฯ) -> ท่าตามอารมณ์
    let anim = emo.anim;
    if (anim === 'breathe' || (anim === 'hop' && this.pet.line)) anim = 'style:' + this.petStyle().idle;

    switch (anim) {
      case 'hop': loop({ y: -30, duration: 280, ease: 'Quad.easeOut', repeatDelay: 700 }); break;
      case 'breathe': case 'style:breathe': loop({ scaleY: 1.03, scaleX: 0.99, duration: 1400 }); break;
      // ---- ท่าประจำสาย ----
      case 'style:float': loop({ y: -14, duration: 2000 }); this.tweens.add({ targets: b, angle: { from: -2, to: 2 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); break;
      case 'style:wobble': loop({ scaleX: 1.05, scaleY: 0.95, duration: 750 }); break;
      case 'style:shake': loop({ x: 2, duration: 90, repeatDelay: 1600, repeat: -1 }); this.tweens.add({ targets: b, scaleY: 0.97, duration: 1800, yoyo: true, repeat: -1 }); break;
      case 'style:hover': loop({ y: -10, duration: 700 }); this.tweens.add({ targets: b, angle: { from: -4, to: 4 }, duration: 420, yoyo: true, repeat: -1 }); break;
      case 'style:sway': b.setAngle(-3); loop({ angle: 3, duration: 1300 }); break;
      case 'style:flex': loop({ y: -22, duration: 240, ease: 'Quad.easeOut', repeatDelay: 1300 }); this.tweens.add({ targets: b, scaleX: 1.06, duration: 300, yoyo: true, repeat: -1, repeatDelay: 1240 }); break;
      case 'style:grace': loop({ scaleX: 1.02, scaleY: 1.02, duration: 1800 }); this.tweens.add({ targets: b, angle: { from: -2, to: 2 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); break;
      case 'style:nod': loop({ angle: 3, duration: 380, hold: 250, repeatDelay: 1500 }); break;
      case 'sway': b.setAngle(-3); loop({ angle: 3, duration: 900 }); break;
      case 'look': loop({ x: 26, duration: 900, hold: 700, repeatDelay: 700 }); break;
      case 'droop':
        b.setScale(1, 0.94);
        this.petImg.setTint(0xb8c4e8);
        loop({ scaleY: 0.91, duration: 2000 });
        break;
      case 'yawn':
        this.petImg.setTint(0xe0d8d0);
        loop({ scaleY: 0.95, scaleX: 1.02, duration: 1800, hold: 400 });
        break;
      case 'shiver':
        this.petImg.setTint(0xc8eec4);
        loop({ x: 3, duration: 60 });
        break;
      case 'sleep':
        if (this.petImg.texture.key !== 'ui_dog_sleeping') b.setAngle(-4);
        this.petImg.setTint(0xb6bfdc);
        loop({ scaleY: 0.97, duration: 2400 });
        break;
    }

    this.tweens.killTweensOf(this.emoBubble);
    const show = !!emo.need || emo.key === 'sleeping';
    this.emoBubble.setAlpha(show ? 1 : 0).setScale(1);
    if (show) this.tweens.add({ targets: this.emoBubble, scale: 1.12, yoyo: true, repeat: -1, duration: 600 });
  }

  ambientFx() {
    const k = this.emotion && this.emotion.key;
    const top = this.petTop;
    if (k === 'happy') this.floatEmoji('💖', this.petX + Phaser.Math.Between(-90, 90), top + 20);
    else if (k === 'sleeping') this.floatEmoji('💤', this.petX + 80, top);
    else if (k === 'sad') this.floatEmoji('💧', this.petX - 50, top + 40);
    else if (k === 'sick' && Math.random() < 0.5) this.floatEmoji('🦠', this.petX + Phaser.Math.Between(-100, 100), top + 60);
    else {
      // เอฟเฟกต์ประจำสาย (เช่น ฟองสบู่ ประกาย กล้าม) นาน ๆ ครั้ง
      const fx = this.petStyle().fx;
      if (fx && Math.random() < 0.35) this.floatEmoji(fx, this.petX + Phaser.Math.Between(-100, 100), top + Phaser.Math.Between(10, 60), 26);
    }
  }

  floatEmoji(e, x, y, size) {
    const t = PetGame.UI.text(this, x, y, e, size || 30).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1600, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  // =====================================================================
  //  ใช้ไอเทม
  // =====================================================================
  useItem(key, card) {
    if (this.evolving) return;
    const now = this.time.now;
    if (now - this.lastActionAt < PetGame.Data.ACTION_COOLDOWN_MS) return;
    this.lastActionAt = now;

    const res = this.pet.useItem(key);
    this.showToast(res.message);
    // เสียงตามหมวดไอเทม
    if (!res.ok) PetGame.Sound.play('error');
    else if (res.item.care === 'rest') PetGame.Sound.play(this.pet.sleeping ? 'sleep' : 'wake');
    else PetGame.Sound.play({ feed: 'eat', play: 'play', care: 'care' }[res.item.care]);
    if (!res.ok) {
      this.tweens.add({ targets: this.petStep, x: 8, duration: 50, yoyo: true, repeat: 3, onComplete: () => this.petStep.setX(0) });
      return;
    }
    this.playItemFx(res.item, card);
    let i = 0;
    Object.entries(res.deltas).forEach(([k, v]) => {
      if (!v) return;
      const t = PetGame.UI.text(this, this.petX + 160, this.petTop + 50 + i * 30,
        `${v > 0 ? '+' : ''}${v} ${PetGame.Data.STAT_INFO[k].icon}`, 24, v > 0 ? '#2e8b2e' : '#d63031')
        .setDepth(30).setStroke('#ffffff', 5);
      this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: 300, duration: 1200, onComplete: () => t.destroy() });
      i++;
    });
    this.updateAI(false);
    this.refreshUI();
    this.pet.autosave();
  }

  playItemFx(item, card) {
    const px = this.petX, top = this.petTop, mid = top + (this.groundY - top) * 0.4;
    const from = card ? card.getWorldTransformMatrix() : null;
    const sx = from ? from.tx : px, sy = from ? from.ty : 120;
    const flyer = (size) => {
      const img = this.add.image(sx, sy, 'item_' + item.key).setDepth(85);
      img.setScale(size / Math.max(img.width, img.height));
      return img;
    };
    if (item.care === 'feed') {
      const t = flyer(90);
      this.tweens.add({
        targets: t, x: px, y: mid, scale: t.scale * 0.6, duration: 550, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: t, scale: 0, duration: 250, onComplete: () => t.destroy() })
      });
      this.tweens.add({ targets: this.petC, scaleY: 0.94, duration: 120, yoyo: true, repeat: 2, delay: 550 });
      if (item.key === 'vitamins') this.time.delayedCall(650, () => this.floatEmoji('✨', px, top + 30, 36));
    } else if (item.care === 'play') {      const t = flyer(70);
      t.setPosition(px - 280, this.groundY - 40);
      this.tweens.add({ targets: t, x: px + 280, duration: 1000, onComplete: () => t.destroy() });
      this.tweens.add({ targets: t, y: top - 10, duration: 500, yoyo: true, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: t, angle: 540, duration: 1000 });
      this.tweens.add({ targets: this.petC, y: this.groundY - 50, duration: 230, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
    } else if (item.care === 'care') {
      const t = flyer(80);
      this.tweens.add({ targets: t, x: px + 40, y: mid, duration: 450, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: t, x: px - 40, duration: 180, yoyo: true, repeat: 2, delay: 450, onComplete: () => t.destroy() });
      for (let i = 0; i < 14; i++) {
        const x = px + Phaser.Math.Between(-130, 130), y = Phaser.Math.Between(top + 20, this.groundY);
        const b = PetGame.UI.text(this, x, y, i % 3 ? '🫧' : '✨', Phaser.Math.Between(22, 38)).setOrigin(0.5).setDepth(30).setAlpha(0);
        this.tweens.add({ targets: b, alpha: 1, y: y - 90, duration: 1100, delay: 300 + i * 60, onComplete: () => b.destroy() });
      }
      this.tweens.add({ targets: this.petC, angle: 3, duration: 90, yoyo: true, repeat: 3, delay: 400 });
    } else if (item.care === 'rest') {
      this.floatEmoji(this.pet.sleeping ? '💤' : '☀️', px + 70, top, 40);
    }
  }

  // ---------- ควบคุมด้วยมือ (กล้อง) ----------
  toggleHand() {
    const Hand = PetGame.Hand;
    if (Hand.active) { Hand.stop(); this.showToast('Mouse control'); return; }
    this.showToast('Starting camera… please allow camera access');
    Hand.start().then((ok) => {
      if (!this.sys.isActive()) return;
      this.showToast(ok ? 'Hand control ON — pinch 🤏 to tap!' : 'Camera is not available');
    });
  }

  setupHand() {
    const Hand = PetGame.Hand;
    const refresh = (on) => { if (this.camBtn && this.camBtn.active) this.camBtn.list[1].setVisible(!!on); };
    refresh(Hand.active);
    this.petImg.noDwell = true; // ชี้ค้างบนตัวน้อง = ลูบหัว (ไม่ใช่กดปุ่ม)
    // ท่าที่ใช้ได้เฉพาะตอนไม่มีป๊อปอัป/วิวัฒนาการ
    const ready = () => this.sys.isActive() && !this.evolving && !this.groomOpen;

    // 🤚 วางฝ่ามือค้างบนตัวน้อง = ลูบหัว (ครั้งแรก 0.8 วิ แล้วทุก 1.4 วิ ตราบที่มือยังอยู่)
    const onFrame = (gesture) => {
      const gp = Hand.gamePoint(this.game);
      const onPet = gp && ready() && (gesture === 'open' || gesture === 'other') && !Hand.pressed && this.petImg.getBounds().contains(gp.x, gp.y);
      const now = this.time.now;
      if (!onPet) { this.palmSince = null; return; }
      if (this.palmSince == null) { this.palmSince = now; this.palmNext = now + 800; }
      if (now >= this.palmNext) { this.palmNext = now + 1400; this.pat(); }
    };
    // ✌️ = ทักทาย
    const onPeace = () => {
      if (!ready()) return;
      if (this.pet.sleeping) { this.petSpeak('Zzz... 💤', false); return; }
      PetGame.Sound.play('chat');
      this.tweens.add({ targets: this.petC, y: this.groundY - 18, duration: 140, yoyo: true, repeat: 1 });
      this.floatEmoji('✌️', this.petX + 70, this.petTop + 20);
      this.petSpeak(PetGame.PetChatbot.voice(Phaser.Utils.Array.GetRandom(['สวัสดี! ✌️ ชูสองนิ้วให้เราเหรอ', 'หวัดดี~ เห็นมือเธอแล้ว!', 'เย้! ✌️ ดีใจที่เธอมาเล่นด้วย']), this.pet), true);
    };
    // 👍 = ชมน้อง (Social +2 ; ชมถี่ ๆ ได้ทุก 8 วินาที)
    const onThumb = () => {
      if (!ready()) return;
      if (this.pet.sleeping) { this.petSpeak('Zzz... 💤', false); return; }
      const now = this.time.now, gain = now - (this.lastPraise || -1e9) > 8000;
      if (gain) { this.lastPraise = now; this.pet.onPraise(); this.refreshUI(); }
      PetGame.Sound.play('pat');
      this.tweens.add({ targets: this.petBody, scaleX: 1.06, scaleY: 0.94, duration: 120, yoyo: true, repeat: 1 });
      this.floatEmoji('👍', this.petX - 70, this.petTop + 20);
      if (gain) this.floatEmoji('💗', this.petX + 40, this.petTop);
      this.petSpeak(PetGame.PetChatbot.voice(Phaser.Utils.Array.GetRandom(['ขอบคุณที่ชมนะ! 😊', 'เย้! เราเก่งใช่ไหมล่ะ', 'ดีใจจัง~ ชมอีกได้นะ']), this.pet), true);
    };
    Hand.on('change', refresh);
    Hand.on('frame', onFrame);
    Hand.on('peace', onPeace);
    Hand.on('thumb', onThumb);
    this.events.once('shutdown', () => { Hand.off('change', refresh); Hand.off('frame', onFrame); Hand.off('peace', onPeace); Hand.off('thumb', onThumb); });
  }

  pat() {
    if (this.evolving) return;
    if (this.pet.sleeping) { this.showToast('Shh... sleeping'); return; }
    PetGame.Sound.play('pat');
    this.pet.onPat();
    this.floatEmoji('💗', this.petX + Phaser.Math.Between(-60, 60), this.petTop + 10);    this.tweens.add({ targets: this.petC, scaleX: 1.05, scaleY: 0.95, duration: 100, yoyo: true });
  }

  showToast(msg) {
    if (!msg) return;
    this.toast.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1800, duration: 500 });
  }

  // ให้สัตว์พูด (ฟองคำพูด + ส่งเข้าแชทถ้า toChat)
  petSpeak(text, toChat) {
    if (toChat) PetGame.chat.petSays(text);
    this.speechText.setText(text);
    const w = Math.min(370, this.speechText.width + 30), h = this.speechText.height + 18;
    this.speechBg.clear()
      .fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16)
      .lineStyle(3, PetGame.Data.COLORS.teal, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 16)
      .fillStyle(0xffffff, 1).fillTriangle(-11, h / 2 - 2, 11, h / 2 - 2, 0, h / 2 + 14);
    this.tweens.killTweensOf(this.speech);
    this.speech.setAlpha(1);
    this.tweens.add({ targets: this.speech, alpha: 0, delay: 3400, duration: 400 });
  }

  // ---------- เชื่อมกับแชท ----------
  getAIContext() { return { pet: this.pet, emotion: this.emotion, advice: this.advice }; }

  onChat(res) {
    this.pet.onChat();
    this.time.delayedCall(450, () => {
      this.petSpeak(res.text, false);
      if (!this.pet.sleeping) this.tweens.add({ targets: this.petC, y: this.groundY - 16, duration: 120, yoyo: true });
    });
  }

  // =====================================================================
  //  วันถัดไป / เริ่มใหม่ / ป๊อปอัป / วิวัฒนาการ (1.2)
  // =====================================================================
  // ขึ้นวันใหม่: ตัดสินวิวัฒนาการ -> ฉาก "Day N" -> กลับมาหน้าเลี้ยงแล้วแสดงผล
  nextDay() {
    if (this.evolving || !this.pet.isDayOver()) return;
    const dayResult = this.pet.nextDay();
    this.pet.autosave();
    this.scene.start('Day', { pet: this.pet, dayResult });
  }

  // ผลการตัดสินตอนขึ้นวันใหม่
  showDayResult(r) {
    const p = this.pet;
    if (r.type === 'evolve' || r.type === 'regress') {
      this.evolving = true;
      this.pauseReason = 'evolve';
      this.scene.pause();
      this.scene.launch('Evolution', { pet: p, from: { key: r.from.key, name: r.from.name }, result: r.result, regress: r.type === 'regress' });
    } else if (r.type === 'warn') {
      const left = p.missesLeft();
      PetGame.chat.system(`⚠️ Yesterday's care missed the goal. ${left} more missed day${left > 1 ? 's' : ''} in a row and ${p.name} will change back.`);
      this.time.delayedCall(600, () => this.petSpeak(PetGame.PetChatbot.voice(`เมื่อวานยังไม่ใช่ทางของเราเลย... ถ้าพลาดอีก ${left} วันติดกัน เราจะถอยกลับร่างเดิมนะ`, p), true));
    } else if (r.type === 'near') {
      PetGame.chat.system(`🙂 Yesterday was close to the goal — ${p.name} keeps its form. A little more focus to grow!`);
    } else if (r.type === 'stay' && p.stage === 1) {
      PetGame.chat.system('No evolution goal was met yesterday. Try caring in one clear style all day!');
    } else if (r.type === 'max') {
      PetGame.chat.system(`${p.name} is at the final form. Press Rebirth to start a new evolution.`);
    }
  }

  // Rebirth: กลับเป็นร่างแรก (กดได้เมื่อถึงร่างสูงสุดเท่านั้น)
  confirmRebirth() {
    if (!this.pet.isMax()) { this.showToast('Reach the final form to unlock Rebirth.'); return; }
    PetGame.UI.confirm(this, `Rebirth ${this.pet.name}?\nIt will become a Newborn again\n(the Evolution Book is kept).`, () => {
      this.pet.rebirth();
      this.pet.autosave();
      this.scene.start('Day', { pet: this.pet });
    });
  }

  openPopup(sceneKey) {
    if (this.evolving) return;
    PetGame.chat.close();
    this.evolving = true;
    this.pauseReason = sceneKey;
    this.scene.pause();
    this.scene.launch(sceneKey, { pet: this.pet, game: this });
  }

  onResume() {
    this.evolving = false;
    const reason = this.pauseReason;
    this.pauseReason = null;
    this.speedChanged();
    if (reason !== 'evolve') return;
    this.refreshPetLook();
    this.updateAI(true);
    this.refreshUI();
    PetGame.chat.refreshHeader();
    const back = this.dayResult && this.dayResult.type === 'regress';
    PetGame.chat.system(back ? `↩️ ${this.pet.name} went back to "${this.pet.formName()}"` : `🧬 ${this.pet.name} evolved into "${this.pet.formName()}"!`);
    this.petSpeak(PetGame.PetChatbot.voice(back ? `ฮือ... เราถอยกลับเป็น ${this.pet.formName()} แล้ว วันนี้ดูแลเราให้ตรงทางนะ` : `ว้าว! ตอนนี้เราเป็น ${this.pet.formName()} แล้วนะ!`, this.pet), true);
    this.dayResult = null;
  }

  speedChanged() {
    if (PetGame.speed !== this.lastSpeed) {
      if (this.lastSpeed !== undefined) this.showToast(`Time speed x${PetGame.speed}`);
      this.lastSpeed = PetGame.speed;
    }
  }

  goHome() {
    this.pet.autosave();
    this.scene.start('Title');
  }
}
