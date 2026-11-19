# Paws and Phases — ระบบเกมเลี้ยงสัตว์เสมือนจริงอัจฉริยะ

เกมเลี้ยงสุนัข/แมวแบบจอแนวนอน สร้างด้วย **Phaser 3 (CDN)** + JavaScript ธรรมดา ไม่ต้องติดตั้ง npm
UI เป็นภาษาอังกฤษตามดีไซน์ ส่วนแชทบอท (สัตว์เลี้ยงพูด) เป็นภาษาไทย

**เลย์เอาต์:** เกม 960×600 อยู่ซ้าย + แผงแชทกว้าง 330px อยู่ขวา (ขอบ/ช่องว่าง 16px → ทั้งหน้า 1338×632)
ถ้าออกแบบใน Figma ให้ใช้ frame ขนาด 1338×632 โดยให้พื้นที่เกมอยู่ที่ x16 y16 และแชทอยู่ที่ x992 y16

## วิธีรันเกม
ต้องรันผ่านเว็บเซิร์ฟเวอร์ในเครื่อง (ดับเบิลคลิก `index.html` ตรง ๆ จะโหลดรูปไม่ได้)
1. **VS Code**: ติดตั้งส่วนเสริม *Live Server* → คลิกขวา `index.html` → **Open with Live Server**
2. หรือดับเบิลคลิก **`start.bat`** แล้วเกมจะเปิดที่ http://localhost:8080

> ต้องต่ออินเทอร์เน็ต เพราะ Phaser และฟอนต์ (Sniglet / Amarante / Kanit) โหลดจาก CDN
>
> เพิ่มหรือเปลี่ยนรูปตัวละคร ไอเทม แบนเนอร์ หรือรูปใน `assets/ui/big/` แล้ว ให้รัน `tools/make-sprites.ps1` ใหม่

## หน้าจอ (ตามดีไซน์ Figma "Paws & Phases Interface")
| หน้าจอ | ไฟล์ |
|---|---|
| หน้าปก (ยังไม่มีภาพปก — ใช้ทุ่งดอกไม้ + หมาแมว) | `js/scenes/TitleScene.js` |
| Choose Your Pet + Name Your Pet | `js/scenes/BreedScene.js` |
| ฉากเปลี่ยนวัน "DAY N" | `js/scenes/DayScene.js` |
| หน้าเลี้ยงหลัก + เมนู Grooming (Feed / Play / Care / Rest) | `js/scenes/GameScene.js` |
| ป๊อปอัป Profile (กดรูป avatar) / Hint (ปุ่มหลอดไฟ) | `ProfileScene.js` / `HintScene.js` |
| Evolution Book (รายชื่อสาย → ร่างในสาย) | `js/scenes/CodexScene.js` |
| เมนู / ฉากวิวัฒนาการ (ไม่มีในดีไซน์ ใช้สไตล์เดียวกัน) | `MenuScene.js` / `EvolutionScene.js` |
| แผงแชทด้านขวา (HTML) | `index.html` + `js/ui/ChatPanel.js` + `css/style.css` |

ปุ่มด้านขวาของหน้าเลี้ยง จากบนลงล่าง: **เมนู** (Resume / Time Speed / Main Menu), **Evolution Book**, **Rebirth** (กดได้เมื่อถึงร่างสูงสุด), **Grooming**
กดรูปหน้าสัตว์ = **Profile** · Rest มี **Nap** (หลับ 30 วิ) และ **Sleep** (หลับจนกว่าจะกดปลุกที่ปุ่มเดิม)

**ไอคอน/รูปจาก Figma:** `assets/ui/icon_*.png` (ไอคอนเล็ก) และ `assets/ui/big/` (รูปใหญ่ ย่อด้วยสคริปต์)
**ไอเทม:** รูปใน `assets/Grooming Items/<Feed|Play|Care|Rest>/` — ชื่อ ผลต่อค่าสถานะ และลำดับ แก้ได้ที่ `ITEMS` ใน `js/data/petData.js` (ค่าตอนนี้เป็นค่าชั่วคราว รอเงื่อนไขงาน)
**ฟอนต์:** Sniglet (ตัวหนังสือทั่วไป), Amarante (หัวเรื่อง), Kanit (ภาษาไทย)

