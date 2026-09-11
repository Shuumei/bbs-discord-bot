import http from "node:http";
import { Client, GatewayIntentBits } from "discord.js";
import { config, validateConfig } from "./config.js";
import { setupReadyEvent } from "./events/ready.js";
import { setupInteractionCreateEvent } from "./events/interactionCreate.js";
import { setupMessageCreateEvent } from "./events/messageCreate.js";

async function bootstrap() {
  console.log("==================================================");
  console.log("🗡️  BLEACH: BRAVE SOULS GUILD DISCORD BOT");
  console.log("    'Bankai: Minazuki & Zanka no Tachi Ready'");
  console.log("==================================================");

  const { valid, warnings } = validateConfig();

  if (warnings.length > 0) {
    console.log("\n[System Warnings]:");
    warnings.forEach((w) => console.log(`  ${w}`));
    console.log("");
  }

  if (!valid) {
    console.error("❌ Fatal: Missing essential credentials in .env. Bot startup aborted.");
    console.log("👉 Please check .env or refer to README.md for setup instructions.");
    process.exit(1);
  }

  // HTTP Health-Check Server (จำเป็นสำหรับ Render Free Web Service)
  const port = process.env.PORT || 3000;
  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("🗡️ Bleach: Brave Souls Discord Bot is alive and running!");
  });

  httpServer.listen(port, () => {
    console.log(`🌐 Health check server listening on port ${port}`);
  });

  // Initialize Discord Client with required Intents
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Attach Event Handlers
  setupReadyEvent(client);
  setupInteractionCreateEvent(client);
  setupMessageCreateEvent(client);

  // Graceful shutdown handling
  const handleShutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Sealing Bankai and disconnecting bot...`);
    httpServer.close();
    client.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  // Connect to Discord
  try {
    console.log("📡 Connecting to Soul Society (Discord Gateway)...");
    await client.login(config.discordToken);
  } catch (error: any) {
    console.error("❌ Login failed:", error?.message || error);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error("💥 Unhandled bootstrap error:", err);
  process.exit(1);
});
