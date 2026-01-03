/**
 * Event - Abstract base class for Discord event handlers
 *
 * All event handlers should extend this class and implement the run() method.
 * Set 'once' to true if the event should only trigger once.
 *
 * Example:
 * ```typescript
 * export default class ReadyEvent extends Event {
 *   constructor() {
 *     super(Events.ClientReady, true); // name, once
 *   }
 *   async run(client) {
 *     console.log('Bot is ready!');
 *   }
 * }
 * ```
 */
import ExtendedClient from '../classes/ExtendedClient';
import {IEvent} from '../interfaces/IEvent';

export default abstract class Event implements IEvent {
  /** Discord event name (e.g., Events.MessageCreate) */
  public name: string;
  /** Whether the event should only trigger once */
  public once: boolean;

  /**
   * Create a new Event
   * @param name - The Discord event name
   * @param once - Whether the event should only trigger once (default: false)
   */
  constructor(name: string, once = false) {
    this.name = name;
    this.once = once;
  }

  /**
   * Handle the event
   * @param client - The ExtendedClient instance
   * @param args - Event-specific arguments from Discord.js
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract run(client: ExtendedClient, ...args: any[]): Promise<void>;
}
