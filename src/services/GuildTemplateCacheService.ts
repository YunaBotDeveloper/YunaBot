import GuildContainer from '../database/models/GuildContainer.model';
import GuildEvent from '../database/models/GuildEvent.model';

const CACHE_TTL_MS = 60 * 1000;

type CachedValue<T> = {
  expiresAt: number;
  value: T | null;
};

type TemplateType = 'welcome' | 'goodbye' | 'boost';

export interface GuildTemplatePayload {
  channelId: string;
  containerJson: string;
}

export class GuildTemplateCacheService {
  private static instance: GuildTemplateCacheService | null = null;
  private guildEventCache = new Map<string, CachedValue<GuildEvent>>();
  private containerCache = new Map<string, CachedValue<GuildContainer>>();

  private constructor() {}

  public static getInstance(): GuildTemplateCacheService {
    if (!GuildTemplateCacheService.instance) {
      GuildTemplateCacheService.instance = new GuildTemplateCacheService();
    }
    return GuildTemplateCacheService.instance;
  }

  private isFresh<T>(item: CachedValue<T> | undefined): item is CachedValue<T> {
    return !!item && item.expiresAt > Date.now();
  }

  public invalidateGuild(guildId: string): void {
    this.guildEventCache.delete(guildId);

    for (const key of this.containerCache.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        this.containerCache.delete(key);
      }
    }
  }

  public invalidateContainer(guildId: string, name: string): void {
    this.containerCache.delete(`${guildId}:${name}`);
  }

  private async getGuildEventConfig(
    guildId: string,
  ): Promise<GuildEvent | null> {
    const cached = this.guildEventCache.get(guildId);
    if (this.isFresh(cached)) {
      return cached.value;
    }

    const value =
      (await GuildEvent.findOne({
        where: {guildId},
      })) ?? null;

    this.guildEventCache.set(guildId, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });

    return value;
  }

  private async getContainer(
    guildId: string,
    name: string,
  ): Promise<GuildContainer | null> {
    const key = `${guildId}:${name}`;
    const cached = this.containerCache.get(key);
    if (this.isFresh(cached)) {
      return cached.value;
    }

    const value =
      (await GuildContainer.findOne({
        where: {
          guildId,
          name,
        },
      })) ?? null;

    this.containerCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });

    return value;
  }

  public async getTemplatePayload(
    guildId: string,
    type: TemplateType,
  ): Promise<GuildTemplatePayload | null> {
    const config = await this.getGuildEventConfig(guildId);
    if (!config) {
      return null;
    }

    const templateByType = {
      welcome: {
        channelId: config.welcomeChannelId,
        containerName: config.welcomeChannelContainer,
      },
      goodbye: {
        channelId: config.goodbyeChannelId,
        containerName: config.goodbyeChannelContainer,
      },
      boost: {
        channelId: config.boostChannelId,
        containerName: config.boostChannelContainer,
      },
    }[type];

    if (!templateByType.channelId || !templateByType.containerName) {
      return null;
    }

    const container = await this.getContainer(
      guildId,
      templateByType.containerName,
    );
    if (!container) {
      return null;
    }

    return {
      channelId: templateByType.channelId,
      containerJson: container.json,
    };
  }
}

export default GuildTemplateCacheService;
