import ExtendedClient from '../classes/ExtendedClient';

export interface IEvent {
  name: string;
  once?: boolean;
  run(client: ExtendedClient, ...args: any[]): Promise<void>;
}
