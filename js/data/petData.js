/*
 * petData.js — ข้อมูลตั้งค่าเกมทั้งหมด (แก้ตัวเลข/ข้อความตรงนี้เพื่อปรับเกม)
 */
window.PetGame = window.PetGame || {};

PetGame.Data = {
  // ---------- ขนาดจอเกม (แนวนอน 16:10) แชทบอทเป็นแผง HTML กว้าง 330px อยู่ด้านขวา ----------
  WIDTH: 960,
  HEIGHT: 600,

  // ---------- โทนสีตามดีไซน์ Figma "Paws & Phases" ----------
  COLORS: {
    white: 0xffffff,
    // ฟ้าเทอร์ควอยซ์ (หน้าเลี้ยง / Hint / Profile)
    teal: 0x20a6b5,       tealCss: '#20a6b5',
    tealLight: 0x8ee8f2,  tealLightCss: '#8ee8f2',
    tealPale: 0xd9fbff,   dayBg: 0x94e2ea,
    // เขียวมะกอก (ปุ่ม / Evolution Book / เลือกสัตว์)
    oliveDark: 0x5d5f33,  oliveDarkCss: '#5d5f33',
    olive: 0x7a7d47,      oliveCss: '#7a7d47',
    oliveMid: 0xb2b579,   oliveMidCss: '#b2b579',
    olivePale: 0xeeefd0,  oliveTitleCss: '#d0d48b',
    // แถบความผูกพัน
    bondBorder: 0xb887c2, bondFill: 0xf4c9ee, bondCss: '#b887c2',
    // สีกล่องค่าสถานะ (มาก / กลาง / น้อย)
    statHigh: 0x63b51f, statMid: 0xfabb1e, statLow: 0xce2424,
    text: '#1f1f1f'
  },
  // ฟอนต์ (Google Fonts) — Sniglet ไม่มีภาษาไทย จึงต่อท้ายด้วย Kanit ให้แสดงภาษาไทยได้
  FONT: 'Sniglet, Kanit',
  TITLE_FONT: 'Amarante, Kanit',

  // ---------- ไฟล์ภาพหลัก ----------
  ASSET_FILES: {
    cover: null,                // ภาพหน้าปก (ยังไม่มี) เช่น 'assets/cover.webp' ; null = ใช้พื้นหลัง + หมาแมว starter
    bg_park: 'assets/bg3.jpg',  // พื้นหลังหน้าเลี้ยง (สวนหลังบ้าน)
    bg_choose: 'assets/bg2.jpg' // พื้นหลังหน้าเลือกสัตว์ (ทุ่งดอกไม้)
  },
  BG_INSET: 0, // ตัดขอบภาพพื้นหลังออกกี่พิกเซล

  // ไอคอนจาก Figma (assets/ui/<ชื่อ>.png) และรูปใหญ่ที่ย่อแล้ว (assets/sprites/ui/<ชื่อ>.png)
  UI_ICONS: ['menu', 'book', 'restart', 'grooming', 'next', 'close', 'close_teal', 'back', 'hint', 'prev_big', 'next_big',
    'food', 'bath', 'happy', 'energy', 'bond', 'food_teal', 'bath_teal', 'happy_teal', 'energy_teal'],
  UI_IMAGES: ['cat_feed', 'cat_play', 'cat_care', 'cat_rest', 'dog_sleeping'],
  // รูปหน้าปก (assets/sprites/cover/<ชื่อ>.png สร้างจาก assets/Game cover items ด้วย tools/make-sprites.ps1)
  COVER_IMAGES: ['bg', 'logo', 'sign', 'flowers', 'mushroom', 'icon_hand', 'icon_mouse', 'bone', 'peek',
    'badge1', 'badge2', 'badge3', 'badge4', 'badge5', 'badge6', 'badge7'],

  // ภาพตัวละคร: สร้างจากรูปต้นฉบับใน assets/ ด้วย tools/make-sprites.ps1
  //   assets/sprites/body/<key>.png      ตัวเต็ม (พื้นใส)
  //   assets/sprites/portrait/<key>.png  รูปหัว (เกมตัดเป็นวงกลม)
  //   key = dog_baby, dog_playful_2 ... cat_leader_5 (รายการอยู่ใน assets/sprites/manifest.js)
  SPRITE_DIR: 'assets/sprites',

  // ---------- สถานะของสัตว์ (0-100) ----------
  STATS: ['fullness', 'happiness', 'health', 'energy'],
  // icon = อีโมจิ (ใช้ในข้อความ), img = ไอคอนจาก Figma ; health แสดงเป็น "ความสะอาด/สุขภาพ" (ไอคอนอ่างอาบน้ำ)
  STAT_INFO: {
    fullness:  { label: 'Fullness',  icon: '🍔', img: 'food',   color: 0x5bbf4a },
    health:    { label: 'Clean',     icon: '🛁', img: 'bath',   color: 0x6a3df0 },
    happiness: { label: 'Happiness', icon: '😊', img: 'happy',  color: 0xe8336b },
    energy:    { label: 'Energy',    icon: '⚡', img: 'energy', color: 0xf5c400 }
  },
  STAT_ORDER: ['fullness', 'health', 'happiness', 'energy'], // ลำดับกล่องค่าสถานะ (บนลงล่าง) ตามดีไซน์

  // ค่าลดลงต่อวินาที (ที่ความเร็วเกม x1)
  DECAY: {
    fullness: 0.20,
    happiness: 0.13,
    health: 0.15,
    energy: 0.10,
    hungryHealthPenalty: 0.15,
    lonelyHappinessPenalty: 0.10,
    lonelyAfter: 60,
    sleepEnergyGain: 0.8,
    sleepFullnessDecay: 0.10
  },

  // ---------- เมนู Grooming: 4 หมวด และไอเทมในแต่ละหมวด ----------
  // หมวด (key) = หมวดพฤติกรรมที่ใช้คำนวณสายวิวัฒนาการ: feed / play / care / rest
  // สีการ์ดตามดีไซน์ ; img = รูปไอคอนหมวด (assets/sprites/ui)
  CATEGORIES: [
    { key: 'feed', label: 'Feed', img: 'cat_feed', fill: 0xe4b840, fillAlpha: 0.71, border: 0xe28e6a, text: '#8f5e26' },
    { key: 'play', label: 'Play', img: 'cat_play', fill: 0xfcbcff, fillAlpha: 1, border: 0xdf3e97, text: '#9e0d08' },
    { key: 'care', label: 'Care', img: 'cat_care', fill: 0x7edcfe, fillAlpha: 1, border: 0x4693eb, text: '#4263ce' },
    { key: 'rest', label: 'Rest', img: 'cat_rest', fill: 0xc9a3f9, fillAlpha: 1, border: 0x7f3fff, text: '#754fcd' }
  ],
  // ไอเทม: file = ชื่อไฟล์ใน assets/Grooming Items/<หมวด>/ (ไม่ต้องใส่นามสกุล)
  // fx = ผลต่อค่าสถานะ (ตัวเลขชั่วคราว — ปรับตามเงื่อนไขงานได้ที่นี่)
  // ลำดับในรายการ = ลำดับการ์ด (แถวละ 4 ใบ เลื่อนลงดูแถวถัดไป)
  ITEMS: {
    feed: [
      { key: 'chicken', label: 'Chicken Leg', file: '3c489cdb-50b3-4e9e-8544-ee876917dde9', fx: { fullness: 25, happiness: 5 } },
      { key: 'dogfood', label: 'Pet Food',    file: 'dab57c89-a6a9-441e-9b4f-82628ff279e0', fx: { fullness: 30, health: 2 } },
      { key: 'salmon',  label: 'Salmon',      file: 'c485b118-1381-4554-a5fd-87f4c8df074b', fx: { fullness: 22, health: 6 } },
      { key: 'veggies', label: 'Veggies',     file: 'e16488d5-66e8-4289-b642-1ebdcea08507', fx: { fullness: 15, health: 8 } },
      { key: 'bone',    label: 'Bone Treat',  file: '11f4d024-844d-4bf1-99a6-a64a2969c6a9', fx: { fullness: 8, happiness: 10 } },
      { key: 'fish',    label: 'Fish',        file: '293329de-b93b-4fae-b382-951248b23b0e', fx: { fullness: 20, health: 4 } },
      { key: 'cake',    label: 'Cake',        file: 'e56b4fbd-e590-4626-b5f6-e56e085f3ff2', fx: { fullness: 12, happiness: 15, health: -4 } },
      { key: 'canned',  label: 'Canned Food', file: 'ea53093a-552b-400a-942c-a5b1f2f015dd', fx: { fullness: 28 } }
    ],
    play: [
      { key: 'chewbone', label: 'Chew Toy',     file: '327350f9-8051-4939-9f3e-e3d0eaecbc35', fx: { happiness: 15, energy: -8 } },
      { key: 'feather',  label: 'Feather Wand', file: '72a92ee4-1e96-42a8-9dce-0c162f061c31', fx: { happiness: 20, energy: -12 } },
      { key: 'mouse',    label: 'Toy Mouse',    file: '04fac8fc-4002-418a-a8d8-e8a9cf68621c', fx: { happiness: 16, energy: -8 } },
      { key: 'ring',     label: 'Paw Ring',     file: '0b7d3dcf-3b99-44f7-b61e-3217cb67357a', fx: { happiness: 18, energy: -10 } },
      { key: 'teddy',    label: 'Teddy Bear',   file: '0cccd6a9-33f5-4d18-8e45-e90efc7369dc', fx: { happiness: 12, energy: -4 } },
      { key: 'yarn',     label: 'Yarn Ball',    file: '4fd8e873-886d-45ca-9e94-d6bca8a84e26', fx: { happiness: 18, energy: -10 } },
      { key: 'ball',     label: 'Tennis Ball',  file: '9f9ebcda-60dc-4ddc-99b8-8990ad116c93', fx: { happiness: 25, energy: -15, fullness: -6 } },
      { key: 'tower',    label: 'Cat Tower',    file: 'e686b64e-92aa-42d0-858a-5cbb8100d642', fx: { happiness: 22, energy: -14 } }
    ],
    care: [
      { key: 'soap',        label: 'Soap',        file: 'fe631855-7691-40a0-9a07-b8947bd432c5', fx: { health: 25, happiness: 2 } },
      { key: 'brush',       label: 'Brush',       file: '06f05f68-d37c-4306-829b-3d603bcdd519', fx: { health: 12, happiness: 6 } },
      { key: 'conditioner', label: 'Conditioner', file: 'a074537e-af52-40e9-ae63-c67263471f30', fx: { health: 15 } },
      { key: 'toothbrush',  label: 'Toothbrush',  file: '3e91d913-d791-4d9f-ace7-c5d980703413', fx: { health: 10 } },
      { key: 'shampoo',     label: 'Shampoo',     file: '9ad7bb54-d47a-467d-bfcd-098196da5894', fx: { health: 28 } },
      { key: 'towel',       label: 'Towel',       file: 'ec5aa4c4-f4da-473a-9055-17c30aadcec5', fx: { health: 8, happiness: 4 } },
      { key: 'vitamins',    label: 'Vitamins',    file: '522bb730-d8a4-473c-8e1f-56f77d8560d1', fx: { health: 20 } },
      { key: 'cream',       label: 'Cream',       file: 'fcea3bfa-00fc-44a1-9921-0d35c3040386', fx: { health: 14 } }
    ],
    // พักผ่อน: nap = งีบ (หลับตามเวลา NAP_SECONDS), sleep = หลับจนกว่าจะกดปลุกที่ปุ่มเดิม (หรือขึ้นวันใหม่)
    rest: [
      { key: 'nap',   label: 'Nap',   file: 'Nap',   sub: '(30 sec)',       fx: {} },
      { key: 'sleep', label: 'Sleep', file: 'Sleep', sub: '(Until woken up)', fx: {} }
    ]
  },
  NAP_SECONDS: 30,
  // หมวดการดูแล -> ค่าสถานะที่ใช้วัด "ความต้องการ"
  CARE_STAT: { feed: 'fullness', play: 'happiness', care: 'health', rest: 'energy' },
  // คำแนะนำของ AI -> ไอเทมที่ไฮไลต์ในเมนู Grooming
  CARE_TARGET: {
    feed: { item: 'dogfood' },
    play: { item: 'ball' },
    care: { item: 'shampoo' },
    rest: { item: 'nap' }
  },
  HINT_FROM_STAGE: 3, // ปุ่ม Hint (หลอดไฟ) ขึ้นเมื่อบรรลุร่างที่ 3 ของสายนั้น (บอกวิธีไปร่าง 4 และ 5)
  ACTION_COOLDOWN_MS: 1000,

  // ---------- การเติบโต ----------
  // ---------- ระบบวัน + วิวัฒนาการ (ตาม Evolution Line.pdf) ----------
  // ร่างที่ 1 = Starter, ร่างที่ 2-5 = ตามสายวิวัฒนาการ
  // ทุกครั้งที่ขึ้นวันใหม่: ร่าง 1 -> ทำเป้าสายไหนได้ ขึ้นร่าง 2 ของสายนั้น
  //                       ร่าง 2-4 -> ทำเป้าสายเดิมได้ ขึ้น 1 ขั้น / ไม่ได้ ลด 1 ขั้น (Regression)
  //                       ร่าง 5 (สูงสุด) -> คงร่างไว้ ไม่ลดขั้นอีก ต้องกด Rebirth เพื่อเริ่มใหม่
  MAX_STAGE: 5,
  // ลดร่างไม่ใช่ทันทีที่พลาด 1 วัน: ต้องพลาดเป้า "ติดกัน" ตามจำนวนวันนี้ก่อน (ร่างสูง = ใช้เวลาสร้างนานกว่า จึงทนได้นานกว่า)
  //   วันที่ "เกือบถึงเป้า" (ผ่านเกณฑ์แบบง่าย) = คงร่าง ไม่นับเป็นวันที่พลาด
  REGRESS_AFTER: { 2: 2, 3: 2, 4: 3 },
  // 1 วัน = กี่วินาที (เวลาในเกม) — ตั้งได้ที่เมนู Day Length (3/5/7/10 นาที, ค่าเริ่มต้น 3) ดู js/systems/Settings.js
  // หมดวันแล้วปุ่ม NEXT DAY จะขึ้น ดูแลสัตว์ไม่ได้ และค่าสถานะหยุดนิ่ง
  get DAY_SECONDS() { return ((PetGame.settings && PetGame.settings.dayMinutes) || 3) * 60; },
  // ไฟล์เสียง (เสียงเอฟเฟกต์สร้างด้วยโค้ดใน js/systems/Sound.js)
  SOUND_FILES: {
    bgm: 'assets/game sound/fassounds-cute-cute-music-549927.mp3'
  },
  MUSIC_VOLUME: 0.1,  // เพลงพื้นหลังเบา ๆ ให้ได้ยินเสียงเอฟเฟกต์ชัด
  SFX_VOLUME: 0.6,
  SPEEDS: [1, 2, 5, 10],     // ตัวเลือกเร่งเวลาในเมนู
  REST_PER_SEC: 0.06,        // แต้ม Rest ที่ได้ต่อวินาทีระหว่างงีบ/นอน (นอกเหนือจากแต้มตอนกดปุ่ม)
  SOCIAL_PER_CHAT: 3,        // ค่า Social (แถบสีชมพู) เพิ่มต่อการคุย 1 ครั้ง
  SOCIAL_DAILY_DECAY: 8,     // ถ้าทั้งวันไม่คุยกันเลย ค่า Social ลดลงเท่านี้ตอนขึ้นวันใหม่
  STAGE_LABELS: ['Starter', 'Junior', 'Teen', 'Adult', 'Ultimate'],

  // ---------- สายวิวัฒนาการ (ตาม Character Name.pdf) ----------
  // ลำดับตรงนี้ = ลำดับแถวใน Evolution Book ; hidden = สายลับ (ซ่อนชื่อจนกว่าจะปลดล็อก)
  LINES: {
    sleepy:   { label: 'Sleepy',    icon: '💤', color: 0x7c5cd6, css: '#7c5cd6', desc: 'Rests and naps the most' },
    gluttony: { label: 'Gluttony',  icon: '🐷', color: 0xe8873a, css: '#e8873a', desc: 'Eats the most' },
    neglect:  { label: 'Neglect',   icon: '👽', color: 0x6b7280, css: '#6b7280', desc: 'Left hungry, dirty and alone' },
    selfcare: { label: 'Self-Care', icon: '🧼', color: 0x22a6b3, css: '#22a6b3', desc: 'Bathed and cared for the most' },
    playful:  { label: 'Playful',   icon: '🏋️', color: 0xe0533a, css: '#e0533a', desc: 'Plays and exercises the most' },
    royal:    { label: 'Royal',     icon: '👑', color: 0xd4a106, css: '#d4a106', desc: 'Perfect care in every way' },
    leader:   { label: 'Leader',    icon: '🎩', color: 0x2f3e75, css: '#2f3e75', desc: 'Perfect care + lots of talking (hidden)', hidden: true }
  },

  // ชื่อร่าง [ร่าง1, ร่าง2, ร่าง3, ร่าง4, ร่าง5] — หมาและแมวใช้ชื่อเดียวกัน
  FORM_NAMES: (function () {
    const names = {
      baby:     'Newborn',
      sleepy:   ['Newborn', 'Drowsy Hatchling', 'Coiling Cub', 'Mystic Serpent-Form', 'Celestial Dragon Form'],
      gluttony: ['Newborn', 'Chubby Eater', 'Gluttonous Form', 'Insatiable Beast', 'Demon Lord of Gluttony'],
      neglect:  ['Newborn', 'Neglected Stalker', 'Emaciated Mutant', 'Hybrid Alien-Beast', 'Apex Alien Entity'],
      selfcare: ['Newborn', 'Hygiene Learner', 'Bubble-Kissed Form', 'Lathering Form', 'Pure Soap Sovereign'],
      playful:  ['Newborn', 'Energetic Rookie', 'Fledgling Brawler', 'Powerhouse Beast', 'Apex Muscle Icon'],
      royal:    ['Newborn', 'Dapper Noble', 'Royal Heir', 'Regal Aristocrat', 'Sovereign Monarch'],
      leader:   ['Newborn', 'Agent Trainee', 'Elite Strategist', 'Prominent Statesman', 'Prime Minister Icon']
    };
    return { dog: names, cat: names };
  })(),

  // ---------- คำแนะนำ / ค่าที่แนะนำ / คำอธิบายร่าง ของแต่ละสาย ----------
  // tip     = วิธีไปร่างถัดไป (แสดงใน Hint ตั้งแต่ร่าง 3)
  // targets = ระดับที่แนะนำของแต่ละด้าน 0-100 (แถบใน Hint) ; social = ต้องคุยบ่อยไหม
  // forms   = คำอธิบายร่าง 2-5 (แสดงใน Evolution Book หน้า 2)
  BABY_DESC: 'A newborn starter full of potential. How it grows depends on how you raise it every day.',
  LINE_GUIDE: {
    sleepy: {
      tip: 'Let your pet sleep and rest only. Never wake it up for activities, and don\'t let it play much.',
      targets: { fullness: 10, health: 10, happiness: 10, energy: 90 },
      forms: [
        'Always yawning and curling up for naps. Tiny scales begin to appear.',
        'Its body grows long and coils like a little snake while it dreams.',
        'A graceful serpent glowing with calm, sleepy magic.',
        'The ultimate rest master — a celestial dragon king floating on the clouds.'
      ]
    },
    gluttony: {
      tip: 'Feed it and nothing else — stuff every meal! But never take it to play or clean it.',
      targets: { fullness: 90, health: 10, happiness: 10, energy: 40 },
      forms: [
        'Round cheeks and a growing belly. It thinks about snacks all day.',
        'So plump it can barely move, yet it is still hungry.',
        'An endless appetite with fearsome fangs. Its face is getting scary...',
        'The final glutton — a horned demon lord of endless feasts.'
      ]
    },
    neglect: {
      tip: 'Lazy mode: leave it alone and don\'t press anything. Just let time pass.',
      targets: { fullness: 5, health: 5, happiness: 5, energy: 5 },
      forms: [
        'Thin and lonely, it lurks in the shadows waiting for someone.',
        'Skinny and strange — something about it is changing...',
        'Barely recognizable anymore, with alien-like features.',
        'The final form of neglect — a gaunt, ghostly alien being.'
      ]
    },
    selfcare: {
      tip: 'Clean freak! Only scrub it and keep it clean. No playing and no snacking.',
      targets: { fullness: 10, health: 90, happiness: 10, energy: 40 },
      forms: [
        'Loves bath time and always smells fresh.',
        'Covered in sparkling soap bubbles and getting whiter every day.',
        'So clean that it foams and lathers like soap.',
        'The cleanest creature of all — it has become living soap!'
      ]
    },
    playful: {
      tip: 'Fitness mode: lots of exercise and hard play every day. Skip the food and the grooming.',
      targets: { fullness: 10, health: 10, happiness: 90, energy: 40 },
      forms: [
        'Can\'t sit still — always ready to run and jump.',
        'Muscles start to show from all that exercise.',
        'Strong, fit and bursting with energy.',
        'A champion bodybuilder standing proudly on two legs!'
      ]
    },
    royal: {
      tip: 'Perfect balance: care, play, feed and rest evenly every single day. Nothing too much, nothing too little.',
      targets: { fullness: 50, health: 50, happiness: 50, energy: 50 },
      forms: [
        'Neat and elegant, with a first touch of gold.',
        'Golden fur and royal manners.',
        'Dressed in royal robes and shining with gold.',
        'A crowned prince or princess — the master of perfect balance.'
      ]
    },
    leader: {
      tip: 'Exactly like perfect balance, but you must also chat with your pet a lot every day. Missing either one won\'t work!',
      targets: { fullness: 50, health: 50, happiness: 50, energy: 50 },
      social: true,
      forms: [
        'Smart and sociable, always eager to talk with everyone.',
        'Wears glasses and plans everything carefully.',
        'A sharp-suited leader that everyone listens to.',
        'The great leader, standing tall and proud on two legs!'
      ]
    }
  },

  // ชื่อสายเดิม (เซฟเก่า) -> สายใหม่
  LEGACY_LINES: { beauty: 'selfcare', strong: 'gluttony', balanced: 'royal' }
};
