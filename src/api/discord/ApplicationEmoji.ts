import axios from 'axios';
import ExtendedClient from '../../classes/ExtendedClient';
import Config from '../../config/Config';

export default class ApplicationEmoji {
  private client: ExtendedClient;
  private cache: Map<string, string> = new Map();
  private warmed = false;

  constructor(client: ExtendedClient) {
    this.client = client;
  }

  public async warmCache(): Promise<void> {
    const res = await axios
      .get(
        'https://discord.com/api/v10/applications/' +
          this.client.user?.id +
          '/emojis',
        {
          headers: {
            Authorization: 'Bot ' + Config.getInstance().token,
          },
        },
      )
      .catch(() => null);

    if (!res || res.status !== 200) return;

    for (const item of res.data.items) {
      const prefix = item.animated ? '<a:' : '<:';
      this.cache.set(item.name, prefix + item.name + ':' + item.id + '>');
    }

    this.warmed = true;
  }

  public async getEmojiByName(name: string): Promise<string | undefined> {
    if (!this.warmed) {
      await this.warmCache();
    }
    return this.cache.get(name);
  }
}
