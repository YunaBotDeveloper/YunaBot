import {Client, Guild, GuildMember as DiscordGuildMember} from 'discord.js';
import GuildMember from '../database/models/GuildMember.model';
import Log4TS from '../logger/Log4TS';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const logger = Log4TS.getLogger();

function memberToRow(member: DiscordGuildMember) {
  return {
    userId: member.user.id,
    guildId: member.guild.id,
    username: member.user.username,
    displayName: member.displayName,
    roles: JSON.stringify(member.roles.cache.map(r => r.id)),
    joinedAt: member.joinedAt?.toISOString() ?? null,
    isBot: member.user.bot,
  };
}

export class MemberSyncService {
  private static instance: MemberSyncService | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): MemberSyncService {
    if (!MemberSyncService.instance) {
      MemberSyncService.instance = new MemberSyncService();
    }
    return MemberSyncService.instance;
  }

  /** Fetch all members for a single guild and upsert into DB. */
  public async syncGuild(guild: Guild): Promise<void> {
    try {
      const members = await guild.members.fetch();
      const rows = members.map(m => memberToRow(m));

      for (const row of rows) {
        await GuildMember.upsert(row);
      }

      // Remove members who left while bot was offline
      const fetchedIds = new Set(rows.map(r => r.userId));
      const stored = await GuildMember.findAll({where: {guildId: guild.id}});
      const stale = stored.filter(s => !fetchedIds.has(s.userId));
      if (stale.length > 0) {
        await Promise.all(stale.map(s => s.destroy()));
      }

      logger.info(
        `[MemberSync] Synced ${rows.length} members for guild ${guild.name}`,
      );
    } catch (error) {
      logger.error(`[MemberSync] Failed to sync guild ${guild.name}: ${error}`);
    }
  }

  /** Sync all guilds the bot is in. Rate limit is per-guild, so fetch all in parallel. */
  public async syncAll(client: Client): Promise<void> {
    const guilds = [...client.guilds.cache.values()];
    logger.info(`[MemberSync] Starting sync for ${guilds.length} guild(s)`);

    await Promise.all(guilds.map(guild => this.syncGuild(guild)));

    logger.success('[MemberSync] All guilds synced');
  }

  /** Start the 15-minute periodic sync. Safe to call multiple times (only one interval runs). */
  public startPeriodicSync(client: Client): void {
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(() => {
      this.syncAll(client).catch(err =>
        logger.error(`[MemberSync] Periodic sync error: ${err}`),
      );
    }, SYNC_INTERVAL_MS);

    logger.info('[MemberSync] Periodic sync started (every 15 minutes)');
  }

  public stopPeriodicSync(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** Upsert a single member (called from event handlers). */
  public async upsertMember(member: DiscordGuildMember): Promise<void> {
    try {
      await GuildMember.upsert(memberToRow(member));
    } catch (error) {
      logger.error(
        `[MemberSync] Failed to upsert member ${member.user.tag}: ${error}`,
      );
    }
  }

  /** Remove a single member from DB (called from GuildMemberRemove). */
  public async removeMember(userId: string, guildId: string): Promise<void> {
    try {
      await GuildMember.destroy({where: {userId, guildId}});
    } catch (error) {
      logger.error(`[MemberSync] Failed to remove member ${userId}: ${error}`);
    }
  }
}
