import {Events, GuildMember, MessageFlags, TextChannel} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import GuildEvent from '../../database/models/GuildEvent.model';
import GuildContainer from '../../database/models/GuildContainer.model';
import {ComponentParser} from '../../util/ComponentParser';

export default class GoodbyeEvent extends Event {
  constructor() {
    super(Events.GuildMemberRemove);
  }

  async run(client: ExtendedClient, member: GuildMember) {
    if (member.user.bot) return;

    try {
      const config = await GuildEvent.findOne({
        where: {
          guildId: member.guild.id,
        },
      });

      if (!config?.goodbyeChannelId || !config.goodbyeChannelContainer) return;

      const container = await GuildContainer.findOne({
        where: {
          guildId: member.guild.id,
          name: config.goodbyeChannelContainer,
        },
      });

      if (!container) return;

      const containers = ComponentParser.parse(container.json, {
        user: member.user,
        guild: member.guild,
      });

      const channel = await member.guild.channels
        .fetch(config.goodbyeChannelId)
        .catch(() => null);

      if (!channel || !(channel instanceof TextChannel)) return;

      await channel.send({
        components: containers,
        flags: [MessageFlags.IsComponentsV2],
      });
    } catch {
      //
    }
  }
}
