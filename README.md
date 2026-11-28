# Paws & Phases — ระบบเกมเลี้ยงสัตว์เสมือนจริงอัจฉริยะ

เกมเลี้ยงสุนัข/แมวที่ **เปลี่ยนร่างตามวิธีเลี้ยง** มี 7 สายวิวัฒนาการ สายละ 5 ร่าง
สร้างด้วย **Phaser 3 (CDN)** + JavaScript ธรรมดา ไม่ต้องติดตั้ง npm · UI เป็นภาษาอังกฤษ ส่วนสัตว์เลี้ยงคุยเป็นภาษาไทย

🎮 **เล่นออนไลน์:** https://kong22731.github.io/Paws-and-Phases/

## วิธีรันเกมในเครื่อง
ต้องรันผ่านเว็บเซิร์ฟเวอร์ในเครื่อง (ดับเบิลคลิก `index.html` ตรง ๆ จะโหลดรูปและใช้กล้องไม่ได้)
1. ดับเบิลคลิก **`start.bat`** แล้วเกมจะเปิดที่ http://localhost:8080
2. หรือใน **VS Code** ติดตั้งส่วนเสริม *Live Server* → คลิกขวา `index.html` → **Open with Live Server**

> ต้องต่ออินเทอร์เน็ต เพราะ Phaser ฟอนต์ และโมเดลจดจำมือ (MediaPipe) โหลดจาก CDN

