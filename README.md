# 🗡️ Bleach & Bleach: Brave Souls (BBS) Guild Discord Bot

บอท Discord ประจำกิลด์เกม **Bleach: Brave Souls (BBS)** ในบทบาท **"เพื่อนรู้ใจสายบลีชประจำกิลด์" (Bleach & BBS Specialist Companion)** ขับเคลื่อนด้วย Node.js, TypeScript, discord.js v14 และ AI Agent

---

## ✨ ฟีเจอร์เด่น (Key Features)

1. **Bleach Specialist Lore & Chat (@mention)**
   - พูดคุย ถาม-ตอบ อธิบายเนื้อเรื่องบลีช ชิไค, บังไค, ฮอลโลว์แฟกชัน, ควินซี่ ชริฟต์ (Schrift 26 ตัว A-Z), โวลสแตนดิก (Vollständig), เรสสุเรคซิออน (Resurrección)
   - ครอบคลุมทั้ง **มังงะ 686 ตอน, อนิเมะ TYBW (สงครามเลือดพันปี)** และนิยายออฟฟิเชียล **Can't Fear Your Own World (CFYOW)** รวมถึง **Spirits Are Forever With You (SAFWY)**
   - รองรับการแท็ก `@บอท` คุยเล่นในห้องแชตได้ทันทีเหมือนคุยกับเพื่อนในกิลด์
2. **⚔️ สเกลพลัง & จำลองการต่อสู้ (/vs)**
   - วิเคราะห์เปรียบเทียบการปะทะระหว่าง 2 ตัวละครแบบเจาะลึก (เช่น ยามาโมโตะ บังไค VS ยูฮาบัคห์, ไอเซ็น มุเก็น VS อิจิเบย์) พร้อมจำลองรูปเกมและโอกาสชนะ
3. **🎮 BBS Guild & Gameplay Guide (/bbs-guide)**
   - แนะนำการจัดทีมและกลยุทธ์ **Guild Quest (Normal / Hard / Very Hard)**
   - วิเคราะห์ตู้กาชา (End of Month / Mid Month / ครบรอบ Anniversary) ว่าควรเปิดหรือดอง Orbs
   - แนะนำการปั้นตัวละคร (Link Slot 20/20/20, Bonus Ability: FSD/Damage to Weakened, Transcendence SP/ATK/Focus)
4. **📢 ระบบบรอดแคสต์ข่าวสารอัตโนมัติ (Automated News System)**
   - แจ้งเตือนข่าวสารอนิเมะ Bleach TYBW และกิจกรรมอัปเดต/ตู้กาชาในเกม BBS เข้าสู่ช่องของกิลด์ตามตารางเวลา (Node-Cron)
   - ปรับแต่งช่องรับข่าวหรือสั่งส่งทดสอบได้ผ่านคำสั่ง `/news-config`

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
bbs-discord-bot/
├── src/
│   ├── index.ts               # Entry point หลักของบอท & การเชื่อมต่อ Gateway
│   ├── config.ts              # จัดการและ Validate ตัวแปร Environment Variables
│   ├── deploy-commands.ts     # สคริปต์ลงทะเบียน Slash Commands ผ่าน Discord REST API
│   ├── types/
│   │   └── index.ts           # Type interfaces (Command, News, ฯลฯ)
│   ├── services/
│   │   ├── ai.ts              # AI Bleach Specialist Service พร้อม System Prompt สุดลึกซึ้ง
│   │   └── news.ts            # ข่าวสาร Bleach & BBS พร้อมระบบ Node-Cron Scheduler
│   ├── commands/
│   │   ├── index.ts           # แหล่งรวบรวม Slash Commands
│   │   ├── ping.ts            # เช็ก Latency และแรงดันวิญญาณ
│   │   ├── bleach-lore.ts     # ถาม-ตอบ Lore บลีช และนิยาย
│   │   ├── bbs-guide.ts       # ไกด์เกม BBS (GQ, กาชา, ปั้นตัว)
│   │   ├── vs.ts              # จำลองการต่อสู้และวิเคราะห์สเกลพลัง
│   │   └── news-config.ts     # ตั้งค่าช่องส่งข่าวสารและทดสอบส่ง
│   └── events/
│       ├── ready.ts           # จัดการสถานะ Bot Presence และสตาร์ต Cron
│       ├── interactionCreate.ts # จัดการ Event เมื่อผู้ใช้เรียก Slash Command
│       └── messageCreate.ts   # ฟังข้อความเมื่อมีคน @mention บอทในกิลด์
├── .env.example               # ตัวอย่างการตั้งค่า Environment
├── .env                       # ไฟล์ตั้งค่า Secret Keys
├── tsconfig.json              # การตั้งค่า TypeScript NodeNext
└── package.json               # Dependencies และคำสั่งรันโปรเจกต์
```

---

## 🚀 ขั้นตอนการติดตั้งและการตั้งค่า (Step-by-Step Setup)

### ขั้นตอนที่ 1: สร้าง Bot Token ใน Discord Developer Portal

1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications) แล้วล็อกอินด้วยบัญชี Discord
2. คลิกปุ่ม **New Application** มุมขวาบน ตั้งชื่อแอปพลิเคชัน เช่น `BBS Guild Specialist`
3. ไปที่แท็บ **Bot** ในเมนูด้านซ้าย:
   - คลิก **Reset Token** (หรือ Copy Token) แล้วนำ Token มาเก็บไว้ใส่ในตัวแปร `DISCORD_TOKEN`
4. **สำคัญมาก! การเปิด Privileged Gateway Intents**:
   - ในหน้า **Bot** ให้เลื่อนลงมาที่หัวข้อ **Privileged Gateway Intents**
   - เปิดสวิตช์ **Message Content Intent** เป็น **ON** (จำเป็นสำหรับการอ่านข้อความเวลาคน `@mention` บอท)
   - เปิดสวิตช์ **Server Members Intent** (แนะนำ)
   - กดปุ่ม **Save Changes**
5. ไปที่แท็บ **General Information**:
   - คัดลอก **Application ID** มาเก็บไว้ใส่ในตัวแปร `DISCORD_CLIENT_ID`

---

### ขั้นตอนที่ 2: เชิญบอทเข้าสู่ Discord Server ของคุณ

1. ในหน้า Developer Portal ไปที่แท็บ **OAuth2** -> **URL Generator**
2. ในช่อง **SCOPES** ให้ติ๊กเลือก:
   - `bot`
   - `applications.commands`
3. ในช่อง **BOT PERMISSIONS** ให้ติ๊กเลือก:
   - `Send Messages`
   - `Send Messages in Threads`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `View Channels`
4. คัดลอก **Generated URL** ด้านล่างสุด นำไปเปิดในเบราว์เซอร์ แล้วเลือกเซิร์ฟเวอร์กิลด์ที่คุณต้องการเชิญบอทเข้า

---

### ขั้นตอนที่ 3: กำหนดค่าไฟล์ `.env`

เปิดไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ แล้วกรอกข้อมูลให้ครบถ้วน:

```env
# ข้อมูลจาก Discord Developer Portal
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_client_id_here

