import { Collection } from "discord.js";
import { Command } from "../types/index.js";
import { pingCommand } from "./ping.js";
import { bleachLoreCommand } from "./bleach-lore.js";
import { bbsGuideCommand } from "./bbs-guide.js";
import { vsCommand } from "./vs.js";
import { newsConfigCommand } from "./news-config.js";

export const commands = new Collection<string, Command>();

const commandList: Command[] = [
  pingCommand,
  bleachLoreCommand,
  bbsGuideCommand,
  vsCommand,
  newsConfigCommand,
];

for (const command of commandList) {
  commands.set(command.data.name, command);
}

export { commandList };
