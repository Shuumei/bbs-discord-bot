import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface Command {
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: "ANIME_TYBW" | "BBS_UPDATE" | "BBS_GACHA" | "COMMUNITY";
  summary: string;
  details: string;
  sourceUrl?: string;
  bannerImage?: string;
  publishedAt: Date;
}
