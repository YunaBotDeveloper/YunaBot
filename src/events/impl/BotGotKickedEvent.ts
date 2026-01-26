import {Events, Guild} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import GuildPrefix from '../../database/models/GuildPrefix.model';
import GuildLog from '../../database/models/GuildLog.model';
import NukeLog from '../../database/models/NukeLog.model';

export default class BotGotKickedEvent extends Event {
  constructor() {
    super(Events.GuildDelete);
  }

  async run(client: ExtendedClient, guild: Guild) {
    await GuildPrefix.destroy({where: {guildId: guild.id}});
    await GuildLog.destroy({where: {guildId: guild.id}});
    await NukeLog.destroy({where: {guildId: guild.id}});
  }
}
