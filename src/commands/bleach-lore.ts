import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/index.js";
import { aiService, chunkMessage } from "../services/ai.js";

export const bleachLoreCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("bleach-lore")
    .setDescription("ถาม-ตอบ Lore บลีช บังไค ประวัติตัวละคร และเนื้อหาเชิงลึก (TYBW/CFYOW/SAFWY)")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("หัวข้อหรือคำถามที่ต้องการให้ผู้เชี่ยวชาญวิเคราะห์")
        .setRequired(true)
    ),

  async execute(interaction) {
    const topic = interaction.options.getString("topic", true);
    await interaction.deferReply();

    const response = await aiService.askSpecialist(topic, {
      userName: interaction.user.username,
      channelName: (interaction.channel as any)?.name,
    });

    const chunks = chunkMessage(response);
    await interaction.editReply({
      content: `📖 **[วิเคราะห์ Bleach Lore: ${topic}]**\n\n${chunks[0]}`,
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i] });
    }
  },
};
