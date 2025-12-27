import {Message} from 'discord.js';
import {IPrefixCommand} from '../interfaces/IPrefixCommand';
import ExtendedClient from '../classes/ExtendedClient';

export abstract class PrefixCommand implements IPrefixCommand {
  public name: string;
  public aliases: string[];
  public cooldown: number;

  constructor(name: string, aliases: string[] = [], cooldown = 0) {
    this.name = name;
    this.aliases = aliases;
    this.cooldown = cooldown;
  }

  abstract run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ): Promise<void>;
}
