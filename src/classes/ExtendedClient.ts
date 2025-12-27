import {ActivityType, Client, GatewayIntentBits, Partials} from 'discord.js';
import IClient from '../interfaces/IClient';
import {EventManager} from '../events/EventManager';
import {CommandManager} from '../commands/CommandManager';
import Config from '../config/Config';
import {IComponent} from '../interfaces/IComponent';
import {SQLize} from '../database/SQLize';
import path = require('path');
import ApplicationEmoji from '../api/discord/ApplicationEmoji';

import {loadModels} from '../database/models/index';

export default class ExtendedClient extends Client implements IClient {
  constructor() {
    super({
      intents: Object.values(GatewayIntentBits) as number[],
      partials: Object.values(Partials) as Partials[],
      presence: {
        activities: [
          {
            name: 'ManagerBot @ 0.0.1',
            type: ActivityType.Watching,
            state: 'Provided by NStore!',
          },
        ],
      },
    });
  }
  api = {
    emojiAPI: new ApplicationEmoji(this),
  };
  components: Map<string, IComponent> = new Map();
  eventManager = new EventManager(this);
  commandManager = new CommandManager(this);
  database = SQLize.getInstance(
    path.join(__dirname, '..', 'database', 'database.sqlite'),
  );

  async initialize(): Promise<void> {
    loadModels(this.database.getSequelize());
    await this.database.getSync();
    await this.eventManager.loadEvents();
    await this.login(Config.getInstance().token);
    await this.commandManager.loadCommands();
  }
}