## ระบบวันและวิวัฒนาการ (ตาม Interface.pdf / Evolution Line.pdf)
- **1 วัน = 3 นาที** (ค่าเริ่มต้น — เปลี่ยนเป็น 3 / 5 / 7 / 10 นาทีได้ที่เมนู **Day Length**, เร่งได้ x1 / x2 / x5 / x10 ที่ **Time Speed**)
- **เสียง:** เพลงพื้นหลังจาก `assets/game sound/` (`petData.js` → `SOUND_FILES`) + เสียงเอฟเฟกต์สร้างด้วยโค้ด (`js/systems/Sound.js` → `EFFECTS`) เปิด/ปิดได้ที่เมนู · การตั้งค่าเมนูบันทึกแยกจากเซฟสัตว์ (`js/systems/Settings.js`) ระหว่างวันมุมซ้ายล่างแสดง "Day N · เวลาที่เหลือ"
- **หมดวัน:** ปุ่ม **NEXT DAY** ขึ้น ดูแลสัตว์ไม่ได้อีก และ**ค่าสถานะหยุดนิ่ง ไม่ลดลงเลย** → กดแล้วขึ้นจอฟ้า "Day N+1"
- **เวลาเดินเฉพาะตอนอยู่หน้าเลี้ยง:** ปิดเกม สลับแท็บ หรืออยู่หน้าอื่น ค่าสถานะและเวลาจะคงเดิม (ไม่มีการชดเชยเวลาที่ปิดไป)
- **ร่าง 1 → 2 และ 2 → 3 ใช้เกณฑ์ง่ายกว่า** (`EvolutionAI.js` → `EASY`) ตั้งแต่ร่าง 3 ใช้เกณฑ์ปกติ (`CFG`)
- **ตอนขึ้นวันใหม่ AI ตัดสินจากการเลี้ยงทั้งวัน** (แต้ม Feed / Play / Care / Rest + จำนวนครั้งที่คุย):
  - ร่าง 1 → ทำเงื่อนไขสายไหนได้ จะกลายเป็นร่าง 2 ของสายนั้น
  - ร่าง 2-4 → ทำเป้าสายเดิมได้ **ขึ้น 1 ขั้น** / ไม่ได้ **ลดกลับ 1 ขั้น** (ไปเรื่อย ๆ จนถึงร่าง 1)
  - ร่าง 5 (สูงสุด) → ร่างคงที่ ไม่ลดขั้นอีก ปลดล็อกสายใน Evolution Book และกด **Rebirth** (ปุ่มลูกศรวน) เพื่อเริ่มร่างใหม่ได้
- **ชื่อสายถูกซ่อน (???)** จนกว่าจะไปถึงร่างสูงสุดของสายนั้น · สาย Leader ไม่แสดงใน Evolution Book เลยจนกว่าจะปลดล็อก
- **Hint (หลอดไฟ)** ขึ้นเมื่อถึงร่าง 3 ของสาย: บอกวิธีไปร่าง 4 / 5 + ค่าที่แนะนำ
- **Social (แถบสีชมพู)** เพิ่มจากการคุยแชทเท่านั้น (+3/ครั้ง) และลดลง 8 ถ้าทั้งวันไม่คุยเลย
- ตัวเลขเกณฑ์ทั้งหมด: `EvolutionAI.js` → `CFG` · เวลา/ความเร็ว/Social: `petData.js` → `DAY_SECONDS`, `SPEEDS`, `SOCIAL_*`
- คำแนะนำ ค่าที่แนะนำ และคำอธิบายแต่ละร่าง: `petData.js` → `LINE_GUIDE`

**แชทบอทพูดตามบุคลิกของร่าง** (`PetChatbot.js` → `PERSONAS`): ร่าง 2-3 และ 4-5 ของแต่ละสายพูดต่างกัน เช่น
พญานาคพูด "ข้า/เจ้า" แบบลึกลับ · ปีศาจหมูอ้วนหิวตลอด · ร่างผอมพูดแผ่ว ๆ แล้ว**ร่างเอเลี่ยน (ร่าง 4-5) พูดไม่รู้เรื่องเลย** · นักเพาะกายพูดเรื่องกล้าม · ร่างนายกพูดแบบแถลงการณ์

ตารางด้านล่างคือเกณฑ์ปกติ (ร่าง 3 ขึ้นไป)

