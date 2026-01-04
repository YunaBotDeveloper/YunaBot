import * as path from 'path';
import * as fs from 'fs';
import ExtendedClient from '../classes/ExtendedClient';
import Log4TS from '../logger/Log4TS';

export class EventManager {
  private client: ExtendedClient;
  private logger: Log4TS;

  constructor(client: ExtendedClient) {
    this.client = client;
    this.logger = Log4TS.getLogger();
  }

  public async loadEvents(): Promise<void> {
    const eventsDir = path.join(__dirname, 'impl');
    const files = fs.readdirSync(eventsDir);

    for (const file of files) {
      const event = require(path.join(eventsDir, file)).default;

      const eventInstances = new event(this.client);
      if (eventInstances.once) {
        this.client.once(eventInstances.name, (...args) =>
          eventInstances.run(this.client, ...args),
        );
      } else {
        this.client.on(eventInstances.name, (...args) =>
          eventInstances.run(this.client, ...args),
        );
      }
      this.logger.info('Loaded ' + file + ' event');
    }
  }
}
