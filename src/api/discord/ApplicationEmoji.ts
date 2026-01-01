import axios from 'axios';
import ExtendedClient from '../../classes/ExtendedClient';
import Config from '../../config/Config';

export default class ApplicationEmoji {
  private client: ExtendedClient;
  constructor(client: ExtendedClient) {
    this.client = client;
  }

  public async getEmojiByName(name: string): Promise<string | undefined> {
    const res = await axios.get(
      'https://discord.com/api/v10/applications/' +
        this.client.user?.id +
        '/emojis',
      {
        headers: {
          Authorization: 'Bot ' + Config.getInstance().token,
        },
      },
    );

    if (res.status !== 200) return;

    const itemData = res.data.items;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchingEmoji = itemData.find((item: any) => item.name === name);

    if (!matchingEmoji) return;

    return '<:' + matchingEmoji.name + ':' + matchingEmoji.id + '>';
  }
}
