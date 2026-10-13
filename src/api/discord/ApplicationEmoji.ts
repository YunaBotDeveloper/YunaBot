import ExtendedClient from '../../classes/ExtendedClient';

export default class ApplicationEmoji {
  private client: ExtendedClient;
  private warmed = false;
  private warming: Promise<void> | null = null;

  constructor(client: ExtendedClient) {
    this.client = client;
  }

  public async warmCache(): Promise<void> {
    const emojis = await this.client.application?.emojis
      .fetch()
      .catch(() => null);
    if (emojis) this.warmed = true;
  }

  public async getEmojiByName(name: string): Promise<string | undefined> {
    if (!this.warmed) {
      // Share one in-flight request instead of one per concurrent call.
      this.warming ??= this.warmCache().finally(() => (this.warming = null));
      await this.warming;
    }
    return this.client.application?.emojis.cache
      .find(emoji => emoji.name === name)
      ?.toString();
  }
}
