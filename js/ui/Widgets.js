/*
 * Widgets.js — ชิ้นส่วน UI ที่ใช้ซ้ำในหลาย Scene (สไตล์ตามดีไซน์ Figma "Paws & Phases")
 */
window.PetGame = window.PetGame || {};

(function () {
  const C = PetGame.Data.COLORS;
  const FONT = PetGame.Data.FONT;
  const TITLE_FONT = PetGame.Data.TITLE_FONT;

  const UI = {
    // ข้อความ (Sniglet + Kanit สำหรับภาษาไทย)
    text(scene, x, y, str, size, color, opts) {
      return scene.add.text(x, y, str, Object.assign({
        fontFamily: FONT, fontSize: size || 20, color: color || C.text
      }, opts || {}));
    },

    // ข้อความสีขาวขอบสี (ตัวหนังสือแบบในดีไซน์)
    outlined(scene, x, y, str, size, stroke, opts) {
      return UI.text(scene, x, y, str, size, '#ffffff', Object.assign({ stroke: stroke || C.tealCss, strokeThickness: Math.max(3, size / 8) }, opts || {}));
    },

    // หัวเรื่องตัวใหญ่ (ฟอนต์ Amarante)
    title(scene, x, y, str, size, color, stroke) {
      return scene.add.text(x, y, str, {
        fontFamily: TITLE_FONT, fontSize: size, color: color || '#ffffff',
        stroke: stroke || C.oliveCss, strokeThickness: Math.max(4, size / 14)
      });
    },

    // กล่องสี่เหลี่ยมมุมมน (ขอบวาดด้านใน เหมือน Figma)
    box(scene, x, y, w, h, o) {
      o = Object.assign({ fill: C.white, alpha: 1, stroke: C.olive, strokeW: 0, radius: 20, shadow: false }, o || {});
      const g = scene.add.graphics();
      if (o.shadow) g.fillStyle(0x000000, 0.25).fillRoundedRect(x + 5, y + 7, w, h, o.radius);
      if (o.fill !== null) g.fillStyle(o.fill, o.alpha).fillRoundedRect(x, y, w, h, o.radius);
      if (o.strokeW) {
        const i = o.strokeW / 2;
        g.lineStyle(o.strokeW, o.stroke, 1).strokeRoundedRect(x + i, y + i, w - o.strokeW, h - o.strokeW, Math.max(0, o.radius - i));
      }
      return g;
    },

    // ทำให้ object กดได้ พร้อมเอฟเฟกต์ย่อขยาย
    clickable(scene, c, w, h, onClick) {
      if (c.type === 'Container') c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.04, duration: 90 }));
      c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 90 }));
      c.on('pointerdown', () => {
        scene.tweens.add({ targets: c, scale: 0.95, duration: 60, yoyo: true });
        if (!c.silent) PetGame.Sound.play('click'); // c.silent = ปุ่มที่มีเสียงเฉพาะของตัวเอง (เช่น การ์ดไอเทม)
        onClick();
      });
      return c;
    },

    // ปุ่มแถบยาวสีมะกอก (เช่น "NEXT ➜") ; o.arrow = ไอคอนลูกศรวงกลมด้านขวา
    bar(scene, x, y, w, h, label, onClick, o) {
      o = Object.assign({ fill: C.oliveMid, stroke: C.olive, strokeW: 5, color: '#ffffff', size: 28, arrow: false, align: 'left', radius: 20 }, o || {});
      const c = scene.add.container(x, y);
      c.add(UI.box(scene, -w / 2, -h / 2, w, h, { fill: o.fill, stroke: o.stroke, strokeW: o.strokeW, radius: o.radius }));
      const tx = o.align === 'left' ? -w / 2 + 24 : 0;
      const t = UI.text(scene, tx, 0, label, o.size, o.color).setOrigin(o.align === 'left' ? 0 : 0.5, 0.5);
      c.add(t);
      if (o.arrow) {
        const s = Math.min(50, h * 0.62);
        c.add(scene.add.image(w / 2 - s / 2 - 16, 0, 'ui_next').setDisplaySize(s * 1.06, s));
      }
      c.label = t;
      return UI.clickable(scene, c, w, h, onClick);
    },

    // ปุ่มสี่เหลี่ยมมุมมนมีไอคอนรูป (แถบขวาของหน้าเลี้ยง: 70x70 ขอบมะกอกเข้ม, ไอคอน 50x50)
    iconButton(scene, x, y, size, icon, onClick, o) {
      o = Object.assign({ fill: C.white, stroke: C.oliveDark, strokeW: 5, radius: 20, iconSize: size * 0.72, iconAlpha: 1 }, o || {});
      const c = scene.add.container(x, y);
      c.add(UI.box(scene, -size / 2, -size / 2, size, size, { fill: o.fill, stroke: o.stroke, strokeW: o.strokeW, radius: o.radius }));
      if (typeof icon === 'string') c.add(scene.add.image(0, 0, 'ui_' + icon).setDisplaySize(o.iconSize, o.iconSize).setAlpha(o.iconAlpha));
      else icon(c);
      return UI.clickable(scene, c, size, size, onClick);
    },

    // รูปไอคอนเฉย ๆ ที่กดได้ (เช่น ปุ่มปิด / ย้อนกลับ)
    imageButton(scene, x, y, key, w, h, onClick) {
      const img = scene.add.image(x, y, 'ui_' + key).setDisplaySize(w, h || w);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerover', () => img.setAlpha(0.85));
      img.on('pointerout', () => img.setAlpha(1));
      img.on('pointerdown', () => { PetGame.Sound.play('click'); onClick(); });
      return img;
    },

    // แถบค่าแบบในดีไซน์: กรอบขาวขอบสี + แถบเติมสีอ่อน ; คืน { set(v) }
    pillMeter(scene, x, y, w, h, o) {
      o = Object.assign({ border: C.teal, borderW: 3, fill: C.tealLight, pad: 3 }, o || {});
      const frame = UI.box(scene, x, y, w, h, { fill: C.white, stroke: o.border, strokeW: o.borderW, radius: h / 2 });
      const g = scene.add.graphics();
      return {
        frame,
        graphics: g, value: -1,
        set(v) {
          v = Math.max(0, Math.min(100, v));
          if (Math.abs(v - this.value) < 0.05) return this;
          this.value = v;
          const iw = w - o.pad * 2, ih = h - o.pad * 2;
          g.clear();
          if (v > 0.5) g.fillStyle(o.fill, 1).fillRoundedRect(x + o.pad, y + o.pad, Math.max(ih, iw * v / 100), ih, ih / 2);
          return this;
        }
      };
    },

    // แถบค่าทั่วไป 0-100 (ใช้ในฉากวิวัฒนาการ)
    meter(scene, x, y, w, h, color, o) {
      o = Object.assign({ bg: 0xffffff, radius: h / 2 }, o || {});
      const g = scene.add.graphics();
      return {
        graphics: g, value: -1,
        set(v) {
          v = Math.max(0, Math.min(100, v));
          if (Math.abs(v - this.value) < 0.05) return this;
          this.value = v;
          g.clear().fillStyle(o.bg, 1).fillRoundedRect(x, y, w, h, o.radius);
          if (v > 0.5) g.fillStyle(color, 1).fillRoundedRect(x, y, Math.max(h, w * v / 100), h, o.radius);
          return this;
        }
      };
    },

    // พื้นหลังมืดสำหรับป๊อปอัป (กดแล้วไม่ทะลุ)
    dim(scene, alpha) {
      const { WIDTH, HEIGHT } = PetGame.Data;
      return scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, alpha === undefined ? 0.4 : alpha).setInteractive();
    },

    // กล่องยืนยันในเกม (ใช้แทน window.confirm ซึ่งบางเบราว์เซอร์/หน้าต่างฝังจะบล็อกไว้เงียบ ๆ)
    confirm(scene, message, onYes, o) {
      o = Object.assign({ yes: 'YES', no: 'NO' }, o || {});
      const { WIDTH: W, HEIGHT: H } = PetGame.Data;
      const layer = scene.add.container(0, 0).setDepth(1000);
      const close = () => layer.destroy();
      layer.add(UI.dim(scene, 0.45));
      layer.add(UI.box(scene, W / 2 - 230, H / 2 - 120, 460, 240, { fill: C.olivePale, stroke: C.olive, strokeW: 8, radius: 20 }));
      // message = ข้อความหลัก (ขึ้นบรรทัดใหม่ด้วย \n เอง) ; o.question = คำถามตัวหนาตัวใหญ่ด้านล่าง
      const my = o.question ? H / 2 - 58 : H / 2 - 40;
      layer.add(UI.text(scene, W / 2, my, message, 20, '#3f4122', { align: 'center', lineSpacing: 4 }).setOrigin(0.5));
      if (o.question) layer.add(UI.text(scene, W / 2, H / 2 - 2, o.question, 27, '#3f4122', { fontStyle: 'bold' }).setOrigin(0.5));
      // o.onNo = ทำอะไรต่อเมื่อกด NO (ไม่ใส่ = แค่ปิด) ; o.closable = มีปุ่ม X ไว้ยกเลิก
      layer.add(UI.bar(scene, W / 2 - 95, H / 2 + 60, 160, 56, o.no, () => { close(); if (o.onNo) o.onNo(); }, { align: 'center', size: o.no.length > 7 ? 19 : 24 }));
      layer.add(UI.bar(scene, W / 2 + 95, H / 2 + 60, 160, 56, o.yes, () => { close(); onYes(); }, { fill: C.olive, align: 'center', size: o.yes.length > 7 ? 19 : 24 }));
      if (o.closable) layer.add(UI.imageButton(scene, W / 2 - 198, H / 2 - 88, 'close', 34, 34, close));
      return layer;
    },

    // ป๊อปอัปสีฟ้า (Hint / Profile): กรอบ 452x388 + ปุ่มปิด + ป้ายหัวเรื่อง ; คืน container
    tealPopup(scene, title, onClose) {
      const C2 = C;
      UI.dim(scene, 0.4).on('pointerdown', onClose);
      const g = UI.box(scene, 254, 106, 452, 388, { fill: C2.tealPale, stroke: C2.teal, strokeW: 10, radius: 20 });
      g.setInteractive(new Phaser.Geom.Rectangle(254, 106, 452, 388), Phaser.Geom.Rectangle.Contains); // กันกดทะลุ
      UI.imageButton(scene, 292, 147, 'close_teal', 40, 40, onClose);
      UI.box(scene, 326, 133, 354, 30, { fill: C2.tealLight, radius: 15 });
      UI.outlined(scene, 503, 148, title, 20).setOrigin(0.5);
    },

    // กล่องขาวขอบสีมีเงา (ภายในป๊อปอัป)
    card(scene, x, y, w, h, border, o) {
      return UI.box(scene, x, y, w, h, Object.assign({ fill: C.white, stroke: border || C.teal, strokeW: 5, radius: 10, shadow: true }, o || {}));
    },

    // แถวค่าสถานะ 4 แถว (ไอคอน + แถบ + ตัวเลข) ตามดีไซน์ Hint/Profile ; top = y ของแถวแรก
    statRows(scene, pet, top) {
      const D = PetGame.Data;
      D.STAT_ORDER.forEach((k, i) => {
        const y = top + i * 30.7;
        scene.add.image(305, y + 10, 'ui_' + D.STAT_INFO[k].img + '_teal').setDisplaySize(25, 25);
        UI.pillMeter(scene, 326, y, 305, 21).set(pet.stats[k]);
        UI.outlined(scene, 641, y + 1, String(Math.round(pet.stats[k])), 16);
      });
    }
  };

  PetGame.UI = UI;
})();
