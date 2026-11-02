import {
  AuditLogEvent,
  EmbedBuilder,
  Events,
  Guild,
  GuildAuditLogsEntry,
  inlineCode,
  userMention,
} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import GuildSettings from '../../database/models/GuildSettings.model';
import {EmbedColors} from '../../util/EmbedColors';

export default class ModerationLogEvent extends Event {
  constructor() {
    super(Events.GuildAuditLogEntryCreate);
  }

  async run(
    client: ExtendedClient,
    entry: GuildAuditLogsEntry,
    guild: Guild,
  ): Promise<void> {
    switch (entry.action) {
      case AuditLogEvent.MemberBanAdd: {
        const settings = await GuildSettings.findByPk(guild.id);

        if (!settings?.banLogEnabled || !settings.banLogChannelId) return;

        const executorId = entry.executorId;
        const executor = executorId
          ? await guild.members.fetch(executorId).catch(() => null)
          : null;
        const targetId = entry.targetId;
        const reason = entry.reason;
        const banAt = entry.createdAt;

        const banLogChannel = await guild.channels.fetch(
          settings.banLogChannelId,
        );
        if (!banLogChannel?.isSendable()) return;

        const banLogEmbed = new EmbedBuilder()
          .setColor(EmbedColors.red())
          .setAuthor({
            iconURL: executor ? executor.displayAvatarURL() : undefined,
            name: executor ? executor.displayName : 'Unknown',
          })
          .setTitle('Member banned')
          .setDescription(`Reason: ${reason ? reason : 'No reason provided'}`)
          .addFields(
            {
              name: 'Executor:',
              value: executorId
                ? `${userMention(executorId)}\n${inlineCode(executorId)}`
                : 'Unknown',
              inline: true,
            },
            {
              name: 'Target:',
              value: targetId
                ? `${userMention(targetId)}\n${inlineCode(targetId)}`
                : 'Unknown',
              inline: true,
            },
          )
          .setTimestamp(banAt);

        await banLogChannel.send({
          embeds: [banLogEmbed],
        });

        break;
      }

      case AuditLogEvent.MemberBanRemove: {
        const settings = await GuildSettings.findByPk(guild.id);

        if (!settings?.unbanLogEnabled || !settings.unbanLogChannelId) return;

        break;
      }
    }
  }
}
