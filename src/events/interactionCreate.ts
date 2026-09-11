import { Client, Interaction } from "discord.js";
import { commands } from "../commands/index.js";

export function setupInteractionCreateEvent(client: Client) {
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) {
      console.warn(`[Command Warning] No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error: any) {
      console.error(`[Command Error] Failed executing ${interaction.commandName}:`, error);

      const errorMessage = "❌ เกิดข้อผิดพลาดในการปลดปล่อยวิชา กรุณาลองใหม่อีกครั้งในภายหลัง!";

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  });
}
