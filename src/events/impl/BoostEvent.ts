import {Events, GuildMember, MessageFlags, TextChannel} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {ComponentParser} from '../../util/ComponentParser';
import GuildTemplateCacheService from '../../services/GuildTemplateCacheService';

export default class BoostEvent extends Event {
  constructor() {
    super(Events.GuildMemberUpdate);
  }

  async run(
    client: ExtendedClient,
    oldMember: GuildMember,
    newMember: GuildMember,
  ) {
    if (oldMember.premiumSince !== newMember.premiumSince) {
      try {
        const template =
          await GuildTemplateCacheService.getInstance().getTemplatePayload(
            newMember.guild.id,
            'boost',
          );
        if (!template) return;

        const containers = ComponentParser.parse(template.containerJson, {
          user: newMember.user,
          guild: newMember.guild,
        });

        const channel = await newMember.guild.channels
          .fetch(template.channelId)
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
}
