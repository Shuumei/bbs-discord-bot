import { Client, Message } from "discord.js";
import { aiService, chunkMessage } from "../services/ai.js";

export function setupMessageCreateEvent(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    // ป้องกันการตอบข้อความจากบอทตัวอื่นหรือตัวเอง
    if (message.author.bot) return;

    // ตรวจสอบว่ามีการ @mention บอทหรือไม่
    const botUser = client.user;
    if (!botUser) return;

    const isMentioned = message.mentions.has(botUser.id);
    if (!isMentioned) return;

    // ตัดแท็ก @mention ออกเพื่อให้เหลือเฉพาะเนื้อหาคำถาม
    const cleanPrompt = message.content
      .replace(new RegExp(`<@!?${botUser.id}>`, "g"), "")
      .trim();

    if (!cleanPrompt) {
      await message.reply(
        "🗡️ โย่สหาย! เรียกเรามีอะไรให้ช่วยไหม? ถามเรื่อง Bleach Lore, บังไค, จัดทีม BBS หรือพิมพ์ `/` เพื่อดูคำสั่งทั้งหมดได้เลย!"
      );
      return;
    }

    try {
      // ส่งสัญญาณ Typing ในห้อง
      if ("sendTyping" in message.channel && typeof message.channel.sendTyping === "function") {
        await message.channel.sendTyping();
      }

      const replyText = await aiService.askSpecialist(cleanPrompt, {
        userName: message.author.displayName || message.author.username,
        channelName: "name" in message.channel ? (message.channel as any).name : "guild-chat",
      });

      const chunks = chunkMessage(replyText);

      // ตอบข้อความแรกด้วยการ Reply
      await message.reply({
        content: chunks[0],
        allowedMentions: { repliedUser: false },
      });

      // ส่งท่อนที่เหลือต่อหากข้อความยาว
      if ("send" in message.channel && typeof message.channel.send === "function") {
        for (let i = 1; i < chunks.length; i++) {
          await message.channel.send({ content: chunks[i] });
        }
      }
    } catch (err: any) {
      console.error("[MessageCreate Error]:", err?.message || err);
      await message.reply("⚠️ แรงดันวิญญาณรบกวนสัญญาณ ลองใหม่อีกทีนะสหาย!");
    }
  });
}
