import GuildPrefix from '../database/models/GuildPrefix.model';

export class PrefixManager {
  private static instance: PrefixManager;
  private prefixCache: Map<string, string> = new Map();
  private defaultPrefix: string;

  private constructor() {
    this.defaultPrefix = '!';
  }

  public static getInstance(): PrefixManager {
    if (!PrefixManager.instance) {
      PrefixManager.instance = new PrefixManager();
    }
    return PrefixManager.instance;
  }

  public async getPrefix(guildId: string): Promise<string> {
    if (this.prefixCache.has(guildId)) {
      return this.prefixCache.get(guildId)!;
    }

    const guildPrefix = await GuildPrefix.findByPk(guildId);
    if (guildPrefix) {
      this.prefixCache.set(guildId, guildPrefix.prefix);
      return guildPrefix.prefix;
    }

    return this.defaultPrefix;
  }

  public async setPrefix(guildId: string, prefix: string): Promise<void> {
    await GuildPrefix.upsert({
      guildId,
      prefix,
    });

    this.prefixCache.set(guildId, prefix);
  }

  public async resetPrefix(guildId: string): Promise<void> {
    await GuildPrefix.destroy({
      where: {guildId},
    });

    this.prefixCache.delete(guildId);
  }

  public getDefaultPrefix(): string {
    return this.defaultPrefix;
  }

  public clearCache(guildId?: string): void {
    if (guildId) {
      this.prefixCache.delete(guildId);
    } else {
      this.prefixCache.clear();
    }
  }
}

export default PrefixManager;
