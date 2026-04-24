import {Events, GuildMember, MessageFlags, TextChannel} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {ComponentParser} from '../../util/ComponentParser';
import GuildTemplateCacheService from '../../services/GuildTemplateCacheService';

export default class WelcomeEvent extends Event {
  constructor() {
    super(Events.GuildMemberAdd);
  }

  async run(client: ExtendedClient, member: GuildMember) {
    if (member.user.bot) return;

    try {
      const template =
        await GuildTemplateCacheService.getInstance().getTemplatePayload(
          member.guild.id,
          'welcome',
        );
      if (!template) return;

      const containers = ComponentParser.parse(template.containerJson, {
        user: member.user,
        guild: member.guild,
      });

      const channel = await member.guild.channels
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