## ภาษาและเทคโนโลยี
| | ใช้ทำอะไร |
|---|---|
| **JavaScript (ES6+)** | ตัวเกมทั้งหมด: ระบบสัตว์ AI แชทบอท ฉาก และการควบคุมด้วยมือ |
| **HTML5 / CSS3** | หน้าเว็บ แผงแชท ถุงมือ และแผงกล้อง |
| **PowerShell (+ C#)** | เซิร์ฟเวอร์ทดสอบ (`serve.ps1`) และสคริปต์เตรียมรูป (`tools/make-sprites.ps1`) |
| Phaser 3.80 · MediaPipe · Web Speech · Web Audio · localStorage | เอนจินเกม · จดจำมือ · รู้จำเสียงไทย · เสียงเอฟเฟกต์ · บันทึกเกม |

## โครงสร้างโปรเจกต์
```
index.html            หน้าเว็บหลัก + แผงแชท
css/style.css         หน้าตาส่วน HTML
js/data/petData.js    ข้อมูลตั้งค่าทั้งหมด (ตัวเลข ไอเทม ชื่อสาย ชื่อร่าง คำอธิบาย)
js/systems/           PetState · EmotionAI · EvolutionAI · CareAdvisor · PetChatbot · HandControl · Sound · Settings
js/ui/                Widgets (ปุ่ม/กล่อง) · ChatPanel (แผงแชท)
js/scenes/            ฉาก 11 ฉาก
js/main.js            จุดเริ่มเกม
assets/               รูป เสียง และ sprites ที่ย่อแล้ว
tools/make-sprites.ps1  สคริปต์ลบพื้นหลัง/ย่อรูปตัวละคร
```

## หน้าจอ
| หน้าจอ | ไฟล์ |
|---|---|
| หน้าปก (START / Continue / เลือกเล่นด้วยมือหรือเมาส์) | `js/scenes/TitleScene.js` |
| เลือกสัตว์ + ตั้งชื่อ | `js/scenes/BreedScene.js` |
| ฉากเปลี่ยนวัน "Day N" | `js/scenes/DayScene.js` |
| หน้าเลี้ยงหลัก + เมนู Grooming (Feed / Play / Care / Rest) | `js/scenes/GameScene.js` |
| เมนู (บันทึก ความยาววัน ความเร็ว เสียง การควบคุมด้วยมือ) | `js/scenes/MenuScene.js` |
| บันทึก / โหลดเกม 3 ไฟล์ | `js/scenes/SlotScene.js` |
| ฉากวิวัฒนาการ + ผลวิเคราะห์ AI | `js/scenes/EvolutionScene.js` |
| Evolution Book (รายชื่อสาย → ร่างในสาย เลื่อนวนได้) | `js/scenes/CodexScene.js` |
| ป๊อปอัป Hint / Profile | `HintScene.js` / `ProfileScene.js` |
| แผงแชทด้านขวา (HTML) | `index.html` + `js/ui/ChatPanel.js` + `css/style.css` |

## วิธีเล่นโดยย่อ
- **ค่าสถานะ 4 ค่า** (อิ่ม · สะอาด · สุข · พลัง) ลดลงตามเวลา ดูแลผ่านเมนู **Grooming**
- **1 วัน = 3 นาที** (เปลี่ยนเป็น 3 / 5 / 7 / 10 นาทีได้ที่เมนู **Day Length**, เร่งเวลา x1 / x2 / x5 / x10 ที่ **Time Speed**)
- **หมดวัน:** ค่าสถานะหยุดนิ่ง ปุ่ม **NEXT DAY** ขึ้น กดแล้ว AI ตัดสินการเติบโตจากการเลี้ยงทั้งวัน
- **เวลาเดินเฉพาะตอนอยู่หน้าเลี้ยง:** ปิดเกม สลับแท็บ หรือเปิดเมนู ค่าสถานะจะไม่ลด
- **Social (แถบสีชมพู):** คุยแชท +3 ต่อข้อความ · ท่า 👍 +2 · ทั้งวันไม่คุยเลย −8
- **บันทึกเกม:** สัตว์ตัวใหม่บันทึกลงไฟล์ว่างอัตโนมัติ (มี 3 ไฟล์) และบันทึกเองทุก 5 วินาที โหลด / คัดลอก / ลบไฟล์ได้ที่หน้า Load Game · เซฟเก็บใน localStorage ของเบราว์เซอร์

## ระบบวิวัฒนาการ
- ทุกครั้งที่ใช้ไอเทมได้ **แต้มการดูแล** = 10 × (0.5 + ความต้องการ) → 5–15 แต้ม (ทำตอนสัตว์ต้องการได้แต้มมากกว่า)
- ตอนจบวัน AI คิดเป็น **สัดส่วน %** ของ Feed / Play / Care / Rest แล้วตรวจเงื่อนไขทีละสาย
- **ร่าง 1 → 2:** ผ่านเงื่อนไขสายไหน ได้ร่าง 2 ของสายนั้น (ตรวจตามลำดับ Neglect → Leader → Royal → Sleepy → Gluttony → Self-Care → Playful)
- **ร่าง 2–4:** ผ่านเป้าสายเดิม → ขึ้น 1 ร่าง · เกือบถึง → คงร่าง · พลาด**ติดกัน** 2 วัน (ร่าง 2–3) หรือ 3 วัน (ร่าง 4) → ถอย 1 ร่าง
- **ร่าง 5:** ร่างคงที่ ปลดล็อกชื่อสายใน Evolution Book และกด **Rebirth** เพื่อเริ่มใหม่ได้
- ร่าง 1–2 ใช้เกณฑ์ง่าย (`EvolutionAI.js` → `EASY`) ตั้งแต่ร่าง 3 ใช้เกณฑ์ปกติ (`CFG`)
- ชื่อสายแสดงเป็น **???** จนกว่าจะถึงร่าง 5 · สาย Leader ซ่อนใน Evolution Book จนกว่าจะปลดล็อก · ปุ่ม **Hint** ขึ้นตั้งแต่ร่าง 3

| สาย | เงื่อนไขต่อวัน (เกณฑ์ปกติ ร่าง 3 ขึ้นไป) | ร่าง 2 → 5 |
|---|---|---|
| 👽 Neglect | แต้มรวม < 15 (แทบไม่ดูแล) | Neglected Stalker → Emaciated Mutant → Hybrid Alien-Beast → Apex Alien Entity |
| 🎩 Leader (สายลับ) | สมดุลแบบ Royal + คุยกัน ≥ 8 ครั้งต่อวัน | Agent Trainee → Elite Strategist → Prominent Statesman → Prime Minister Icon |
| 👑 Royal | ทุกด้าน 10–45% และแต้มรวม ≥ 40 | Dapper Noble → Royal Heir → Regal Aristocrat → Sovereign Monarch |
| 💤 Sleepy | Rest ≥ 50% และ Feed / Play / Care แต่ละด้าน ≤ 20% | Drowsy Hatchling → Coiling Cub → Mystic Serpent-Form → Celestial Dragon Form |
| 🐷 Gluttony | Feed มากที่สุดและ ≥ 45% · Play, Care ≤ 20% * | Chubby Eater → Gluttonous Form → Insatiable Beast → Demon Lord of Gluttony |
| 🧼 Self-Care | Care มากที่สุดและ ≥ 45% · Play, Feed ≤ 20% * | Hygiene Learner → Bubble-Kissed Form → Lathering Form → Pure Soap Sovereign |
| 🏋️ Playful | Play มากที่สุดและ ≥ 45% · Care, Feed ≤ 20% * | Energetic Rookie → Fledgling Brawler → Powerhouse Beast → Apex Muscle Icon |

\* 3 สายนี้คิด % จาก Feed + Play + Care เท่านั้น ไม่นับ Rest (พักได้ไม่เสียสาย)

## ระบบอัจฉริยะ
- **1.1 Emotion AI** (`js/systems/EmotionAI.js`): ให้คะแนนอารมณ์ 8 แบบจากค่าสถานะ เช่น หิว = (40 − อิ่ม) × 2.5 แล้วเลือกคะแนนสูงสุด สัตว์เปลี่ยนท่าทาง แสดงอีโมจิ และพูดเรียกผู้เล่นเอง
- **1.2 Evolution AI** (`js/systems/EvolutionAI.js`): วิเคราะห์สัดส่วนการดูแลทั้งวันและจำนวนครั้งที่คุย เลือก 1 ใน 7 สาย พร้อมเหตุผลที่แสดงในฉากวิวัฒนาการ
- **1.3 Care Advisor** (`js/systems/CareAdvisor.js`): ความเร่งด่วน = ((100 − ค่า) ÷ 100)² × 100 × น้ำหนัก แล้วไฮไลต์ปุ่ม → หมวด → ไอเทมที่ควรใช้ด้วยกรอบสีเหลือง
- **1.4 Pet Chatbot** (`js/systems/PetChatbot.js`): ทำงานออฟไลน์ จับเจตนาจากคำสำคัญมากกว่า 50 แบบ เข้าใจอีโมจิ คำตอบสั้น และประโยคปฏิเสธ ตอบตามอารมณ์ ค่าสถานะ และความสนิท จำคำถามล่าสุดเพื่อคุยต่อเนื่อง และพูดตามบุคลิกของสายและร่าง · ปุ่มไมค์รับเสียงภาษาไทย (Chrome / Edge)
- **ควบคุมด้วยมือ** (`js/systems/HandControl.js`): โมเดล MediaPipe หาจุดบนมือ 21 จุดจากกล้อง แล้วแยกท่า ✋ เลื่อน · ✊ กด/ลาก · ชี้ค้างเพื่อกด · 🤚 ลูบหัว · ✌️ ทักทาย · 👍 ชม · ภาพกล้องประมวลผลในเครื่องเท่านั้น

## รูปภาพ
- รูปตัวละครต้นฉบับอยู่ใน `assets/Dog (Starter).png`, `assets/Cat (Starter).png` และ `assets/Evolution Route/<สาย>/<Dog|Cat> Stages/2-5.png`
- เกมใช้รูปที่ย่อและลบพื้นหลังแล้วใน `assets/sprites/` · **เพิ่มหรือเปลี่ยนรูปเมื่อไหร่ ให้รัน** `tools/make-sprites.ps1` ใหม่
- ดูภาพตัวละครทุกร่างพร้อมกัน: เปิด `index.html?crops=1`

## ปรับแต่งเกม
| ต้องการแก้ | ไฟล์ |
|---|---|
| ความยาก อัตราลดค่าสถานะ ไอเทม ความยาววัน ชื่อร่าง คำอธิบาย | `js/data/petData.js` |
| เกณฑ์สายวิวัฒนาการ | `js/systems/EvolutionAI.js` → `CFG`, `EASY` |
| คำที่แชทบอทเข้าใจ / คำตอบ / บุคลิก | `js/systems/PetChatbot.js` → `INTENTS`, `replyFor()`, `PERSONAS` |
| ความไวของการควบคุมด้วยมือ | `js/systems/HandControl.js` → `PROFILES` |
