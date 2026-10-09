import {Events, GuildBan} from 'discord.js';
import {Op} from 'sequelize';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import BanLog from '../../database/models/BanLog.model';
import TempBanService from '../../services/TempBanService';

export default class BanRemoveEvent extends Event {
  constructor() {
    super(Events.GuildBanRemove);
  }

  // Drop the pending tempban on any unban, otherwise a later permanent
  // re-ban of the same user would still be lifted by the stale timer/log.
  async run(client: ExtendedClient, ban: GuildBan): Promise<void> {
    const {guild, user} = ban;
    TempBanService.getInstance().cancelScheduledUnban(guild.id, user.id);
    await BanLog.destroy({
      where: {
        guildId: guild.id,
        userTargetId: user.id,
        duration: {[Op.not]: null},
      },
    });
  }
}
