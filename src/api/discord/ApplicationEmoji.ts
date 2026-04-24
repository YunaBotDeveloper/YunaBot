import axios from 'axios';
import ExtendedClient from '../../classes/ExtendedClient';
import Config from '../../config/Config';
import Log4TS from '../../logger/Log4TS';

const EMOJI_CACHE_TTL_MS = 5 * 60 * 1000;
const EMOJI_REQUEST_TIMEOUT_MS = 3000;

interface DiscordApplicationEmoji {
  id: string;
  name: string;
  animated?: boolean;
}

export default class ApplicationEmoji {
  private client: ExtendedClient;
  private logger = Log4TS.getLogger();
  private emojiCache: {
    expiresAt: number;
    byName: Map<string, string>;
  } | null = null;
  private pendingFetch: Promise<Map<string, string>> | null = null;

  constructor(client: ExtendedClient) {
    this.client = client;
  }

  public invalidateCache(): void {
    this.emojiCache = null;
  }

  private isCacheFresh(): boolean {
    return !!this.emojiCache && this.emojiCache.expiresAt > Date.now();
  }

  private async fetchEmojiMap(): Promise<Map<string, string>> {
    const start = Date.now();
    const res = await axios.get(
      'https://discord.com/api/v10/applications/' +
        this.client.user?.id +
        '/emojis',
      {
        timeout: EMOJI_REQUEST_TIMEOUT_MS,
        headers: {
          Authorization: 'Bot ' + Config.getInstance().token,
        },
      },
    );

    if (res.status !== 200) {
      throw new Error(`Failed to fetch application emojis: ${res.status}`);
    }

    const byName = new Map<string, string>();
    const itemData = (res.data.items ?? []) as DiscordApplicationEmoji[];

    for (const emoji of itemData) {
      const prefix = emoji.animated ? '<a:' : '<:';
      byName.set(emoji.name, `${prefix}${emoji.name}:${emoji.id}>`);
    }

    this.logger.debug(
      `[Perf] Refreshed ${byName.size} app emojis in ${Date.now() - start}ms`,
    );

    return byName;
  }

  private async getEmojiMap(): Promise<Map<string, string>> {
    if (this.isCacheFresh()) {
      return this.emojiCache!.byName;
    }

    if (this.pendingFetch) {
      return this.pendingFetch;
    }

    this.pendingFetch = this.fetchEmojiMap()
      .then(byName => {
        this.emojiCache = {
          expiresAt: Date.now() + EMOJI_CACHE_TTL_MS,
          byName,
        };
        return byName;
      })
      .catch(error => {
        this.logger.warning(
          `Failed to refresh app emoji cache, using stale cache if available: ${error}`,
        );
        if (this.emojiCache) {
          return this.emojiCache.byName;
        }
        return new Map<string, string>();
      })
      .finally(() => {
        this.pendingFetch = null;
      });

    return this.pendingFetch;
  }

  public async getEmojiByName(name: string): Promise<string | undefined> {
    const emojiMap = await this.getEmojiMap();
    return emojiMap.get(name);
  }
}
