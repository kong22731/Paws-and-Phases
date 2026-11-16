/*
 * PetState.js — เก็บสถานะของสัตว์เลี้ยง, การลดลงตามเวลา, ผลของไอเทม และการบันทึกเกม
 */
window.PetGame = window.PetGame || {};

(function () {
  const D = PetGame.Data;
  const SAVE_KEY = 'lovelyPetEvolutions.save.v2';          // เซฟแบบเก่า (ไฟล์เดียว) — ย้ายไปไฟล์ 1 อัตโนมัติ
  const SLOT_COUNT = 3;
  const slotKey = (n) => `lovelyPetEvolutions.slot.${n}`;
  const clamp = (v) => Math.max(0, Math.min(100, v));

  function emptyWindow() {
    // "หน้าต่างพฤติกรรม" — สะสมข้อมูลการเลี้ยงตั้งแต่การวิวัฒนาการครั้งล่าสุด
    // chat = จำนวนครั้งที่คุยกัน (ใช้ปลดล็อกสายลับ Leader)
    return { feed: 0, play: 0, care: 0, rest: 0, chat: 0, neglect: 0, time: 0, wellSum: 0 };
  }

  // หาไอเทมจาก key (เติม care = หมวดที่ไอเทมอยู่ เช่น feed / play / care / rest)
  function findItem(key) {
    for (const cat of Object.keys(D.ITEMS)) {
      const it = D.ITEMS[cat].find((i) => i.key === key);
      if (it) return Object.assign({ care: cat }, it);
    }
    return null;
  }

  class PetState {
    constructor(data) {
      Object.assign(this, {
        species: 'dog',
        name: 'Gigi',
        stage: 1,
        line: null,
        stats: { fullness: 80, happiness: 80, health: 80, energy: 80 },
        growth: 0,
        sleeping: false,
        sleepMode: null,   // 'nap' (งีบตามเวลา) | 'night' (นอนจนถึงวันถัดไป) | 'auto' (หมดแรงหลับเอง)
        napUntil: 0,
        day: 1,
        dayTime: 0,        // วินาทีที่ผ่านไปในวันนี้ (ครบ DAY_SECONDS = หมดวัน)
        completed: [],     // สายที่เคยไปถึงร่างสูงสุดแล้ว (ชื่อสายจะถูกเปิดเผย)
        missStreak: 0,     // จำนวนวันที่พลาดเป้าติดกัน (ครบ REGRESS_AFTER แล้วจึงลดร่าง)
        bond: 10,          // ค่า Social (แถบสีชมพู) — เพิ่มจากการคุยแชท
        gameTime: 0,
        lastInteraction: 0,
        careWindow: emptyWindow(),
        totals: { feed: 0, play: 0, care: 0, rest: 0, chats: 0 },
        history: [],
        unlocked: [],
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), // รหัสประจำตัวสัตว์ (ใช้เช็คว่าเซฟเป็นตัวเดียวกันไหม)
        slot: null,        // ไฟล์เซฟที่ตัวนี้อยู่ (1-3) ; null = ยังไม่เคยกด Save (ยังไม่ autosave)
        savedAt: Date.now()
      }, data || {});
      this.migrate();
    }

    // แปลงเซฟจากเวอร์ชันเก่า (สาย playful/beauty/strong/balanced/neglect ร่าง 1-4)
    migrate() {
      const map = D.LEGACY_LINES;
      if (this.line && map[this.line]) this.line = map[this.line];
      if (this.line && !D.LINES[this.line]) this.line = 'playful';
      this.unlocked = (this.unlocked || []).map((k) => {
        const m = /^(dog|cat)_([a-z]+)_(\d)$/.exec(k);
        return m && map[m[2]] ? `${m[1]}_${map[m[2]]}_${m[3]}` : k;
      });
      this.history = (this.history || []).map((h) => Object.assign({}, h, { line: map[h.line] || h.line }));
      if (this.careWindow && this.careWindow.chat === undefined) this.careWindow.chat = 0;
      if (this.sleeping && !this.sleepMode) this.sleepMode = 'auto';
      if (!Array.isArray(this.completed)) this.completed = [];
      if (typeof this.dayTime !== 'number') this.dayTime = 0;
      // เซฟเก่าที่อยู่ร่างสูงสุดแล้ว นับว่าสำเร็จสายนั้น
      if (this.stage >= D.MAX_STAGE && this.line && !this.completed.includes(this.line)) this.completed.push(this.line);
    }

    static create(species, name) {
      const p = new PetState({ species, name });
      p.unlocked = [`${species}_baby`];
      return p;
    }

    static findItem(key) { return findItem(key); }

    // ---------- ค่าที่คำนวณได้ ----------
    wellbeing() {
      const s = this.stats;
      return (s.fullness + s.happiness + s.health + s.energy) / 4;
    }
    secondsSinceInteraction() { return this.gameTime - this.lastInteraction; }
    // ---------- วัน ----------
    isDayOver() { return this.dayTime >= D.DAY_SECONDS; }
    dayLeft() { return Math.max(0, D.DAY_SECONDS - this.dayTime); }
    dayProgress() { return Math.min(100, (this.dayTime / D.DAY_SECONDS) * 100); }
    isMax() { return this.stage >= D.MAX_STAGE; }
    isCompleted(line) { return (this.completed || []).includes(line); }
    // ชื่อสายที่ผู้เล่นเห็นได้ (ยังไม่ถึงร่างสูงสุด = ???)
    lineName(line) { return line && this.isCompleted(line) ? D.LINES[line].label : '???'; }
    formName() {
      const names = D.FORM_NAMES[this.species];
      return this.line ? names[this.line][this.stage - 1] : names.baby;
    }
    stageLabel() { return `${D.STAGE_LABELS[this.stage - 1]} (Stage ${this.stage})`; }
    breedLabel() { return this.species === 'dog' ? 'Dog' : 'Cat'; }
    formKey() { return this.line ? `${this.species}_${this.line}_${this.stage}` : `${this.species}_baby`; }
    bodyKey() { return 'body_' + this.formKey(); }
    portraitKey() { return 'portrait_' + this.formKey(); }
    bondLevel() { return Math.floor(this.bond / 20) + 1; }

    // ---------- เดินเวลา ----------
    tick(dt) {
      const s = this.stats, k = D.DECAY;
      // หมดวันแล้ว (ปุ่ม NEXT DAY ขึ้น): ทุกอย่างหยุดนิ่ง ค่าสถานะไม่ลดลงเด็ดขาด
      if (this.isDayOver()) { this.dayTime = D.DAY_SECONDS; return; }
      dt = Math.min(dt, D.DAY_SECONDS - this.dayTime); // ไม่ให้เกินเวลาที่เหลือของวัน
      this.gameTime += dt;
      this.dayTime += dt;

      if (this.sleeping) {
        s.energy = clamp(s.energy + k.sleepEnergyGain * dt);
        s.fullness = clamp(s.fullness - k.sleepFullnessDecay * dt);
        // งีบ/นอนที่สั่งเอง = แต้มพักผ่อนสะสมตามเวลา (หมดแรงหลับเองไม่นับ)
        if ((this.sleepMode === 'nap' || this.sleepMode === 'night') && !this.isDayOver()) this.careWindow.rest += D.REST_PER_SEC * dt;
        // งีบ: ตื่นเมื่อครบเวลา ; หมดแรงหลับเอง: ตื่นเมื่อพลังเต็ม ; นอนกลางคืน: หลับจนกด NEXT DAY
        if (this.sleepMode === 'nap' && this.gameTime >= this.napUntil) this.wake();
        else if (this.sleepMode !== 'nap' && this.sleepMode !== 'night' && s.energy >= 100) this.wake();
      } else {
        s.fullness = clamp(s.fullness - k.fullness * dt);
        s.happiness = clamp(s.happiness - k.happiness * dt);
        s.health = clamp(s.health - k.health * dt);
        s.energy = clamp(s.energy - k.energy * dt);
        if (this.secondsSinceInteraction() > k.lonelyAfter) {
          s.happiness = clamp(s.happiness - k.lonelyHappinessPenalty * dt);
        }
        if (s.energy <= 3) { this.sleeping = true; this.sleepMode = 'auto'; } // หมดแรงหลับเอง
      }
      if (s.fullness < 20) s.health = clamp(s.health - k.hungryHealthPenalty * dt);

      // บันทึกพฤติกรรมสำหรับระบบวิวัฒนาการ
      const w = this.careWindow;
      w.time += dt;
      w.wellSum += this.wellbeing() * dt;
      if (Math.min(s.fullness, s.happiness, s.health) < 25) w.neglect += dt;
    }

    // เวลาจะเดินเฉพาะตอนอยู่หน้าเลี้ยงเท่านั้น — ปิดเกม/สลับแท็บ/อยู่หน้าอื่น ค่าสถานะและเวลาคงเดิม
    // (Phaser หยุดลูปเกมเองเมื่อแท็บถูกซ่อน และไม่มีการชดเชยเวลาที่ปิดเกมไป)

    wake() { this.sleeping = false; this.sleepMode = null; this.napUntil = 0; }

    // ---------- ขึ้นวันใหม่ (ปุ่ม NEXT DAY) ----------
    // ตัดสินวิวัฒนาการจากการเลี้ยงทั้งวัน แล้วเริ่มวันใหม่
    // คืนค่า { type: 'evolve' | 'regress' | 'stay' | 'max', from:{key,name,stage}, result }
    nextDay() {
      const result = PetGame.EvolutionAI.analyze(this.careWindow, this.stage);
      const from = { key: this.bodyKey(), name: this.formName(), stage: this.stage, line: this.line };
      let type = 'stay';
      if (this.isMax()) {
        type = 'max';                                   // ร่างสูงสุด: ไม่เปลี่ยนร่าง ไม่ลดขั้น (ต้อง Rebirth)
      } else if (this.stage === 1) {
        if (result.line) { this.evolveTo(result.line); type = 'evolve'; }
      } else if (result.met[this.line]) {
        this.evolveTo(this.line); type = 'evolve';     // ทำเป้าสายเดิมได้ -> ขึ้น 1 ขั้น
        this.missStreak = 0;
      } else if (PetGame.EvolutionAI.analyze(this.careWindow, 1).met[this.line]) {
        type = 'near';                                 // เกือบถึงเป้า -> คงร่าง ไม่นับว่าพลาด
      } else {
        this.missStreak = (this.missStreak || 0) + 1;  // พลาดเป้า: นับวันที่พลาดติดกัน
        if (this.missStreak >= this.missesAllowed()) { this.regress(); type = 'regress'; this.missStreak = 0; }
        else type = 'warn';                            // ยังไม่ลด แค่เตือน
      }
      if (type === 'evolve') this.missStreak = 0;
      if (this.isMax() && !this.isCompleted(this.line)) this.completed.push(this.line);

      // เริ่มวันใหม่
      if ((this.careWindow.chat || 0) === 0) this.bond = Math.max(0, this.bond - D.SOCIAL_DAILY_DECAY);
      this.day += 1;
      this.dayTime = 0;
      this.careWindow = emptyWindow();
      if (this.sleeping) {
        if (this.sleepMode === 'night') this.stats.energy = 100;
        this.wake();
      }
      this.lastInteraction = this.gameTime;
      return { type, from, result };
    }

    // ร่างนี้พลาดเป้าติดกันได้กี่วันก่อนลดร่าง / เหลืออีกกี่วัน
    missesAllowed() { return D.REGRESS_AFTER[this.stage] || 2; }
    missesLeft() { return Math.max(0, this.missesAllowed() - (this.missStreak || 0)); }

    regress() {
      this.stage = Math.max(1, this.stage - 1);
      if (this.stage === 1) this.line = null;
      this.history.push({ stage: this.stage, line: this.line, at: this.gameTime, regress: true });
    }

    // เกิดใหม่ (ปุ่ม Rebirth — กดได้เมื่อถึงร่างสูงสุด): กลับเป็นร่างแรก เก็บชื่อ/ร่างที่ปลดล็อก/สายที่สำเร็จไว้
    rebirth() {
      this.stage = 1;
      this.line = null;
      this.missStreak = 0;
      this.stats = { fullness: 80, happiness: 80, health: 80, energy: 80 };
      this.wake();
      this.day = 1;
      this.dayTime = 0;
      this.careWindow = emptyWindow();
      this.history.push({ stage: 1, line: null, at: this.gameTime, rebirth: true });
    }

    // ---------- ใช้ไอเทม ----------
    // คืนค่า { ok, message, deltas }
    useItem(key) {
      const item = findItem(key);
      if (!item) return { ok: false, message: 'Unknown item' };
      const s = this.stats;
      const before = Object.assign({}, s);
      const statKey = D.CARE_STAT[item.care];

      const isRest = item.care === 'rest';
      if (this.isDayOver()) {
        return { ok: false, message: 'The day is over! Press NEXT DAY to continue.' };
      }
      if (this.sleeping && !isRest) {
        return { ok: false, message: `${this.name} is sleeping. Use Rest to wake up first.` };
      }

      // ยิ่งสัตว์ต้องการมาก กิจกรรมยิ่งมีคุณค่า (ใช้คำนวณสายวิวัฒนาการ)
      const need = (100 - s[statKey]) / 100;
      let careValue = 10 * (0.5 + need);
      let message = '';

      if (isRest) {
        if (this.sleeping) {
          // กดไอเทมพักผ่อนขณะหลับ = ปลุก
          this.wake();
          careValue = 0;
          message = 'Good morning!';
          if (s.energy < 50) { s.happiness = clamp(s.happiness - 5); message = 'Woke up too early... still sleepy.'; }
        } else {
          this.sleeping = true;
          if (key === 'nap') {
            this.sleepMode = 'nap';
            this.napUntil = this.gameTime + D.NAP_SECONDS;
            message = `Nap time (${D.NAP_SECONDS} sec)... Zzz`;
          } else {
            this.sleepMode = 'night';
            message = 'Good night! Sleeping until you wake it up... Zzz';
          }
          if (before.energy > 85) careValue = 1;
        }
      } else {
        if (item.care === 'play' && s.energy < 15) {
          return { ok: false, message: 'Too tired to play. Let it rest first.' };
        }
        Object.entries(item.fx).forEach(([k, v]) => { s[k] = clamp(s[k] + v); });

        if (item.care === 'feed' && before.fullness > 90) {
          s.happiness = clamp(s.happiness - 5);
          s.health = clamp(s.health - 5);
          careValue = 1;
          message = 'Too full! Overeating is bad for health.';
        } else if (key === 'vitamins' && before.health > 50) {
          s.happiness = clamp(s.happiness - 5);
          careValue = 2;
          message = 'Not sick — vitamins are not needed now.';
        } else if (item.care === 'care' && before.health > 90) {
          careValue = 1;
          message = 'Already squeaky clean!';
        } else {
          message = `${item.label}: ` + { feed: 'Yum! Delicious!', play: 'So much fun!', care: 'Fresh and clean!' }[item.care];
        }
      }

      this.careWindow[item.care] += careValue;
      this.totals[item.care] += 1;
      this.lastInteraction = this.gameTime;

      const deltas = {};
      D.STATS.forEach((k) => { deltas[k] = Math.round(s[k] - before[k]); });
      return { ok: true, message, deltas, item };
    }

    // คุยแชท: เพิ่มค่า Social และนับจำนวนครั้งที่คุยในวันนี้ (ใช้กับสาย Leader)
    onChat() {
      this.lastInteraction = this.gameTime;
      this.totals.chats += 1;
      this.careWindow.chat += 1;
      this.bond = Math.min(100, this.bond + D.SOCIAL_PER_CHAT);
      if (!this.sleeping) this.stats.happiness = clamp(this.stats.happiness + 1);
    }

    // ลูบตัว (กดที่สัตว์): หายเหงา แต่ไม่นับเป็นการคุย
    onPat() {
      this.lastInteraction = this.gameTime;
      if (!this.sleeping) this.stats.happiness = clamp(this.stats.happiness + 1);
    }

    // ชมน้อง (👍 ท่ามือ): Social +2 เล็กน้อย ไม่นับเป็นการคุย
    onPraise() {
      this.lastInteraction = this.gameTime;
      this.bond = Math.min(100, this.bond + 2);
      if (!this.sleeping) this.stats.happiness = clamp(this.stats.happiness + 1);
    }

    evolveTo(line) {
      this.stage += 1;
      this.line = line;
      this.history.push({ stage: this.stage, line, at: this.gameTime });
      const key = this.formKey();
      if (!this.unlocked.includes(key)) this.unlocked.push(key);
    }

    // ---------- บันทึก / โหลด (ไฟล์เซฟ 3 ช่อง) ----------
    // สัตว์ตัวใหม่จะยังไม่ถูกบันทึกจนกว่าจะกด Save ที่เมนูแล้วเลือกไฟล์
    // หลังจากนั้นตัวนั้นจะ autosave ลงไฟล์เดิมตลอด (ทุก 5 วินาที / ขึ้นวันใหม่ / ปิดแท็บ ฯลฯ)
    get saved() { return !!this.slot; }
    set saved(v) { /* ค่าจากเซฟรุ่นก่อน — ไม่ใช้แล้ว (ดูจาก slot แทน) */ }
    save(slot) {
      if (slot) this.slot = slot;
      if (!this.slot) return;
      this.savedAt = Date.now();
      try { localStorage.setItem(slotKey(this.slot), JSON.stringify(this)); } catch (e) { /* ignore */ }
    }
    autosave() { if (this.slot) this.save(); }

    static loadSlot(n) {
      try {
        const raw = localStorage.getItem(slotKey(n));
        if (!raw) return null;
        const pet = new PetState(JSON.parse(raw));
        pet.slot = n;
        return pet;
      } catch (e) { return null; }
    }
    // ทุกช่อง: [PetState|null, ...]
    static slots() {
      PetState.migrateOldSave();
      const out = [];
      for (let n = 1; n <= SLOT_COUNT; n++) out.push(PetState.loadSlot(n));
      return out;
    }
    static hasAnySave() { return PetState.slots().some(Boolean); }
    static clearSlot(n) {
      try { localStorage.removeItem(slotKey(n)); } catch (e) { /* ignore */ }
    }
    // คัดลอกไฟล์ from -> to (ตัวที่คัดลอกเป็นสัตว์อีกตัว เล่นแยกกันได้)
    static copySlot(from, to) {
      const src = PetState.loadSlot(from);
      if (!src) return null;
      const copy = new PetState(JSON.parse(JSON.stringify(src)));
      copy.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      copy.save(to);
      return copy;
    }
    // เซฟแบบเก่า (มีไฟล์เดียว) -> ย้ายไปไฟล์ 1
    static migrateOldSave() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        if (!localStorage.getItem(slotKey(1))) {
          const pet = new PetState(JSON.parse(raw));
          pet.slot = 1;
          localStorage.setItem(slotKey(1), JSON.stringify(pet));
        }
        localStorage.removeItem(SAVE_KEY);
      } catch (e) { /* ignore */ }
    }
  }

  PetState.SLOT_COUNT = SLOT_COUNT;
  PetGame.PetState = PetState;
})();
