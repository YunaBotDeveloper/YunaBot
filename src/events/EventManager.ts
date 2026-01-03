/**
 * EventManager - Manages loading and registering Discord event handlers
 *
 * Loads event files from the impl directory and registers them
 * with the Discord client (using .on() or .once() based on event config).
 */
import * as path from 'path';
import * as fs from 'fs';
import ExtendedClient from '../classes/ExtendedClient';
import Log4TS from '../logger/Log4TS';

export class EventManager {
  /** The Discord client instance */
  private client: ExtendedClient;
  /** Logger instance */
  private logger: Log4TS;

  /**
   * Create a new EventManager
   * @param client - The ExtendedClient instance
   */
  constructor(client: ExtendedClient) {
    this.client = client;
    this.logger = Log4TS.getLogger();
  }

  /**
   * Load all event handlers from the impl directory
   * Registers each event with the client using .on() or .once()
   */
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
