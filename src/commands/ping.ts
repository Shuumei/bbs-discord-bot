import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../types/index.js";

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("เช็กสถานะการเชื่อมต่อและแรงดันวิญญาณ (Latency) ของบอท"),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: "⚡ กำลังตรวจวัดแรงดันวิญญาณ (Reiatsu)...",
      fetchReply: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("🗡️ สถานะแรงดันวิญญาณของบอทกิลด์ (Ping)")
      .addFields(
        { name: "📡 Roundtrip Latency", value: `\`${roundtrip}ms\``, inline: true },
        { name: "⚡ WebSocket Heartbeat", value: `\`${wsPing}ms\``, inline: true },
        { name: "🛡️ สถานะระบบ", value: "พร้อมลุย Guild Quest ทุกเมื่อ!", inline: false }
      )
      .setFooter({ text: "Bleach & BBS Guild Companion" })
      .setTimestamp();

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};
