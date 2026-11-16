/*
 * EmotionAI.js — 1.1 AI Emotion & Needs
 * วิเคราะห์สถานะ (ความอิ่ม ความสุข สุขภาพ พลังงาน เวลาที่ไม่ได้โต้ตอบ)
 * แล้วให้คะแนนแต่ละอารมณ์ เลือกอารมณ์ที่คะแนนสูงสุดมาแสดงผล
 */
window.PetGame = window.PetGame || {};

(function () {
  // โปรไฟล์ของแต่ละอารมณ์: ใช้ทั้งการแสดงผลและแอนิเมชัน (ดู GameScene.applyEmotionAnimation)
  const EMOTIONS = {
    happy:    { label: 'Happy',        emoji: '😆', anim: 'hop',     need: null },
    normal:   { label: 'Fine',         emoji: '🙂', anim: 'breathe', need: null },
    hungry:   { label: 'Hungry',       emoji: '🍖', anim: 'sway',    need: 'feed' },
    lonely:   { label: 'Lonely',       emoji: '🥺', anim: 'look',    need: 'play' },
    sad:      { label: 'Sad',          emoji: '😢', anim: 'droop',   need: 'play' },
    tired:    { label: 'Tired',        emoji: '🥱', anim: 'yawn',    need: 'rest' },
    sick:     { label: 'Sick / Dirty', emoji: '🤒', anim: 'shiver',  need: 'care' },
    sleeping: { label: 'Sleeping',     emoji: '😴', anim: 'sleep',   need: null }
  };

  const EmotionAI = {
    EMOTIONS,

    // คืนค่า { key, label, emoji, anim, need, intensity(0-1), scores }
    evaluate(pet) {
      const s = pet.stats;
      const idle = pet.secondsSinceInteraction();
      const avg = pet.wellbeing();

      if (pet.sleeping) return this._result('sleeping', 1, { sleeping: 100 });

      const scores = {
        sick:   s.health < 35 ? (35 - s.health) * 3 : 0,
        hungry: s.fullness < 40 ? (40 - s.fullness) * 2.5 : 0,
        tired:  s.energy < 30 ? (30 - s.energy) * 2.5 : 0,
        lonely: idle > 45 && s.happiness < 65 ? Math.min(60, (idle - 45) / 2) + (65 - s.happiness) : 0,
        sad:    s.happiness < 35 ? (35 - s.happiness) * 2 : 0,
        happy:  avg > 70 && s.happiness > 65 ? (avg - 55) : 0,
        normal: 12
      };

      let best = 'normal';
      Object.keys(scores).forEach((k) => { if (scores[k] > scores[best]) best = k; });
      const intensity = Math.min(1, scores[best] / 80);
      return this._result(best, intensity, scores);
    },

    _result(key, intensity, scores) {
      return Object.assign({ key, intensity, scores }, EMOTIONS[key]);
    },

    // ข้อความที่สัตว์ "เรียก" ผู้เล่นเองเมื่อต้องการบางอย่าง
    callout(emotion, pet) {
      const dog = pet.species === 'dog';
      const lines = {
        hungry: dog ? ['หิวแล้วอ่ะ... โฮ่ง', 'ท้องร้องจ๊อก ๆ เลย'] : ['เมี้ยว... ข้าวอยู่ไหน?', 'หิวแล้วนะ เหมียว'],
        lonely: dog ? ['มาเล่นด้วยกันหน่อยสิ!', 'อยู่ไหนอ่ะ เหงาจัง'] : ['...ไม่ได้เหงานะ แต่มาเล่นด้วยก็ได้', 'เมี้ยว~ มาเล่นกันไหม'],
        sad: ['รู้สึกไม่ค่อยดีเลย...', 'วันนี้เศร้าจัง'],
        tired: ['ง่วงแล้ว... อยากนอน', 'เหนื่อยจังเลย'],
        sick: ['ตัวคันไปหมด อยากอาบน้ำ', 'รู้สึกไม่ค่อยสบาย...'],
        happy: dog ? ['วันนี้มีความสุขที่สุดเลย! โฮ่ง!'] : ['อารมณ์ดีจัง เหมียว~']
      }[emotion.key];
      return lines ? Phaser.Utils.Array.GetRandom(lines) : null;
    }
  };

  PetGame.EmotionAI = EmotionAI;
})();
