/*
 * Settings.js — การตั้งค่าของผู้เล่น (บันทึกใน localStorage แยกจากเซฟสัตว์)
 *   dayMinutes = ความยาว 1 วันในเกม (3 / 5 / 7 / 10 นาที, ค่าเริ่มต้น 3)
 *   music / sfx = เปิด-ปิดเพลงพื้นหลัง / เสียงเอฟเฟกต์
 */
window.PetGame = window.PetGame || {};

(function () {
  const KEY = 'lovelyPetEvolutions.settings';
  // handSensitivity = 'normal' | 'easy' ; dwell = ชี้ค้างบนปุ่มเพื่อกด ; handTutorialDone = เคยดูหน้าสอนเล่นด้วยมือแล้ว
  const DEFAULTS = { dayMinutes: 3, music: true, sfx: true, handSensitivity: 'normal', dwell: true, handTutorialDone: false };
  const DAY_OPTIONS = [3, 5, 7, 10];

  let s = Object.assign({}, DEFAULTS);
  try { Object.assign(s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
  if (!DAY_OPTIONS.includes(s.dayMinutes)) s.dayMinutes = DEFAULTS.dayMinutes;

  PetGame.settings = s;
  PetGame.Settings = {
    DAY_OPTIONS,
    save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } },
    set(key, value) { s[key] = value; this.save(); },
    // วนไปตัวเลือกถัดไป (3 -> 5 -> 7 -> 10 -> 3)
    nextDayLength() {
      s.dayMinutes = DAY_OPTIONS[(DAY_OPTIONS.indexOf(s.dayMinutes) + 1) % DAY_OPTIONS.length];
      this.save();
      return s.dayMinutes;
    }
  };
})();
