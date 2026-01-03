/**
 * CooldownManager - Manages command cooldowns per user
 *
 * Uses Singleton pattern to ensure only one instance exists.
 * Tracks cooldown expiration times for each command per user.
 */
export class CooldownManager {
  /** Map of command names to user cooldown maps */
  private cooldowns: Map<string, Map<string, number>>;
  private static instance: CooldownManager | null = null;

  constructor() {
    this.cooldowns = new Map();
  }

  /**
   * Get the singleton instance of CooldownManager
   * @returns The CooldownManager instance
   */
  public static getCooldownManager(): CooldownManager {
    if (!CooldownManager.instance) {
      CooldownManager.instance = new CooldownManager();
    }

    return CooldownManager.instance;
  }

  /**
   * Set a cooldown for a user on a specific command
   * @param commandName - The name of the command
   * @param userId - The user's Discord ID
   * @param cooldown - Cooldown duration in milliseconds
   */
  public setCooldown(commandName: string, userId: string, cooldown: number) {
    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Map());
    }
    const expirationTime = Date.now() + cooldown;

    this.cooldowns.get(commandName)?.set(userId, expirationTime);

    setTimeout(() => {
      this.cooldowns.get(commandName)?.delete(userId);
    }, cooldown);
  }

  /**
   * Check if a user is on cooldown for a command
   * @param commandName - The name of the command
   * @param userId - The user's Discord ID
   * @returns True if user is on cooldown, false otherwise
   */
  public isInCooldown(commandName: string, userId: string): boolean {
    const userCooldowns = this.cooldowns.get(commandName);
    if (!userCooldowns) return false;

    const expirationTime = userCooldowns.get(userId);
    if (!expirationTime) return false;

    if (Date.now() > expirationTime) {
      userCooldowns.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Get remaining cooldown time for a user on a command
   * @param commandName - The name of the command
   * @param userId - The user's Discord ID
   * @returns Remaining time in milliseconds (0 if not on cooldown)
   */
  public getRemainingTime(commandName: string, userId: string): number {
    const userCooldowns = this.cooldowns.get(commandName);
    if (!userCooldowns) return 0;

    const expirationTime = userCooldowns.get(userId);
    if (!expirationTime) return 0;

    return Math.max(0, expirationTime - Date.now());
  }

  /**
   * Get the expiration timestamp for a user's cooldown
   * @param commandName - The name of the command
   * @param userId - The user's Discord ID
   * @returns Expiration timestamp in milliseconds, or null if not on cooldown
   */
  public getExpirationTimestamp(
    commandName: string,
    userId: string,
  ): number | null {
    const userCooldowns = this.cooldowns.get(commandName);
    if (!userCooldowns) return null;

    return userCooldowns.get(userId) || null;
  }
}
