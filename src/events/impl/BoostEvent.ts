import {Events, GuildMember, MessageFlags} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import GuildEvent from '../../database/models/GuildEvent.model';
import GuildContainer from '../../database/models/GuildContainer.model';
import {ComponentParser} from '../../util/ComponentParser';
import Log4TS from '../../logger/Log4TS';

const logger = Log4TS.getLogger();

export default class BoostEvent extends Event {
  constructor() {
    super(Events.GuildMemberUpdate);
  }

  async run(
    client: ExtendedClient,
    oldMember: GuildMember,
    newMember: GuildMember,
  ) {
    // Compare timestamps: premiumSince is a fresh Date on every access.
    if (!oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp) {
      try {
        const config = await GuildEvent.findOne({
          where: {
            guildId: newMember.guild.id,
          },
        });

        if (!config?.boostChannelId || !config.boostChannelContainer) return;

        const container = await GuildContainer.findOne({
          where: {
            guildId: newMember.guild.id,
            name: config.boostChannelContainer,
          },
        });

        if (!container) return;

        const containers = ComponentParser.parse(container.json, {
          user: newMember.user,
          guild: newMember.guild,
        });

        const channel = await newMember.guild.channels
          .fetch(config.boostChannelId)
          .catch(() => null);

        if (!channel?.isSendable()) return;

        await channel.send({
          components: containers,
          flags: [MessageFlags.IsComponentsV2],
        });
      } catch (e) {
        logger.error(`[BoostEvent] ${e}`);
      }
    }
  }
}
