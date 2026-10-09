import {Events, GuildMember, MessageFlags} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import GuildEvent from '../../database/models/GuildEvent.model';
import GuildContainer from '../../database/models/GuildContainer.model';
import {ComponentParser} from '../../util/ComponentParser';
import Log4TS from '../../logger/Log4TS';

const logger = Log4TS.getLogger();

export default class WelcomeEvent extends Event {
  constructor() {
    super(Events.GuildMemberAdd);
  }

  async run(client: ExtendedClient, member: GuildMember) {
    if (member.user.bot) return;

    try {
      const config = await GuildEvent.findOne({
        where: {
          guildId: member.guild.id,
        },
      });

      if (!config?.welcomeChannelId || !config.welcomeChannelContainer) return;

      const container = await GuildContainer.findOne({
        where: {
          guildId: member.guild.id,
          name: config.welcomeChannelContainer,
        },
      });

      if (!container) return;

      const containers = ComponentParser.parse(container.json, {
        user: member.user,
        guild: member.guild,
      });

      const channel = await member.guild.channels
        .fetch(config.welcomeChannelId)
        .catch(() => null);

      if (!channel?.isSendable()) return;

      await channel.send({
        components: containers,
        flags: [MessageFlags.IsComponentsV2],
      });
    } catch (e) {
      logger.error(`[WelcomeEvent] ${e}`);
    }
  }
}
