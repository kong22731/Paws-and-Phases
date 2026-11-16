/*
 * CareAdvisor.js — 1.3 Smart Care Recommendation
 * คำนวณ "คะแนนความเร่งด่วน" ของแต่ละความต้องการ แล้วเลือกคำแนะนำที่สำคัญที่สุด
 * ใช้ค่ายกกำลังสอง เพื่อให้ค่าที่ต่ำมาก ๆ เร่งด่วนกว่าค่าที่ต่ำนิดหน่อยอย่างชัดเจน
 */
window.PetGame = window.PetGame || {};

(function () {
  const WEIGHTS = { feed: 1.25, care: 1.3, play: 1.0, rest: 1.1 };

  const CareAdvisor = {
    WEIGHTS,

    urgency(pet) {
      const s = pet.stats;
      const sq = (v) => Math.pow((100 - v) / 100, 2) * 100;
      const lonely = Math.max(0, pet.secondsSinceInteraction() - 45) * 0.4;

      const scores = {
        feed: s.fullness > 90 ? 0 : sq(s.fullness) * WEIGHTS.feed,
        care: sq(s.health) * WEIGHTS.care,
        play: sq(s.happiness) * WEIGHTS.play + lonely,
        rest: s.energy > 85 ? 0 : sq(s.energy) * WEIGHTS.rest
      };
      if (s.energy < 15) scores.play *= 0.2; // เหนื่อยมากเล่นไม่ได้ -> ให้พักก่อน
      return scores;
    },

    // คืนค่า { action|null, item|null, text, scores, ranking }
    recommend(pet, emotion) {
      const name = pet.name;
      const scores = this.urgency(pet);
      const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
      const top = ranking[0];
      const out = (action, text) => ({
        action, text, scores, ranking,
        item: action ? this.itemFor(action, pet) : null
      });

      if (pet.sleeping) {
        if (scores.feed > 45) return out('rest', `${name} is asleep but very hungry. Wake up and feed.`);
        return out(null, `Let ${name} sleep until fully rested.`);
      }
      if (scores[top] < 12) return out(null, `${name} is doing great! Try chatting together.`);

      const strong = {
        feed: `${name} is hungry. Feed before doing anything else.`,
        care: `${name} feels sick or dirty. Give a bath.`,
        play: emotion && emotion.key === 'lonely' ? `${name} feels lonely. Play together!` : `${name} wants some fun. Let's play!`,
        rest: `${name} is out of energy. Time for a nap.`
      };
      if (pet.stats.energy < 15 && scores.play > scores.rest * 0.8) strong.rest = `${name} wants to play but is too tired. Rest first.`;
      if (top === 'care' && pet.stats.health < 30) strong.care = `${name} is quite sick. Give vitamins.`;

      const mild = {
        feed: `${name} will be hungry soon. A snack would be nice.`,
        care: `Time for a little grooming.`,
        play: `${name} would like to play a bit more.`,
        rest: `${name} is getting a little tired.`
      };
      return out(top, scores[top] < 30 ? mild[top] : strong[top]);
    },

    // ไอเทมที่ควรใช้สำหรับคำแนะนำนั้น
    itemFor(action, pet) {
      const t = PetGame.Data.CARE_TARGET[action];
      if (action === 'care' && pet.stats.health < 30) return 'vitamins';
      if (action === 'feed' && pet.stats.fullness > 70) return 'bone';
      return t.item;
    }
  };

  PetGame.CareAdvisor = CareAdvisor;
})();
