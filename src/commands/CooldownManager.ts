export class CooldownManager {
  private cooldowns: Map<string, Map<string, number>>;
  private static instance: CooldownManager | null = null;

  constructor() {
    this.cooldowns = new Map();
  }

  public static getCooldownManager(): CooldownManager {
    if (!CooldownManager.instance) {
      CooldownManager.instance = new CooldownManager();
    }

    return CooldownManager.instance;
  }

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

  public getRemainingTime(commandName: string, userId: string): number {
    const userCooldowns = this.cooldowns.get(commandName);
    if (!userCooldowns) return 0;

    const expirationTime = userCooldowns.get(userId);
    if (!expirationTime) return 0;

    return Math.max(0, expirationTime - Date.now());
  }

  public getExpirationTimestamp(
    commandName: string,
    userId: string,
  ): number | null {
    const userCooldowns = this.cooldowns.get(commandName);
    if (!userCooldowns) return null;

    return userCooldowns.get(userId) || null;
  }
}
