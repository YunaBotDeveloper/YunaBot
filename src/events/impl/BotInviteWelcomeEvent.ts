import ExtendedClient from '../../classes/ExtendedClient';
import Event from '../Event';
import {AuditLogEvent, Events, Guild} from 'discord.js';

export default class BotInviteWelcomeEvent extends Event {
  constructor() {
    super(Events.GuildCreate);
  }

  async run(client: ExtendedClient, guild: Guild) {
    const fetchedLog = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.BotAdd,
    });
    const auditLog = fetchedLog.entries.first();
    const executor = auditLog?.executor;
    if (!auditLog || !executor) return;
    const member = await guild.members.fetch(executor.id);
    await member.send(
      'cam on ban da moi bot cua chung toi, chuc ban 1 ngay vui ve!!!!!!!!!!!!!',
    );
    return;
  }
}
