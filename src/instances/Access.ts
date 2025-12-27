import ExtendedClient from '../classes/ExtendedClient';

export default class Access {
  private static clientInstance: ExtendedClient;

  private constructor() {}

  public static getClient(): ExtendedClient {
    if (!this.clientInstance) {
      this.clientInstance = new ExtendedClient();
    }
    return this.clientInstance;
  }
}
