/**
 * PrefixCommand - Abstract base class for prefix commands
 *
 * All prefix commands should extend this class and implement the run() method.
 * Prefix commands are triggered by messages starting with the server's prefix.
 *
 * Example:
 * ```typescript
 * export default class PingCommand extends PrefixCommand {
 *   constructor() {
 *     super('ping', ['p'], 5000); // name, aliases, cooldown in ms
 *   }
 *   async run(args, context) {
 *     await context.message.reply('Pong!');
 *   }
 * }
 * ```
 */
import {Message} from 'discord.js';
import {IPrefixCommand} from '../interfaces/IPrefixCommand';
import ExtendedClient from '../classes/ExtendedClient';

export abstract class PrefixCommand implements IPrefixCommand {
  /** Command name (used to invoke the command) */
  public name: string;
  /** Alternative names for the command */
  public aliases: string[];
  /** Cooldown time in milliseconds (0 = no cooldown) */
  public cooldown: number;

  constructor(name: string, aliases: string[] = [], cooldown = 0) {
    this.name = name;
    this.aliases = aliases;
    this.cooldown = cooldown;
  }

  /**
   * Execute the command
   * @param args - Array of arguments passed after the command name
   * @param context - Object containing the message and client instance
   */
  abstract run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ): Promise<void>;
}
