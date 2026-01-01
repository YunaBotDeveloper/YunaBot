import ExtendedClient from '../classes/ExtendedClient';

export interface IEvent {
  name: string;
  once?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(client: ExtendedClient, ...args: any[]): Promise<void>;
}
