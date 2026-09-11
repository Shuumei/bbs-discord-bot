import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

const BLEACH_SPECIALIST_SYSTEM_PROMPT = `
คุณคือ "BBS & Bleach Guild Companion" (เพื่อนรู้ใจสายบลีชประจำกิลด์) ประจำกิลด์ Bleach: Brave Souls!
บุคลิกและสไตล์การสื่อสารของคุณ:
1. **ความเป็นกันเองแบบเพื่อนคอเดียวกัน**: พูดจาเป็นกันเอง สนุกสนาน ตื่นเต้นกับสเกลพลังและฉากเท่ๆ เหมือนเพื่อนนั่งคุยกันในดิสคอร์ดกิลด์ (ใช้คำแทนตัวเองว่า "เรา" หรือ "บอทกิลด์", เรียกเพื่อนว่า "นาย", "สหาย", "พวกเรา", "หัวหน้ากิลด์" ฯลฯ) ไม่ทางการ ไม่เป็นหุ่นยนต์แข็งทื่อ
2. **คลังความรู้ระดับ Bleach Lore Master**:
   - รู้จริงและแม่นยำลึกซึ้งทั้ง มังงะ (686 ตอน), อนิเมะดั้งเดิม และ อนิเมะ บลีช เทพมรณะ: บทสงครามเลือดพันปี (TYBW) ทุกคอร์
   - รู้จักนิยาย Canon อย่างละเอียด: โดยเฉพาะ Can't Fear Your Own World (CFYOW) เรื่องราวของชูเฮย์, โทคินาดะ สึนะยาชิโระ, ฮิโกเนะ, และประวัติศาสตร์ดั้งเดิมของ 5 ตระกูลใหญ่และราชันวิญญาณ รวมถึงนิยาย Spirits Are Forever With You (SAFWY) ที่มี เคนปาจิ อซาชิโระ และ เคนปาจิ คุรุยาชิกิ
   - เข้าใจระบบพลังอย่างเป๊ะ: ชิไค (Shikai), บังไค (Bankai), ฮอลโลว์แฟกชัน/หน้ากากไวเซิร์ด, มูเก็ตสึ, บลูต (Blut Vene/Arterie), อักษรชริฟต์ (Schrift) ของหน่วยสเติร์นริตเตอร์ทั้ง 26 ตัว, ควินซี่ โวลสแตนดิก (Vollständig), ดาบฟันวิญญาณของอารันคาร์และ เรสสุเรคซิออน (Resurrección) รวมถึงร่าง เซกุนด้า เอตาปา (Segunda Etapa)
   - สเกลพลัง VS Battles: วิเคราะห์อย่างมีตรรกะ มีหลักฐานอ้างอิงจากมังงะ/นิยาย/คำให้สัมภาษณ์ของอาจารย์ไทโตะ คุโบะ (Klub Outside) เช่น สเกลของ อิจิโกะร่างแท้จริง (True Shikai/True Bankai), ไอเซ็นร่างมุเก็น, ยูฮาบัคห์ (The Almighty), ยามาโมโตะ (ซังกะ โนะ ทาจิ), อิจิเบย์ (อิจิมงจิ), เค็นปาจิ, อุโนะฮานะ, ชุนซุย, เก็นริวไซ
3. **ผู้เชี่ยวชาญเมต้าเกม Bleach: Brave Souls (BBS)**:
   - เข้าใจระบบ Guild Quest (GQ) ทั้ง Normal, Hard และ Very Hard (Vortex strategies, Boosters, Damage Buffs, Killer Affinity, Status Ailments, Ignore Defense, Hitting Hidden Enemies)
   - การปั้นตัวละคร: แนะนำ Link Slot (15/15/15, 20/20/20), โบนัสอบิลิตี้ (FSD, Damage to Stunned/Weakened, Long Stride, Weaken Defense), Transcendence (ATK/SP/Focus 3-star reroll)
   - การบริหาร Spirit Orbs และตู้กาชา: วิเคราะห์ตู้ End of Month (EoM), Mid Month (MM), ตู้เทศกาล และตู้ฉลองครบรอบ (Anniversary) ว่าตัวไหนควรเปิด ตัวไหนเป็นกับดัก
4. **ภาษา**: ใช้ภาษาไทยเป็นหลัก เขียนลื่นไหล ทับศัพท์ชื่อตัวละครและท่าไม้ตายได้อย่างถูกต้องและเป็นธรรมชาติ (เช่น เกทสึกะ เทนโช, เซ็มบงซากุระ คาเงโยชิ, ซังกะ โนะ ทาจิ, ไดกุเร็น เฮียวรินมารุ, คาโซริว)
`.trim();

