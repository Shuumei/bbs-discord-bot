import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/index.js";
import { aiService, chunkMessage } from "../services/ai.js";

export const bbsGuideCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("bbs-guide")
    .setDescription("เทคนิคและแนวทางการเล่นเกม Bleach: Brave Souls จากเซียนประจำกิลด์")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("หมวดหมู่คำแนะนำที่ต้องการ")
        .setRequired(true)
        .addChoices(
          { name: "🏆 Guild Quest (กลยุทธ์/จัดทีม/บอส)", value: "Guild Quest" },
          { name: "💎 Gacha & Orbs (วิเคราะห์ตู้กาชา/ความคุ้มค่า)", value: "Gacha Analysis" },
          { name: "⚡ Character Build (Link Slot/Transcendence/Bonus Ability)", value: "Character Build" },
          { name: "🎮 Beginner & General (มือใหม่/เทคนิคทั่วไป)", value: "General Tips" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("รายละเอียดคำถาม (เช่น ตัวละครที่แนะนำ, เซ็ตของ, ตู้กาชาที่สนใจ)")
        .setRequired(true)
    ),

  async execute(interaction) {
    const category = interaction.options.getString("category", true);
    const query = interaction.options.getString("query", true);

    await interaction.deferReply();

    const response = await aiService.getBBSGuide(category, query);
    const chunks = chunkMessage(response);

    await interaction.editReply({
      content: `🎮 **[BBS Guide: ${category}]**\n*ประเด็น: ${query}*\n\n${chunks[0]}`,
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i] });
    }
  },
};
