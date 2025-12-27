import {Message} from 'discord.js';
import ExtendedClient from '../classes/ExtendedClient';

export interface IPrefixCommand {
  name: string;
  aliases?: string[];
  cooldown?: number;
  run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ): Promise<void>;
}
