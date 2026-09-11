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
        .setDescription("ต้องการทดสอบส่งข่าวล่าสุดเข้าห้องทันทีหรือไม่?")
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    const triggerTest = interaction.options.getBoolean("trigger_test");

    if (channel) {
      newsService.setChannelId(channel.id);
    }

    const currentChannelId = newsService.getChannelId();

    if (triggerTest) {
      await interaction.deferReply({ ephemeral: true });

      const result = await newsService.broadcastNews(
        interaction.client,
        channel ? channel.id : currentChannelId || interaction.channelId
      );

      if (result.success) {
        await interaction.editReply({
          content: `✅ ส่งข่าวสารล่าสุดเรียบร้อยแล้วไปยังห้อง <#${channel ? channel.id : currentChannelId || interaction.channelId}>`,
        });
      } else {
        await interaction.editReply({
          content: `❌ การส่งข่าวขัดข้อง: ${result.error}`,
        });
      }
      return;
    }

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
          name: "📢 ตัวอย่างข่าวสารในคลัง",
          value: newsService
            .getLatestNews(3)
            .map((item, idx) => `${idx + 1}. ${item.title}`)
            .join("\n"),
        },
        {
          name: "💡 คำแนะนำ",
          value: "สามารถใช้ `/news-config trigger_test:True` เพื่อทดสอบส่งการ์ดข่าวสารได้ทันที",
        }
      )
      .setFooter({ text: "Bleach & BBS Guild Companion" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
