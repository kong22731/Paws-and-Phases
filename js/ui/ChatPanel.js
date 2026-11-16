/*
 * ChatPanel.js — แผงแชทด้านขวาของเกม (HTML) เชื่อมกับ GameScene และ PetChatbot
 *  - ปุ่มไมค์: พูดภาษาไทยแล้วแปลงเป็นข้อความ (Web Speech API ใช้ได้ใน Chrome/Edge)
 *  - ปุ่ม 😁: แผงอีโมจิ, ปุ่มเมนูมุมขวาบน: ประโยคลัด
 */
window.PetGame = window.PetGame || {};

(function () {
  const $ = (id) => document.getElementById(id);

  class ChatPanel {
    constructor() {
      this.screen = $('chat-screen');
      this.log = $('cs-log');
      this.input = $('cs-input');
      this.mic = $('cs-mic');
      this.scene = null;
      this.unread = 0;
      this.showMeta = true; // แสดง intent/อารมณ์ที่ AI ตรวจจับได้ใต้ข้อความ (มีประโยชน์ตอนนำเสนอ)
      this.avatarCache = {};

      $('cs-form').addEventListener('submit', (e) => { e.preventDefault(); this.send(this.input.value); });
      $('cs-menu').addEventListener('click', () => this.toggleTray('cs-chips'));
      $('cs-emoji').addEventListener('click', () => this.toggleTray('cs-emojis'));
      document.querySelectorAll('#cs-chips button').forEach((b) => b.addEventListener('click', () => this.send(b.dataset.say)));
      document.querySelectorAll('#cs-emojis button').forEach((b) => b.addEventListener('click', () => {
        this.input.value += b.textContent;
        this.input.dispatchEvent(new Event('input'));
        this.input.focus();
      }));
      this.input.addEventListener('input', () => this.mic.classList.toggle('has-text', this.input.value.trim() !== ''));
      this.input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') this.close(); });
      this.mic.addEventListener('click', () => {
        if (this.input.value.trim()) this.send(this.input.value);
        else this.listen();
      });
    }

    // ---------- เชื่อม/ตัดการเชื่อมกับหน้าเลี้ยง ----------
    // แผงแชทแสดงอยู่ด้านขวาตลอด แต่จะพิมพ์ได้เฉพาะตอนอยู่ในหน้าเลี้ยง (GameScene)
    attach(scene) {
      this.scene = scene;
      this.unread = 0;
      this.log.innerHTML = '';
      this.screen.classList.remove('disabled');
      this.input.disabled = false;
      this.refreshHeader();
      this.system(`Chat with ${scene.pet.name}! (น้องคุยภาษาไทยได้นะ)`);
    }
    detach() {
      this.close();
      this.scene = null;
      this.log.innerHTML = '';
      this.input.value = '';
      this.input.disabled = true;
      this.mic.classList.remove('has-text');
      this.screen.classList.add('disabled');
      $('cs-name').textContent = 'Pet Chat';
      $('cs-sub').textContent = 'Start a game to chat';
      $('cs-avatar-img').removeAttribute('src');
      $('cs-mood').textContent = '🙂';
    }

    // ปุ่มแชทในเกม: โฟกัสช่องพิมพ์ + กระพริบกรอบให้เห็นว่าแชทอยู่ตรงไหน
    open() {
      if (!this.scene) return;
      this.refreshHeader();
      this.unread = 0;
      this.log.scrollTop = this.log.scrollHeight;
      this.screen.classList.remove('flash');
      void this.screen.offsetWidth;
      this.screen.classList.add('flash');
      setTimeout(() => this.input.focus(), 50);
    }
    // ปิดแผงประโยคลัด/อีโมจิ และหยุดไมค์ (แผงแชทยังแสดงอยู่)
    close() {
      this.stopListening();
      ['cs-chips', 'cs-emojis'].forEach((id) => { $(id).hidden = true; });
    }
    isOpen() { return !!this.scene; }

    toggleTray(id) {
      const el = $(id);
      const show = el.hidden;
      ['cs-chips', 'cs-emojis'].forEach((t) => { $(t).hidden = true; });
      el.hidden = !show;
    }

    // ---------- ส่วนหัว ----------
    avatarURL() {
      const key = this.scene.pet.portraitKey();
      if (!this.avatarCache[key]) {
        const src = PetGame.game.textures.get(key).getSourceImage();
        this.avatarCache[key] = src.toDataURL ? src.toDataURL() : src.src;
      }
      return this.avatarCache[key];
    }
    refreshHeader() {
      if (!this.scene) return;
      const pet = this.scene.pet;
      $('cs-name').textContent = pet.name;
      $('cs-sub').textContent = `${pet.formName()} · Stage ${pet.stage}`;
      $('cs-avatar-img').src = this.avatarURL();
    }
    setMood(emotion) { $('cs-mood').textContent = emotion.emoji; }

    // ---------- ข้อความ ----------
    send(text) {
      text = (text || '').trim();
      if (!text || !this.scene) return;
      this.input.value = '';
      this.mic.classList.remove('has-text');
      ['cs-chips', 'cs-emojis'].forEach((id) => { $(id).hidden = true; });
      this.add('user', text);
      PetGame.Sound.play('send');

      const ctx = this.scene.getAIContext();
      const res = PetGame.PetChatbot.reply(text, ctx);
      this.scene.onChat(res);
      const typing = this.add('pet', '• • •');
      typing.classList.add('typing');
      setTimeout(() => {
        typing.remove();
        PetGame.Sound.play('chat');
        this.add('pet', res.text, this.showMeta ? `intent: ${res.intent} · mood: ${ctx.emotion.key}` : null);
      }, 600);
    }

    petSays(text) {
      this.add('pet', text);
      PetGame.Sound.play('chat');
      if (!this.isOpen()) this.unread += 1;
    }
    system(text) { this.add('system', text); }

    add(who, text, meta) {
      const row = document.createElement('div');
      row.className = `msg ${who}`;
      if (who === 'system') {
        row.textContent = text;
      } else {
        if (who === 'pet' && this.scene) {
          const img = document.createElement('img');
          img.src = this.avatarURL();
          img.alt = '';
          row.appendChild(img);
        }
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = text;
        if (meta) {
          const m = document.createElement('span');
          m.className = 'meta';
          m.textContent = meta;
          bubble.appendChild(m);
        }
        row.appendChild(bubble);
      }
      this.log.appendChild(row);
      this.log.scrollTop = this.log.scrollHeight;
      return row;
    }

    // ---------- พูดด้วยเสียง (ภาษาไทย) ----------
    listen() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { this.system('Voice input is not supported in this browser (try Chrome or Edge).'); return; }
      if (this.recog) { this.stopListening(); return; }
      const r = new SR();
      r.lang = 'th-TH';
      r.interimResults = true;
      r.onresult = (e) => {
        const t = Array.from(e.results).map((x) => x[0].transcript).join('');
        this.input.value = t;
        if (e.results[e.results.length - 1].isFinal) this.send(t);
      };
      r.onerror = (e) => { if (e.error !== 'aborted') this.system(`Voice error: ${e.error}`); };
      r.onend = () => this.stopListening();
      this.recog = r;
      this.mic.classList.add('listening');
      r.start();
    }
    stopListening() {
      if (this.recog) { try { this.recog.abort(); } catch (e) { /* ignore */ } }
      this.recog = null;
      this.mic.classList.remove('listening');
    }
  }

  PetGame.ChatPanel = ChatPanel;
})();
