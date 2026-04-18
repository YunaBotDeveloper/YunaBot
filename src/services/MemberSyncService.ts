import {Client, Guild, GuildMember as DiscordGuildMember} from 'discord.js';
import GuildMember from '../database/models/GuildMember.model';
import Log4TS from '../logger/Log4TS';

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const BATCH_SIZE = 500;

interface MemberRow {
  userId: string;
  guildId: string;
  username: string;
  displayName: string;
  roles: string;
  joinedAt: string | null;
  isBot: boolean;
}

function memberToRow(member: DiscordGuildMember): MemberRow {
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
  private logger = Log4TS.getLogger();

  private constructor() {}

  public static getInstance(): MemberSyncService {
    if (!MemberSyncService.instance) {
      MemberSyncService.instance = new MemberSyncService();
    }
    return MemberSyncService.instance;
  }

  private async batchUpsert(rows: MemberRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(row => GuildMember.upsert(row)));
    }
  }

  private async removeStaleMembers(
    guildId: string,
    currentUserIds: Set<string>,
  ): Promise<number> {
    const stored = await GuildMember.findAll({where: {guildId}});
    const stale = stored.filter(s => !currentUserIds.has(s.userId));

    if (stale.length === 0) return 0;

    await Promise.all(stale.map(s => s.destroy()));
    return stale.length;
  }

  public async syncGuild(guild: Guild): Promise<void> {
    try {
      const members = await guild.members.fetch();
      const rows = members.map(m => memberToRow(m));
      const currentUserIds = new Set(rows.map(r => r.userId));

      await this.batchUpsert(rows);
      const removedCount = await this.removeStaleMembers(
        guild.id,
        currentUserIds,
      );

      this.logger.info(
        `Synced ${rows.length} members for guild ${guild.name}` +
          (removedCount > 0 ? `, removed ${removedCount} stale` : ''),
      );
    } catch (error) {
      this.logger.error(`Failed to sync guild ${guild.name}: ${error}`);
    }
  }

  public async syncAll(client: Client): Promise<void> {
    const guilds = [...client.guilds.cache.values()];
    this.logger.info(`Starting sync for ${guilds.length} guild(s)`);

    const results = await Promise.allSettled(
      guilds.map(guild => this.syncGuild(guild)),
    );

    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures > 0) {
      this.logger.error(`${failures} guild(s) failed to sync`);
    } else {
      this.logger.success('All guilds synced');
    }
  }

  public startPeriodicSync(client: Client): void {
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(() => {
      this.syncAll(client).catch(err =>
        this.logger.error(`Periodic sync error: ${err}`),
      );
    }, SYNC_INTERVAL_MS);

    this.logger.info('Periodic sync started (every 15 minutes)');
  }

  public stopPeriodicSync(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.logger.info('Periodic sync stopped');
    }
  }

  public async upsertMember(member: DiscordGuildMember): Promise<boolean> {
    try {
      await GuildMember.upsert(memberToRow(member));
      return true;
    } catch (error) {
      this.logger.error(`Failed to upsert member ${member.user.tag}: ${error}`);
      return false;
    }
  }

  public async removeMember(userId: string, guildId: string): Promise<boolean> {
    try {
      const deleted = await GuildMember.destroy({where: {userId, guildId}});
      return deleted > 0;
    } catch (error) {
      this.logger.error(`Failed to remove member ${userId}: ${error}`);
      return false;
    }
  }
}
