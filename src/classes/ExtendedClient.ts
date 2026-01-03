/**
 * ExtendedClient - Main Discord.js client with extended functionality
 *
 * This class extends the base Discord.js Client and adds:
 * - Event management (EventManager)
 * - Command management (CommandManager) for both slash and prefix commands
 * - Database integration (SQLite via Sequelize)
 * - Custom API utilities (ApplicationEmoji)
 * - Component management for interactive elements
 */
import {ActivityType, Client, GatewayIntentBits, Partials} from 'discord.js';
import IClient from '../interfaces/IClient';
import {EventManager} from '../events/EventManager';
import {CommandManager} from '../commands/CommandManager';
import Config from '../config/Config';
import {IComponent} from '../interfaces/IComponent';
import {SQLize} from '../database/SQLize';
import {initGuildPrefixModel} from '../database/models/GuildPrefix.model';
import path = require('path');
import ApplicationEmoji from '../api/discord/ApplicationEmoji';

export default class ExtendedClient extends Client implements IClient {
  constructor() {
    super({
      intents: Object.values(GatewayIntentBits) as number[],
      partials: Object.values(Partials) as Partials[],
      presence: {
        activities: [
          {
            name: 'ManagerBot v2.0',
            type: ActivityType.Watching,
            state: 'Cooking in discord.js v14',
          },
        ],
      },
    });
  }

  /** API utilities for Discord features */
  api = {
    emojiAPI: new ApplicationEmoji(this),
  };

  /** Map of registered interactive components */
  components: Map<string, IComponent> = new Map();

  /** Event manager for handling Discord events */
  eventManager = new EventManager(this);

  /** Command manager for slash and prefix commands */
  commandManager = new CommandManager(this);

  /** Database connection instance */
  database = SQLize.getInstance(
    path.join(__dirname, '..', 'database', 'database.sqlite'),
  );

  /**
   * Initialize the bot client
   * - Connects to database and syncs models
   * - Loads all event handlers
   * - Logs in to Discord
   * - Loads and registers all commands
   */
  async initialize(): Promise<void> {
    this.database.getSequelize();
    initGuildPrefixModel(this.database.getSequelize());
    await this.database.getSync();
    await this.eventManager.loadEvents();
    await this.login(Config.getInstance().token);
    await this.commandManager.loadCommands();
  }
}
