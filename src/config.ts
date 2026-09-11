import dotenv from "dotenv";
dotenv.config();

export interface BotConfig {
  discordToken: string;
  discordClientId: string;
  discordGuildId?: string;
  aiProvider: "openai" | "gemini";
  geminiApiKey: string;
  openaiApiKey: string;
  openaiBaseUrl?: string;
  aiModel: string;
  newsChannelId?: string;
  newsCronSchedule: string;
}

const aiProvider = (process.env.AI_PROVIDER?.toLowerCase() === "openai" ? "openai" : "gemini") as "openai" | "gemini";

export const config: BotConfig = {
  discordToken: process.env.DISCORD_TOKEN || "",
  discordClientId: process.env.DISCORD_CLIENT_ID || "",
  discordGuildId: process.env.DISCORD_GUILD_ID || undefined,
  aiProvider: aiProvider,
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  aiModel: process.env.AI_MODEL || (aiProvider === "gemini" ? "gemini-3.5-flash-lite" : "gpt-4o-mini"),
  newsChannelId: process.env.NEWS_CHANNEL_ID || undefined,
  newsCronSchedule: process.env.NEWS_CRON_SCHEDULE || "0 10 * * *",
};

export function validateConfig(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!config.discordToken) {
    warnings.push("⚠️ DISCORD_TOKEN is missing in .env! The bot cannot login without it.");
  }
  if (!config.discordClientId) {
    warnings.push("⚠️ DISCORD_CLIENT_ID is missing in .env! Slash commands cannot be deployed.");
  }
  
  const hasValidAIKey = config.aiProvider === "gemini" ? Boolean(config.geminiApiKey) : Boolean(config.openaiApiKey);
  if (!hasValidAIKey) {
    warnings.push(`⚠️ ${config.aiProvider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} is missing in .env! AI features will return mock responses.`);
  }

  if (!config.newsChannelId) {
    warnings.push("ℹ️ NEWS_CHANNEL_ID is not configured yet. Automatic news broadcast will be paused until configured.");
  }

  return {
    valid: Boolean(config.discordToken && config.discordClientId),
    warnings,
  };
}
