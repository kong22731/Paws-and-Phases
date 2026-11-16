/*
 * EvolutionAI.js — 1.2 Smart Evolution (ตาม Evolution Line.pdf)
 *
 * วิเคราะห์การเลี้ยง "ใน 1 วัน" (careWindow ล้างทุกครั้งที่ขึ้นวันใหม่) ด้วยค่าหลัก 4 แกน + ค่าเสริม
 *   Feed (กิน)  Play (เล่น)  Care (ดูแล/สะอาด)  Rest (พักผ่อน/นอน)  + Social (คุยแชท = จำนวนครั้งที่คุย)
 *
 * เงื่อนไขแต่ละสาย (ตรวจตามลำดับนี้ เจอสายแรกที่ผ่านก็ใช้สายนั้น):
 *   👽 neglect  : แทบไม่ได้ดูแลเลย (แต้มรวมน้อยกว่า neglectMaxPoints)
 *   🎩 leader   : สมดุล 4 ด้าน (ทุกด้าน 15-35%) + คุยกัน ≥ leaderChats ครั้งในวันนั้น
 *   👑 royal    : สมดุล 4 ด้าน (ทุกด้าน 15-35%)
 *   💤 sleepy   : Rest ≥ 50% และ Feed / Play / Care แต่ละอย่าง ≤ 20%
 *   🐷 gluttony : Feed สูงสุดและ ≥ 45% ; Play, Care ≤ 20%
 *   🧼 selfcare : Care สูงสุดและ ≥ 45% ; Play, Feed ≤ 20%
 *   🏋️ playful  : Play สูงสุดและ ≥ 45% ; Care, Feed ≤ 20%
 *   (ไม่ผ่านสักสาย = line null -> "ไม่ถึงเป้า")
 *
 * ตัวเลขเกณฑ์ทั้งหมดอยู่ใน CFG ปรับได้ที่นี่
 */
window.PetGame = window.PetGame || {};

(function () {
  const CFG = {
    neglectMaxPoints: 15, // แต้มดูแลรวมทั้งวันน้อยกว่านี้ = ถูกละเลย
    minPoints: 20,        // สายเน้นด้านเดียวต้องมีแต้มรวมอย่างน้อยเท่านี้
    minBalanced: 40,      // สายสมดุลต้องมีแต้มรวมอย่างน้อยเท่านี้
    focusShare: 0.45,     // ด้านที่เน้นต้องมีสัดส่วนอย่างน้อยเท่านี้
    sleepyShare: 0.5,     // สาย Sleepy: Rest อย่างน้อยเท่านี้
    lowShare: 0.2,        // ด้านที่ "ต่ำ" ต้องไม่เกินเท่านี้
    balancedMin: 0.15,    // สมดุล: ทุกด้านอยู่ระหว่าง 15% ...
    balancedMax: 0.35,    //        ... ถึง 35%
    leaderChats: 8        // สายผู้นำ: คุยกันอย่างน้อยกี่ครั้งต่อวัน
  };
  // เกณฑ์แบบง่าย สำหรับร่าง 1 -> 2 และ 2 -> 3 (ใช้เมื่อร่างปัจจุบัน ≤ EASY_UP_TO_STAGE)
  const EASY = {
    minPoints: 10,
    minBalanced: 24,
    focusShare: 0.35,
    sleepyShare: 0.4,
    lowShare: 0.3,
    balancedMin: 0.1,
    balancedMax: 0.4,
    leaderChats: 4
  };
  const EASY_UP_TO_STAGE = 2;
  const ORDER = ['neglect', 'leader', 'royal', 'sleepy', 'gluttony', 'selfcare', 'playful'];

  const EvolutionAI = {
    CFG, EASY, EASY_UP_TO_STAGE,

    // เกณฑ์ที่ใช้กับร่างนี้ (ร่าง 1-2 ใช้เกณฑ์ง่าย, ร่าง 3 ขึ้นไปใช้เกณฑ์ปกติ)
    configFor(stage) { return stage && stage <= EASY_UP_TO_STAGE ? Object.assign({}, CFG, EASY) : CFG; },

    // ตรวจทุกสาย ; stage = ร่างปัจจุบันของสัตว์ (กำหนดความยากของเกณฑ์)
    // คืน { line, met:{สาย:true/false}, shares, total, chats, avgWell, neglectRatio, reason }
    analyze(careWindow, stage) {
      const CFG = this.configFor(stage);
      const w = careWindow;
      const chats = w.chat || 0;
      const total = w.feed + w.play + w.care + w.rest;
      const time = Math.max(1, w.time);
      const sh = {
        feed: total ? w.feed / total : 0,
        play: total ? w.play / total : 0,
        care: total ? w.care / total : 0,
        rest: total ? w.rest / total : 0
      };
      const low = (...ks) => ks.every((k) => sh[k] <= CFG.lowShare);
      const top = (k) => Object.keys(sh).every((o) => sh[k] >= sh[o]);
      const balanced = total >= CFG.minBalanced && Object.values(sh).every((v) => v >= CFG.balancedMin && v <= CFG.balancedMax);
      const met = {
        neglect: total < CFG.neglectMaxPoints,
        leader: balanced && chats >= CFG.leaderChats,
        royal: balanced, // ถ้าคุยถึงเกณฑ์ด้วย จะได้สาย leader ก่อน (ตรวจ leader ก่อน royal)
        sleepy: total >= CFG.neglectMaxPoints && sh.rest >= CFG.sleepyShare && low('feed', 'play', 'care'),
        gluttony: total >= CFG.minPoints && top('feed') && sh.feed >= CFG.focusShare && low('play', 'care'),
        selfcare: total >= CFG.minPoints && top('care') && sh.care >= CFG.focusShare && low('play', 'feed'),
        playful: total >= CFG.minPoints && top('play') && sh.play >= CFG.focusShare && low('care', 'feed')
      };
      const line = ORDER.find((l) => met[l]) || null;
      const pct = (k) => `${Math.round(sh[k] * 100)}%`;
      const reasons = {
        neglect: `Barely cared for (${Math.round(total)} care points in the day)`,
        leader: `Perfect balance in all 4 areas and chatted ${chats} times`,
        royal: 'Perfect balance in all 4 areas',
        sleepy: `Mostly resting (Rest ${pct('rest')})`,
        gluttony: `Mostly eating (Feed ${pct('feed')})`,
        selfcare: `Mostly grooming and cleaning (Care ${pct('care')})`,
        playful: `Mostly playing and exercising (Play ${pct('play')})`
      };
      return {
        line, met, shares: sh, total, chats,
        avgWell: w.wellSum / time,
        neglectRatio: w.neglect / time,
        lowData: false,
        reason: line ? reasons[line] : `Care was mixed — no evolution goal was met (Feed ${pct('feed')}, Play ${pct('play')}, Care ${pct('care')}, Rest ${pct('rest')})`
      };
    },

    // วันนี้ทำตามเป้าของสายนี้แล้วหรือยัง
    meets(line, careWindow, stage) { return !!this.analyze(careWindow, stage).met[line]; }
  };

  PetGame.EvolutionAI = EvolutionAI;
})();
