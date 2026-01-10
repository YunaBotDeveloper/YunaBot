import ExtendedClient from '../classes/ExtendedClient';
import {Command} from './Command';
import {ContextMenuCommand} from './ContextMenuCommand';
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
  private contextMenuCommands: ContextMenuCommand[];
  private rest: REST;
  private logger: Log4TS;

  constructor(client: ExtendedClient) {
    this.client = client;
    this.slashCommands = [];
    this.prefixCommands = [];
    this.contextMenuCommands = [];
    const token = Config.getInstance().token;
    if (!token) {
      throw new Error('Bot token is not configured in config.yaml');
    }
    this.rest = new REST({version: '10'}).setToken(token);
    this.logger = Log4TS.getLogger();
  }

  public async loadCommands(): Promise<void> {
    const commandsDir = path.join(__dirname, 'impl');
    const subDirs = fs.readdirSync(commandsDir);

    for (const subDir of subDirs) {
      const subDirPath = path.join(commandsDir, subDir);
      const stat = fs.statSync(subDirPath);

      if (!stat.isDirectory()) continue;

      // Check if this directory contains category folders or command files
      const items = fs.readdirSync(subDirPath);

      for (const item of items) {
        const itemPath = path.join(subDirPath, item);
        const itemStat = fs.statSync(itemPath);

        if (itemStat.isDirectory()) {
          // This is a category folder, load commands from it
          const categoryName = item;
          const categoryFiles = fs.readdirSync(itemPath);

          for (const file of categoryFiles) {
            if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

            const filePath = path.join(itemPath, file);
            this.loadCommandFile(filePath, file, categoryName);
          }
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
          this.loadCommandFile(itemPath, item, undefined);
        }
      }
    }

    const allCommands = [
      ...this.slashCommands.map(cmd => cmd.data.toJSON()),
      ...this.contextMenuCommands.map(cmd => cmd.data.toJSON()),
    ];

    await this.rest.put(
      Routes.applicationCommands(this.client.user?.id as string),
      {body: allCommands},
    );
    this.logger.success('Slash commands are now available on Discord API');
    this.logger.success(
      'Context menu commands are now available on Discord API',
    );
  }

  private loadCommandFile(
    filePath: string,
    fileName: string,
    category?: string,
  ): void {
    try {
      const imported = require(filePath);
      const commandClass = imported?.default ?? imported;

      if (typeof commandClass !== 'function') {
        this.logger.warning(
          'Skipped loading command file: ' +
            fileName +
            ' because it does not export a constructor',
        );
        return;
      }

      const commandInstance = new commandClass();

      if (commandInstance instanceof Command) {
        commandInstance.category = category;
        this.slashCommands.push(commandInstance);
        this.logger.info(
          `Loaded slash command: ${fileName}${category ? ` (category: ${category})` : ''}`,
        );
      } else if (commandInstance instanceof PrefixCommand) {
        this.prefixCommands.push(commandInstance);
        this.logger.info('Loaded prefix command: ' + fileName);
      } else if (commandInstance instanceof ContextMenuCommand) {
        this.contextMenuCommands.push(commandInstance);
        this.logger.info('Loaded context menu command: ' + fileName);
      } else {
        this.logger.warning(
          'The command: ' +
            fileName +
            ' does not match any structures of Command, PrefixCommand or ContextMenuCommand as expected',
        );
      }
    } catch (e) {
      this.logger.error(e);
    }
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

  public getContextMenuCommand(name: string): ContextMenuCommand | undefined {
    return this.contextMenuCommands.find(cmd => cmd.data.name === name);
  }

  public getAllContextMenuCommand(): ContextMenuCommand[] {
    return this.contextMenuCommands;
  }

  public getContextMenuCommandSize(): number {
    return this.contextMenuCommands.length;
  }

  public getCommandsByCategory(category: string): Command[] {
    return this.slashCommands.filter(cmd => cmd.category === category);
  }

  public getAllCategories(): string[] {
    const categories = new Set<string>();
    this.slashCommands.forEach(cmd => {
      if (cmd.category) {
        categories.add(cmd.category);
      }
    });
    return Array.from(categories).sort();
  }
}
