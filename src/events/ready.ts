import { Client, ActivityType, Events } from "discord.js";
import { newsService } from "../services/news.js";

export function setupReadyEvent(client: Client) {
  client.once(Events.ClientReady, (c) => {
    console.log(`🗡️ [Bankai Activated] Logged in as ${c.user.tag}!`);
    console.log(`📡 Ready in ${c.guilds.cache.size} server(s).`);

    // Set bot presence
    c.user.setPresence({
      activities: [
        {
          name: "Bleach: Brave Souls | @mention to chat!",
          type: ActivityType.Playing,
        },
      ],
      status: "online",
    });

    // Initialize scheduled news broadcasting
    newsService.initScheduler(client);
  });
}
