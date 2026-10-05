import {Events, Guild} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import GuildLog from '../../database/models/GuildLog.model';
import NukeLog from '../../database/models/NukeLog.model';

export default class BotRemovedEvent extends Event {
  constructor() {
    super(Events.GuildDelete);
  }

  async run(client: ExtendedClient, guild: Guild) {
    await GuildLog.destroy({where: {guildId: guild.id}});
    await NukeLog.destroy({where: {guildId: guild.id}});
  }
}
