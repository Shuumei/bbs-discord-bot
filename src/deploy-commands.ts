import { REST, Routes } from "discord.js";
import { config, validateConfig } from "./config.js";
import { commandList } from "./commands/index.js";

async function deploy() {
  const validation = validateConfig();
  if (!config.discordToken || !config.discordClientId) {
    console.error("❌ Cannot deploy commands! Missing required environment variables:");
    validation.warnings.forEach((w) => console.error("  ", w));
    process.exit(1);
  }

  const commandsData = commandList.map((cmd) => cmd.data.toJSON());

  console.log(`🗡️ Registering ${commandsData.length} slash command(s)...`);
  commandsData.forEach((c) => console.log(`   - /${c.name}: ${c.description}`));

  const rest = new REST({ version: "10" }).setToken(config.discordToken);

  try {
    if (config.discordGuildId) {
      console.log(`⚡ Deploying guild commands to Guild ID: ${config.discordGuildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId),
        { body: commandsData }
      );
      console.log("✅ Successfully registered slash commands to the guild!");
    } else {
      console.log("🌐 Deploying global commands to Discord (may take a few minutes to cache globally)...");
      await rest.put(
        Routes.applicationCommands(config.discordClientId),
        { body: commandsData }
      );
      console.log("✅ Successfully registered global slash commands!");
    }
  } catch (error: any) {
    console.error("❌ Failed to deploy commands:", error?.message || error);
    process.exit(1);
  }
}

deploy();
