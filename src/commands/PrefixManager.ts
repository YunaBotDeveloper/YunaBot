/**
 * PrefixManager - Manages prefixes for each server
 *
 * Uses Singleton pattern to ensure only one instance exists
 * Supports caching for performance (no database query needed every time)
 *
 * Usage:
 * - PrefixManager.getInstance().getPrefix(guildId) - Get prefix for a server
 * - PrefixManager.getInstance().setPrefix(guildId, prefix) - Set new prefix
 * - PrefixManager.getInstance().resetPrefix(guildId) - Reset to default prefix
 */
import GuildPrefix from '../database/models/GuildPrefix.model';

export class PrefixManager {
  private static instance: PrefixManager;
  /** Cache storing prefixes by guildId for performance */
  private prefixCache: Map<string, string> = new Map();
  /** Default prefix for all servers */
  private defaultPrefix: string;

  private constructor() {
    this.defaultPrefix = '!';
  }

  /**
   * Get the singleton instance of PrefixManager
   */
  public static getInstance(): PrefixManager {
    if (!PrefixManager.instance) {
      PrefixManager.instance = new PrefixManager();
    }
    return PrefixManager.instance;
  }

  /**
   * Get the prefix for a specific server
   * Priority: Cache -> Database -> Default
   * @param guildId - The server ID to get prefix for
   * @returns The server's prefix, or default prefix if not set
   */
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

  /**
   * Set a new prefix for a server
   * Uses upsert to create or update if exists
   * @param guildId - The server ID
   * @param prefix - The new prefix
   */
  public async setPrefix(guildId: string, prefix: string): Promise<void> {
    await GuildPrefix.upsert({
      guildId,
      prefix,
    });

    this.prefixCache.set(guildId, prefix);
  }

  /**
   * Reset a server's prefix to default
   * Deletes the record from database and removes from cache
   * @param guildId - The server ID to reset
   */
  public async resetPrefix(guildId: string): Promise<void> {
    await GuildPrefix.destroy({
      where: {guildId},
    });

    this.prefixCache.delete(guildId);
  }

  /**
   * Get the default prefix
   * @returns The default prefix ("!")
   */
  public getDefaultPrefix(): string {
    return this.defaultPrefix;
  }

  /**
   * Clear cache for a specific server or all servers
   * Useful when you need to refresh data from database
   * @param guildId - Server ID (omit to clear all)
   */
  public clearCache(guildId?: string): void {
    if (guildId) {
      this.prefixCache.delete(guildId);
    } else {
      this.prefixCache.clear();
    }
  }
}

export default PrefixManager;
