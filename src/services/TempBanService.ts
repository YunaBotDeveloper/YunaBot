import BanLog from '../database/models/BanLog.model';
import Log4TS from '../logger/Log4TS';
import Access from '../instances/Access';

interface PendingUnban {
  guildId: string;
  userId: string;
  unbanAt: number;
  timeoutId: NodeJS.Timeout;
}

export default class TempBanService {
  private static instance: TempBanService;
  private logger = Log4TS.getLogger();
  private pendingUnbans: Map<string, PendingUnban> = new Map();

  private constructor() {}

  public static getInstance(): TempBanService {
    if (!TempBanService.instance) {
      TempBanService.instance = new TempBanService();
    }
    return TempBanService.instance;
  }

  public async loadPendingUnbans(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    const activeBans = await BanLog.findAll({
      where: {
        duration: {
          not: null as unknown as undefined,
        },
      },
    });

    for (const ban of activeBans) {
      if (!ban.duration) continue;

      const unbanAt = ban.time + ban.duration;
      const timeRemaining = unbanAt - now;

      if (timeRemaining <= 0) {
        // Ban already expired, unban now
        await this.executeUnban(ban.guildId, ban.userTargetId);
        await this.removeBanLog(ban.guildId, ban.banId);
      } else {
        // Schedule unban
        this.scheduleUnban(
          ban.guildId,
          ban.userTargetId,
          ban.banId,
          timeRemaining * 1000,
        );
      }
    }

    this.logger.info(`Loaded ${this.pendingUnbans.size} pending tempbans`);
  }

  public scheduleUnban(
    guildId: string,
    userId: string,
    banId: string,
    durationMs: number,
  ): void {
    const key = `${guildId}-${userId}`;

    // Clear existing timeout if any
    if (this.pendingUnbans.has(key)) {
      const existing = this.pendingUnbans.get(key)!;
      clearTimeout(existing.timeoutId);
    }

    const timeoutId = setTimeout(async () => {
      await this.executeUnban(guildId, userId);
      await this.removeBanLog(guildId, banId);
      this.pendingUnbans.delete(key);
    }, durationMs);

    this.pendingUnbans.set(key, {
      guildId,
      userId,
      unbanAt: Date.now() + durationMs,
      timeoutId,
    });

    this.logger.info(
      `Scheduled unban for user ${userId} in guild ${guildId} (${Math.round(durationMs / 1000)}s)`,
    );
  }

  private async executeUnban(guildId: string, userId: string): Promise<void> {
    try {
      const client = Access.getClient();
      const guild = await client.guilds.fetch(guildId).catch(() => null);

      if (!guild) {
        this.logger.warning(`Guild ${guildId} not found for unban`);
        return;
      }

      // Check if user is still banned
      const ban = await guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        this.logger.info(`User ${userId} is not banned in ${guildId}`);
        return;
      }

      await guild.members.unban(userId, 'Tempban expired');
      this.logger.success(
        `Unbanned user ${userId} from ${guildId} (tempban expired)`,
      );
    } catch (error) {
      this.logger.error(`Failed to unban user ${userId}: ${error}`);
    }
  }

  private async removeBanLog(guildId: string, banId: string): Promise<void> {
    try {
      await BanLog.destroy({
        where: {
          guildId,
          banId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to remove ban log ${banId}: ${error}`);
    }
  }

  public cancelScheduledUnban(guildId: string, userId: string): void {
    const key = `${guildId}-${userId}`;
    const pending = this.pendingUnbans.get(key);

    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingUnbans.delete(key);
      this.logger.info(`Cancelled scheduled unban for ${userId} in ${guildId}`);
    }
  }

  public isTempBanned(guildId: string, userId: string): boolean {
    return this.pendingUnbans.has(`${guildId}-${userId}`);
  }
}
