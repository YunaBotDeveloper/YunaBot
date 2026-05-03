export class CooldownManager {
  private cooldowns: Map<string, number> = new Map();
  private static instance: CooldownManager | null = null;

  public static getCooldownManager(): CooldownManager {
    if (!CooldownManager.instance) {
      CooldownManager.instance = new CooldownManager();
    }
    return CooldownManager.instance;
  }

  private key(commandName: string, userId: string): string {
    return `${commandName}:${userId}`;
  }

  public setCooldown(commandName: string, userId: string, cooldown: number) {
    const k = this.key(commandName, userId);
    this.cooldowns.set(k, Date.now() + cooldown);
    setTimeout(() => this.cooldowns.delete(k), cooldown);
  }

  public isInCooldown(commandName: string, userId: string): boolean {
    const k = this.key(commandName, userId);
    const exp = this.cooldowns.get(k);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.cooldowns.delete(k);
      return false;
    }
    return true;
  }

  public getRemainingTime(commandName: string, userId: string): number {
    const exp = this.cooldowns.get(this.key(commandName, userId));
    if (!exp) return 0;
    return Math.max(0, exp - Date.now());
  }

  public getExpirationTimestamp(
    commandName: string,
    userId: string,
  ): number | null {
    return this.cooldowns.get(this.key(commandName, userId)) ?? null;
  }
}
