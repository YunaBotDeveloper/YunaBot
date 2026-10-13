import ExtendedClient from '../classes/ExtendedClient';

export default abstract class Event {
  public name: string;
  public once: boolean;

  constructor(name: string, once = false) {
    this.name = name;
    this.once = once;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract run(client: ExtendedClient, ...args: any[]): Promise<void>;
}