# (ออปชันนอล) ใส่ Server ID สำหรับการเทสต์ Slash Command ทันทีโดยไม่ต้องรอ Discord Global Cache
DISCORD_GUILD_ID=

# AI Provider Configuration
# ใส่ API Key ของ OpenAI หรือ Google Gemini
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# หากต้องการใช้ Google Gemini (ผ่าน OpenAI Compatibility Endpoint):
# OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
# AI_MODEL=gemini-2.0-flash

# BBS Guild & News System
# Discord Channel ID สำหรับส่งข่าวสาร (สามารถใช้คำสั่ง /news-config ในดิสคอร์ดตั้งภายหลังได้)
NEWS_CHANNEL_ID=
NEWS_CRON_SCHEDULE=0 10 * * *
```

---

### ขั้นตอนที่ 4: ลงทะเบียนคำสั่ง Slash Commands

ก่อนรันบอทครั้งแรก ให้ส่งคำสั่ง Slash Commands ไปยัง Discord:

```bash
npm run deploy-commands
```

> **ข้อสังเกต:**
> - หากระบุ `DISCORD_GUILD_ID` ใน `.env` คำสั่งจะอัปเดตเข้าเซิร์ฟเวอร์นั้นทันทีภายในไม่กี่วินาที
> - หากไม่ระบุ จะเป็นการลงทะเบียนแบบ Global ซึ่ง Discord อาจใช้เวลาแคชคำสั่งประมาณ 5-15 นาที

---

### ขั้นตอนที่ 5: เริ่มต้นการทำงานของบอท

รันในโหมดพัฒนา (Development with Hot Reload):
```bash
npm run dev
```

หรือคอมไพล์และรันในโหมด Production:
```bash
npm run build
npm start
```

---

## 🎯 รายการคำสั่งใน Discord (Available Commands)

| คำสั่ง (Command) | คำอธิบาย | ตัวอย่างการใช้งาน |
| :--- | :--- | :--- |
| `/bleach-lore` | ถาม-ตอบ เจาะลึกเนื้อเรื่อง บังไค และนิยาย CFYOW/SAFWY (ตอบกระชับฉับไว) | `/bleach-lore topic:บังไคของมินาซึกิทำงานยังไง` |
| `/vs` | วิเคราะห์จำลองการต่อสู้ 2 ตัวละครแบบกระชับ พร้อมสรุปโอกาสชนะ | `/vs character1:อิจิเบย์ เฮียวซึเบะ character2:ยูฮาบัคห์` |
| `/news-config` | ตั้งค่าช่องแจ้งเตือนข่าวสาร หรือสั่งทดสอบบรอดแคสต์ทันที | `/news-config channel:#bbs-news trigger_test:True` |
| `/ping` | ตรวจสอบค่าความหน่วง (Latency) และแรงดันวิญญาณ | `/ping` |
| `@BBSBot <คำถาม>` | คุยเล่นหรือปรึกษาเรื่องบลีชกับบอทสไตล์เพื่อนกิลด์ (ตอบสั้น ตรงประเด็น) | `@BBSBot บังไคของชินจิทำอะไรได้บ้าง สรุปสั้นๆ ให้ฟังหน่อย` |

*(หมายเหตุ: คำสั่ง `/bbs-guide` ปิดพักไว้ชั่วคราวเพื่อเตรียมพัฒนาต่อยอดด้วยระบบ RAG / ฐานข้อมูลเกม BBS ที่อัปเดตเฉพาะทาง)*
