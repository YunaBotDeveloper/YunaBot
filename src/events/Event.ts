import ExtendedClient from '../classes/ExtendedClient';
import {IEvent} from '../interfaces/IEvent';

export default abstract class Event implements IEvent {
  public name: string;
  public once: boolean;

  constructor(name: string, once = false) {
    this.name = name;
    this.once = once;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract run(client: ExtendedClient, ...args: any[]): Promise<void>;
}
