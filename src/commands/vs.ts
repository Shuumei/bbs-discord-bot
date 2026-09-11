import { SlashCommandBuilder } from "discord.js";
import { Command } from "../types/index.js";
import { aiService, chunkMessage } from "../services/ai.js";

export const vsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("vs")
    .setDescription("จำลองและวิเคราะห์แมตช์การต่อสู้ระหว่าง 2 ตัวละครในจักรวาล Bleach (VS Battle)")
    .addStringOption((option) =>
      option
        .setName("character1")
        .setDescription("ตัวละครที่ 1 (เช่น ยามาโมโตะ บังไค, อิจิโกะ True Bankai, ไอเซ็น มุเก็น)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("character2")
        .setDescription("ตัวละครที่ 2 (เช่น ยูฮาบัคห์ The Almighty, อิจิเบย์ เฮียวซึเบะ, เคมปาจิ บังไค)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("setting")
        .setDescription("เงื่อนไขหรือสนามประลองพิเศษ (ออปชันนอล เช่น พระราชวังราชันวิญญาณ, ลาส นอเชส)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const char1 = interaction.options.getString("character1", true);
    const char2 = interaction.options.getString("character2", true);
    const setting = interaction.options.getString("setting") || undefined;

    await interaction.deferReply();

    const response = await aiService.analyzeVSBattle(char1, char2, setting);
    const chunks = chunkMessage(response);

    await interaction.editReply({
      content: `⚔️ **[Bleach VS Battle Analysis: ${char1} VS ${char2}]**\n\n${chunks[0]}`,
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i] });
    }
  },
};