| สาย | เงื่อนไขต่อวัน (สัดส่วนแต้มดูแล) | ร่าง 2 → 5 |
|---|---|---|
| 💤 Sleepy | Rest ≥ 50% และ Feed / Play / Care แต่ละอย่าง ≤ 20% | Drowsy Hatchling → Coiling Cub → Mystic Serpent-Form → Celestial Dragon Form |
| 🐷 Gluttony | Feed สูงสุดและ ≥ 45% · Play, Care ≤ 20% | Chubby Eater → Gluttonous Form → Insatiable Beast → Demon Lord of Gluttony |
| 👽 Neglect | แทบไม่ได้ดูแลเลย (แต้มรวม < 15) | Neglected Stalker → Emaciated Mutant → Hybrid Alien-Beast → Apex Alien Entity |
| 🧼 Self-Care | Care สูงสุดและ ≥ 45% · Play, Feed ≤ 20% | Hygiene Learner → Bubble-Kissed Form → Lathering Form → Pure Soap Sovereign |
| 🏋️ Playful | Play สูงสุดและ ≥ 45% · Care, Feed ≤ 20% | Energetic Rookie → Fledgling Brawler → Powerhouse Beast → Apex Muscle Icon |
| 👑 Royal | สมดุลทั้ง 4 ด้าน (แต่ละด้าน 15-35%, แต้มรวม ≥ 40) | Dapper Noble → Royal Heir → Regal Aristocrat → Sovereign Monarch |
| 🎩 Leader (สายลับ) | สมดุลแบบ Royal + คุยกัน ≥ 8 ครั้งต่อวัน | Agent Trainee → Elite Strategist → Prominent Statesman → Prime Minister Icon |

## รูปภาพ
- **ตัวละคร:** รูปต้นฉบับอยู่ที่ `assets/Dog (Starter).png`, `assets/Cat (Starter).png` และ `assets/Evolution Route/<สาย>/<Dog|Cat> Stages/2-5.png`
  เกมไม่ได้โหลดรูปต้นฉบับ (ใหญ่รวม ~90 MB) แต่ใช้รูปที่ย่อและลบพื้นขาวแล้วใน `assets/sprites/`
  **เพิ่มหรือเปลี่ยนรูปเมื่อไหร่ ให้รัน** `tools/make-sprites.ps1` ใหม่ (คลิกขวา → Run with PowerShell)
  รูปที่มีฉากหลัง (ส่วนใหญ่ของสาย Sleepy) จะแสดงเป็นกรอบรูป ถ้าอยากให้ยืนในฉากเหมือนตัวอื่น ให้ทำเป็น PNG พื้นขาวหรือพื้นใส
- **พื้นหลัง / ไอเทม / ภาพปก:** ใส่ path ใน `ASSET_FILES` ของ `js/data/petData.js` (ตอนนี้ใช้ `assets/bg2.jpg`, ตัดขอบ 3px ตาม `BG_INSET`)
  ภาพปก `cover` ถ้าเป็น `null` หน้าแรกจะใช้พื้นหลัง + หมาแมว starter แทน

## ระบบอัจฉริยะ
- **1.1 AI Emotion & Needs** (`systems/EmotionAI.js`): ให้คะแนนแต่ละอารมณ์จากค่าสถานะ แล้วเลือกคะแนนสูงสุด แต่ละอารมณ์มีแอนิเมชันของตัวเอง เช่น กระโดด ส่ายตัว หันมองหา ตัวสั่น หรือหลับ และน้องจะ "เรียก" ผู้เล่นผ่านฟองคำพูดกับแชท
- **1.2 Smart Evolution** (`systems/EvolutionAI.js`): วิเคราะห์สัดส่วนการดูแล (Food / Play / Care / Rest) และเวลาที่ถูกละเลย และจำนวนครั้งที่คุยกัน เพื่อเลือก 1 ใน 7 สาย (ตารางด้านบน) ดูกราฟได้ใน Report
- **1.3 Smart Care Recommendation** (`systems/CareAdvisor.js`): คะแนนเร่งด่วน = ((100-ค่า)/100)² × น้ำหนัก แสดงในแถบ 💡 และไฮไลต์แท็บ/ไอเทมที่ควรใช้
- **1.4 Smart Pet Chatbot** (`systems/PetChatbot.js`): ตรวจ intent จากคำสำคัญภาษาไทย แล้วตอบตามอารมณ์ ค่าสถานะ ชนิดสัตว์ และระดับความผูกพัน ปุ่มไมค์รับเสียงภาษาไทยได้ (Chrome/Edge)

## ปรับแต่งต่อ
- สมดุลเกม / ไอเทม / ชื่อร่าง: `js/data/petData.js`
- เกณฑ์สายวิวัฒนาการ: `EvolutionAI.js` → `CFG`
- คำที่แชทบอทเข้าใจ: `PetChatbot.js` → `INTENTS`, `replyFor()`
- ชื่อสาย/ชื่อร่าง/สีประจำสาย: `petData.js` → `LINES`, `FORM_NAMES`
- ดูภาพตัวละครทุกร่างพร้อมกัน: เปิด `index.html?crops=1`
