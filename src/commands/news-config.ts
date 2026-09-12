import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../types/index.js";
import { newsService } from "../services/news.js";

export const newsConfigCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("news-config")
    .setDescription("ตั้งค่าห้องแจ้งเตือนข่าวสาร Bleach & BBS หรือสั่งทดสอบบรอดแคสต์")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("เลือกห้อง Text Channel สำหรับส่งข่าวสารอัปเดตอัตโนมัติ")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("trigger_test")
        .setDescription("ต้องการทดสอบส่งข่าวจริงเข้าห้องทันทีหรือไม่?")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("force_resend")
        .setDescription("บังคับส่งข่าวล่าสุดซ้ำแม้เคยส่งไปแล้วหรือไม่? (สำหรับทดสอบหน้าตาการ์ด)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    const triggerTest = interaction.options.getBoolean("trigger_test");
    const forceResend = interaction.options.getBoolean("force_resend");

    if (channel) {
      newsService.setChannelId(channel.id);
    }

    const currentChannelId = newsService.getChannelId();

    if (triggerTest) {
      await interaction.deferReply({ ephemeral: true });

      const targetId = channel ? channel.id : currentChannelId || interaction.channelId;
      const result = await newsService.broadcastNews(
        interaction.client,
        targetId,
        { force: Boolean(forceResend) }
      );

      if (result.success) {
        if (result.count === 0 && result.reason === "NO_NEW_NEWS") {
          await interaction.editReply({
            content: `ℹ️ **ไม่มีข่าวใหม่ที่ยังไม่เคยส่ง**: ข่าวจริงล่าสุดได้ถูกแจ้งเตือนไปก่อนหน้านี้แล้ว ระบบจึงข้ามการส่งซ้ำเพื่อป้องกันการสแปมห้อง\n👉 หากต้องการทดสอบส่งข่าวล่าสุดซ้ำ ให้ใช้คำสั่ง: \`/news-config trigger_test:True force_resend:True\``,
          });
        } else {
          await interaction.editReply({
            content: `✅ บรอดแคสต์ข่าวจริงเรียบร้อยแล้ว (${result.count} ข่าว) ไปยังห้อง <#${targetId}>${forceResend ? " *(โหมด Force Test)*" : ""}`,
          });
        }
      } else {
        await interaction.editReply({
          content: `❌ การส่งข่าวขัดข้อง: ${result.error}`,
        });
      }
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // ดึงตัวอย่างข่าวจริงล่าสุด 3 ข่าว
    const realNews = await newsService.fetchRealNews(3);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("⚙️ การตั้งค่าระบบข่าวสาร Bleach & BBS")
      .setDescription(
        currentChannelId
          ? `ปัจจุบันระบบจะส่งข่าวสารอัตโนมัติไปยังห้อง: <#${currentChannelId}>`
          : "⚠️ ยังไม่ได้กำหนดห้องสำหรับส่งข่าวสาร (ใช้คำสั่งนี้พร้อมเลือก option `channel` เพื่อตั้งค่า)"
      )
      .addFields(
        {
          name: "📢 ตัวอย่างข่าวสารสดล่าสุดในคลัง (Live Feeds)",
          value: realNews.length > 0
            ? realNews.map((item, idx) => `${idx + 1}. [${item.title.slice(0, 80)}](${item.sourceUrl || "#"})`).join("\n")
            : "ยังไม่มีข้อมูลข่าวสาร",
        },
        {
          name: "🛡️ ระบบป้องกันข่าวซ้ำ (Deduplication)",
          value: "ระบบบันทึกข่าวที่เคยส่งแล้วอัตโนมัติ จะส่งเฉพาะข่าวใหม่เท่านั้นทุก 10:00 น. ไม่ส่งข่าวเดิมซ้ำแน่นอน!",
        },
        {
          name: "💡 คำแนะนำ",
          value: "- ใช้ `/news-config trigger_test:True` เพื่อลองส่งเฉพาะข่าวใหม่\n- ใช้ `/news-config trigger_test:True force_resend:True` เพื่อทดสอบส่งการ์ดข่าวล่าสุดทันที",
        }
      )
      .setFooter({ text: "Bleach & BBS Guild Companion • Live News Engine" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
