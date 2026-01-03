/**
 * CommandManager - Manages loading and registering slash and prefix commands
 *
 * Handles:
 * - Loading command files from the impl directory
 * - Registering slash commands with Discord API
 * - Retrieving commands by name or alias
 */
import ExtendedClient from '../classes/ExtendedClient';
import {Command} from './Command';
import * as path from 'path';
import * as fs from 'fs';
import {REST, Routes} from 'discord.js';
import Config from '../config/Config';
import Log4TS from '../logger/Log4TS';
import {PrefixCommand} from './PrefixCommand';

export class CommandManager {
  /** The Discord client instance */
  private client: ExtendedClient;
  /** Array of loaded slash commands */
  private slashCommands: Command[];
  /** Array of loaded prefix commands */
  private prefixCommands: PrefixCommand[];
  /** REST client for Discord API */
  private rest: REST;
  /** Logger instance */
  private logger: Log4TS;

  /**
   * Create a new CommandManager
   * @param client - The ExtendedClient instance
   */
  constructor(client: ExtendedClient) {
    this.client = client;
    this.slashCommands = [];
    this.prefixCommands = [];
    const token = Config.getInstance().token;
    if (!token) {
      throw new Error('Bot token is not configured in config.yaml');
    }
    this.rest = new REST({version: '10'}).setToken(token);
    this.logger = Log4TS.getLogger();
  }

  /**
   * Load all commands from the impl directory and register slash commands with Discord
   */
  public async loadCommands(): Promise<void> {
    const commandsDir = path.join(__dirname, 'impl');
    const subDirs = fs.readdirSync(commandsDir);

    for (const subDir of subDirs) {
      const subDirPath = path.join(commandsDir, subDir);
      const files = fs.readdirSync(subDirPath);
      for (const file of files) {
        const filePath = path.join(subDirPath, file);
        try {
          const imported = require(filePath);
          const commandClass = imported?.default ?? imported;

          if (typeof commandClass !== 'function') {
            this.logger.warning(
              'Skipped loading command file: ' +
                file +
                ' because it does not export a constructor',
            );
            continue;
          }

          const commandInstance = new commandClass();

          if (commandInstance instanceof Command) {
            this.slashCommands.push(commandInstance);
            this.logger.info('Loaded slash command: ' + file);
          } else if (commandInstance instanceof PrefixCommand) {
            this.prefixCommands.push(commandInstance);
            this.logger.info('Loaded prefix command: ' + file);
          } else {
            this.logger.warning(
              'The command: ' +
                file +
                ' does not match any structures of Command or PrefixCommand as expected',
            );
          }
        } catch (e) {
          this.logger.error(e);
        }
      }
    }

    await this.rest.put(
      Routes.applicationCommands(this.client.user?.id as string),
      {body: this.slashCommands.map(cmd => cmd.data.toJSON())},
    );
    this.logger.success('Slash commands are now available on Discord API');
  }

  /**
   * Get a slash command by name
   * @param name - The command name
   * @returns The Command instance or undefined if not found
   */
  public getSlashCommand(name: string): Command | undefined {
    return this.slashCommands.find(cmd => cmd.data.name === name);
  }

  /**
   * Get all loaded slash commands
   * @returns Array of all slash commands
   */
  public getAllSlashCommand(): Command[] {
    return this.slashCommands;
  }

  /**
   * Get the number of loaded slash commands
   * @returns Number of slash commands
   */
  public getSlashCommandSize(): number {
    return this.slashCommands.length;
  }

  /**
   * Get a prefix command by name or alias
   * @param name - The command name or alias
   * @returns The PrefixCommand instance or undefined if not found
   */
  public getPrefixCommand(name: string): PrefixCommand | undefined {
    return this.prefixCommands.find(
      prefixcmd => prefixcmd.name === name || prefixcmd.aliases.includes(name),
    );
  }

  /**
   * Get all loaded prefix commands
   * @returns Array of all prefix commands
   */
  public getAllPrefixCommand(): PrefixCommand[] {
    return this.prefixCommands;
  }

  /**
   * Get the number of loaded prefix commands
   * @returns Number of prefix commands
   */
  public getPrefixCommandSize(): number {
    return this.prefixCommands.length;
  }
}
