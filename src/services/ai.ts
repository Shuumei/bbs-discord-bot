import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

const BLEACH_SPECIALIST_SYSTEM_PROMPT = `
คุณคือ "เพื่อนรู้ใจสายบลีชประจำกิลด์" ในดิสคอร์ด Bleach!
กฎเหล็กในการตอบ:
1. **กระชับ สั้น ตรงประเด็นที่สุด (สำคัญมาก!)**:
   - ตอบสไตล์เพื่อนพิมพ์คุยในดิสคอร์ด สั้น กระชับ ฉับไว ไม่เกริ่นเวิ่นเว้อ ไม่ตอบเป็นเรียงความยาว
   - ความยาวคำตอบให้อยู่ในราวๆ 2-4 บรรทัด หรือไม่เกิน 1-2 ย่อหน้าสั้นๆ เนื้อๆ เน้นๆ
2. **บุคลิกและความรู้ Lore Master**:
   - เป็นกันเอง (ใช้ "เรา/นาย/สหาย/พวกเรา/ฮ่าๆ") อินกับบลีช
   - แม่นยำเรื่องสเกลพลัง ชิไค, บังไค, ชริฟต์ (A-Z), โวลสแตนดิก, เรสสุเรคซิออน, มังงะ, อนิเมะ TYBW และนิยาย Canon (CFYOW / SAFWY)
3. **กรณีคนถามเรื่องข้อมูล/เมต้าเกม BBS ในแชต**:
   - ให้บอกสั้นๆ เป็นกันเองว่าเรื่องข้อมูลเกมเชิงลึกกำลังรออัปเดตระบบฐานข้อมูลกิลด์อยู่ แต่เรื่อง Lore/สเกลพลัง/เนื้อเรื่องบลีชจัดเต็มได้เลย!
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
      ? `[${context.userName}]: ${userPrompt}`
      : userPrompt;

    // 1. ลองใช้ Google Gemini
    if (this.geminiClient && (config.aiProvider === "gemini" || !this.openaiClient)) {
      try {
        const modelName = config.aiModel || "gemini-3.5-flash-lite";

        const response = await this.geminiClient.models.generateContent({
          model: modelName,
          contents: userContent,
          config: {
            systemInstruction: BLEACH_SPECIALIST_SYSTEM_PROMPT,
            temperature: 0.7,
            maxOutputTokens: 400,
          },
        });

        const reply = response.text?.trim();
        if (reply) return reply;
      } catch (error: any) {
        console.error("[Gemini Error]:", error?.message || error);
        
        // Fallback models หากชื่อโมเดลแรกไม่พบ
        const fallbackCandidates = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
        for (const candidate of fallbackCandidates) {
          if (candidate === config.aiModel) continue;
          try {
            console.log(`[Gemini] Trying fallback model: ${candidate}...`);
            const fallbackRes = await this.geminiClient.models.generateContent({
              model: candidate,
              contents: userContent,
              config: {
                systemInstruction: BLEACH_SPECIALIST_SYSTEM_PROMPT,
                temperature: 0.7,
                maxOutputTokens: 400,
              },
            });
            const fallbackReply = fallbackRes.text?.trim();
            if (fallbackReply) return fallbackReply;
          } catch (e: any) {
            console.warn(`[Gemini Fallback ${candidate} Failed]:`, e?.message || e);
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
          for (const msg of context.history.slice(-3)) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }

        messages.push({ role: "user", content: userContent });

        const response = await this.openaiClient.chat.completions.create({
          model: config.aiModel || "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens: 400,
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
วิเคราะห์แมตช์จำลองการต่อสู้ (VS Battle) สั้นๆ กระชับ สไตล์เพื่อนคุยดิสคอร์ด:
**${char1}** VS **${char2}**
${setting ? `เงื่อนไข: ${setting}` : "เงื่อนไข: Peak Form เอาจริง"}

ตอบให้สั้นกระชับ (ไม่เกิน 2-3 ย่อหน้า):
- ⚔️ **จุดได้เปรียบ/แพ้ทาง**: สรุปจุดสำคัญแบบหมัดต่อหมัด
- 🏆 **สรุปผู้ชนะ**: ใครชนะ (โอกาสชนะกี่ %) พร้อมเหตุผลชี้ขาดแบบ Lore Bleach สั้นๆ
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