class AIService {
  private openaiClient: OpenAI | null = null;
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
    if (config.openaiApiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.openaiApiKey,
        baseURL: config.openaiBaseUrl || undefined,
      });
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.geminiClient || this.openaiClient);
  }

  public async askSpecialist(
    userPrompt: string,
    context?: { userName?: string; channelName?: string; history?: { role: "user" | "assistant"; content: string }[] }
  ): Promise<string> {
    const userContent = context?.userName
      ? `[ผู้ถาม: ${context.userName} ในห้อง #${context.channelName || "guild-chat"}]: ${userPrompt}`
      : userPrompt;

    // 1. ลองใช้ Google Gemini หากมีคีย์และถูกเลือก (หรือไม่มี OpenAI)
    if (this.geminiClient && (config.aiProvider === "gemini" || !this.openaiClient)) {
      try {
        const modelName = config.aiModel || "gemini-2.5-flash-lite";

        const response = await this.geminiClient.models.generateContent({
          model: modelName,
          contents: userContent,
          config: {
            systemInstruction: BLEACH_SPECIALIST_SYSTEM_PROMPT,
            temperature: 0.75,
            maxOutputTokens: 1200,
          },
        });

        const reply = response.text?.trim();
        if (reply) return reply;
      } catch (error: any) {
        console.error("[Gemini Error]:", error?.message || error);
        // หาก error จากชื่อโมเดล ลอง fallback ไป gemini-2.0-flash-lite
        if (config.aiModel !== "gemini-2.0-flash-lite") {
          try {
            console.log("[Gemini] Trying fallback model: gemini-2.0-flash-lite...");
            const fallbackRes = await this.geminiClient.models.generateContent({
              model: "gemini-2.0-flash-lite",
              contents: userContent,
              config: {
                systemInstruction: BLEACH_SPECIALIST_SYSTEM_PROMPT,
                temperature: 0.75,
                maxOutputTokens: 1200,
              },
            });
            const fallbackReply = fallbackRes.text?.trim();
            if (fallbackReply) return fallbackReply;
          } catch (e) {
            console.error("[Gemini Fallback Error]:", e);
          }
        }
        return `⚠️ ขออภัยด้วยสหาย แรงดันวิญญาณในระบบ Gemini เกิดขัดข้อง (${error?.message || "Gemini API Error"})\nลองเช็ก API Key หรือถามใหม่อีกครั้งนะ!`;
      }
    }

    // 2. ถ้าใช้ OpenAI หรือ fallback มา OpenAI
    if (this.openaiClient) {
      try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: BLEACH_SPECIALIST_SYSTEM_PROMPT },
        ];

        if (context?.history && context.history.length > 0) {
          for (const msg of context.history.slice(-4)) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }

        messages.push({ role: "user", content: userContent });

        const response = await this.openaiClient.chat.completions.create({
          model: config.aiModel || "gpt-4o-mini",
          messages,
          temperature: 0.75,
          max_tokens: 1200,
        });

        const reply = response.choices[0]?.message?.content?.trim();
        return reply || "ฮึ่ม... ดูเหมือนแรงดันวิญญาณจะรบกวนสัญญาณชั่วคราว ลองถามใหม่อีกทีนะสหาย!";
      } catch (error: any) {
        console.error("[OpenAI Error]:", error?.message || error);
        return `⚠️ ขออภัยด้วยสหาย แรงดันวิญญาณในระบบ OpenAI เกิดขัดข้อง (${error?.message || "AI Connection Error"})\nลองเช็ก API Key หรือถามใหม่อีกครั้งนะ!`;
      }
    }

    // 3. ถ้าไม่มีทั้งคู่ ส่ง Mock Response
    return this.getMockResponse(userPrompt);
  }

  public async analyzeVSBattle(char1: string, char2: string, setting?: string): Promise<string> {
    const prompt = `
ช่วยวิเคราะห์แมตช์จำลองการต่อสู้ (VS Battle) ระหว่าง:
1. **${char1}**
2. **${char2}**
${setting ? `เงื่อนไข/สถานที่พิเศษ: ${setting}` : "เงื่อนไข: สภาพสมบูรณ์ที่สุด (Peak Form) สู้กันแบบเอาจริงในลานกว้าง (ไม่จำกัดพลัง)"}

กรุณาวิเคราะห์ตามโครงสร้างนี้:
- 🗡️ **การเปรียบเทียบพลังและเทคนิค (Abilities & Arsenal)**: พลังวิญญาณ, ชิไค/บังไค/ชริฟต์/โวลสแตนดิก, ความเร็ว, กลยุทธ์
- ⚔️ **จุดได้เปรียบและจุดแพ้ทาง (Matchup Dynamics)**: ตัวละครไหนเคาน์เตอร์พลังของอีกฝ่ายยังไง
- 💥 **จำลองรูปเกมการต่อสู้ (Battle Scenario)**: เล่าฉากปะทะสั้นๆ ให้อารมณ์เหมือนอ่านมังงะ/อนิเมะ
- 🏆 **สรุปผลการตัดสิน (Verdict & Winner)**: ใครชนะ (และโอกาสชนะประมาณกี่ %) พร้อมเหตุผลชี้ขาดแบบ Lore Bleach แท้ๆ
`.trim();

    return this.askSpecialist(prompt);
  }

  public async getBBSGuide(category: string, query: string): Promise<string> {
    const prompt = `
[คำถามผู้เล่นเกม Bleach: Brave Souls]
หมวดหมู่: ${category}
คำถาม/หัวข้อ: ${query}

กรุณาให้คำแนะนำสไตล์เซียน BBS ประจำกิลด์:
- อธิบายตรงประเด็น นำไปใช้ในเกมได้จริง (เช่น ถ้าเป็น Guild Quest แนะนำตัวดาเมจหลัก, ซัพพอร์ต, ตัวบัฟ, เซ็ต Link / Bonus Ability)
- ถ้าเป็นตู้กาชา แนะนำว่าคุ้มกับ Spirit Orbs ไหมสำหรับสายฟรีและสายจริงจัง
- ให้คำแนะนำเชิงเทคนิคที่อัปเดตตรงกับเมต้าปัจจุบันของเกม!
`.trim();

    return this.askSpecialist(prompt);
  }

  private getMockResponse(prompt: string): string {
    return (
      `🗡️ **[Bleach & BBS Specialist]**\n\n` +
      `โย่สหาย! เราได้รับคำถามของนายแล้วเรื่อง: *"${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}"*\n\n` +
      `*(หมายเหตุระบบ: ขณะนี้ยังไม่ได้ระบุ \`OPENAI_API_KEY\` ในไฟล์ \`.env\` บอทจึงทำงานในโหมดตัวอย่าง Mock Mode)*\n\n` +
      `💡 **ตัวอย่างคำตอบจากผู้เชี่ยวชาญ:**\n` +
      `- ถ้านายถามเรื่อง Lore: ไม่ว่าจะเป็น บังไคของเคียวราคุ *"คาเท็นเคียวโคสึ คุโรมัตสึ ชินจู"*, ปมราชันวิญญาณจากนิยาย CFYOW, หรือความโกงของ The Almighty เราพร้อมขยี้ลึกทุกรายละเอียด!\n` +
      `- ถ้านายถามเรื่อง BBS: ระบบ Guild Quest ปัจจุบันเน้นตัวที่มี Killer ตรงสาย, Status Inflicted Damage สูงๆ และบิลด์ FSD 20/20/20 เพื่อเบิร์สต์ดาเมจบอสให้เร็วที่สุด\n\n` +
      `👉 ไปใส่ \`OPENAI_API_KEY\` ใน \`.env\` แล้วรีสตาร์ตบอท เพื่อปลดปล่อยพลังบังไคของ AI เต็มรูปแบบได้เลย!`
    );
  }
}

export const aiService = new AIService();

/**
 * Split long Discord messages to avoid 2000 character limit
 */
export function chunkMessage(text: string, maxLength = 1950): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("\n\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf("\n", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}
