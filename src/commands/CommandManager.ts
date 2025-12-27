import ExtendedClient from '../classes/ExtendedClient';
import {Command} from './Command';
import * as path from 'path';
import * as fs from 'fs';
import {REST, Routes} from 'discord.js';
import Config from '../config/Config';
import Log4TS from '../logger/Log4TS';
import {PrefixCommand} from './PrefixCommand';

export class CommandManager {
  private client: ExtendedClient;
  private slashCommands: Command[];
  private prefixCommands: PrefixCommand[];
  private rest: REST;
  private logger: Log4TS;

  constructor(client: ExtendedClient) {
    this.client = client;
    this.slashCommands = [];
    this.prefixCommands = [];
    this.rest = new REST({version: '10'}).setToken(Config.getInstance().token);
    this.logger = Log4TS.getLogger();
  }

  public async loadCommands(): Promise<void> {
    const commandsDir = path.join(__dirname, 'impl');
    const subDirs = fs.readdirSync(commandsDir);

    for (const subDir of subDirs) {
      const subDirPath = path.join(commandsDir, subDir);
      const files = fs.readdirSync(subDirPath);
      for (const file of files) {
        const commandClass = require(path.join(subDirPath, file)).default;
        try {
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

  public getSlashCommand(name: string): Command | undefined {
    return this.slashCommands.find(cmd => cmd.data.name === name);
  }

  public getAllSlashCommand(): Command[] {
    return this.slashCommands;
  }

  public getSlashCommandSize(): number {
    return this.slashCommands.length;
  }

  public getPrefixCommand(name: string): PrefixCommand | undefined {
    return this.prefixCommands.find(
      prefixcmd => prefixcmd.name === name || prefixcmd.aliases.includes(name),
    );
  }

  public getAllPrefixCommand(): PrefixCommand[] {
    return this.prefixCommands;
  }

  public getPrefixCommandSize(): number {
    return this.prefixCommands.length;
  }
}
