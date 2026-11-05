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

        const banExecutorId = entry.executorId;
        const banExecutor = banExecutorId
          ? await guild.members.fetch(banExecutorId).catch(() => null)
          : null;
        const banTargetId = entry.targetId;
        const banReason = entry.reason;
        const banAt = entry.createdAt;

        const banLogChannel = await guild.channels.fetch(
          settings.banLogChannelId,
        );
        if (!banLogChannel?.isSendable()) return;

        const banLogEmbed = new EmbedBuilder()
          .setColor(EmbedColors.red())
          .setAuthor({
            iconURL: banExecutor ? banExecutor.displayAvatarURL() : undefined,
            name: banExecutor ? banExecutor.displayName : 'Unknown',
          })
          .setTitle('Member banned')
          .setDescription(
            `Reason: ${banReason ? banReason : 'No reason provided'}`,
          )
          .addFields(
            {
              name: 'Executor:',
              value: banExecutorId
                ? `${userMention(banExecutorId)}\n${inlineCode(banExecutorId)}`
                : 'Unknown',
              inline: true,
            },
            {
              name: 'Target:',
              value: banTargetId
                ? `${userMention(banTargetId)}\n${inlineCode(banTargetId)}`
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

        const unbanExecutorId = entry.executorId;
        const unbanExecutor = unbanExecutorId
          ? await guild.members.fetch(unbanExecutorId).catch(() => {})
          : null;
        const unbanTargetId = entry.targetId;
        const unbanReason = entry.reason;
        const unbanAt = entry.createdAt;

        const unbanLogChannel = await guild.channels.fetch(
          settings.unbanLogChannelId,
        );
        if (!unbanLogChannel?.isSendable()) return;

        const banLogEmbed = new EmbedBuilder()
          .setColor(EmbedColors.red())
          .setAuthor({
            iconURL: unbanExecutor
              ? unbanExecutor.displayAvatarURL()
              : undefined,
            name: unbanExecutor ? unbanExecutor.displayName : 'Unknown',
          })
          .setTitle('Member banned')
          .setDescription(
            `Reason: ${unbanReason ? unbanReason : 'No reason provided'}`,
          )
          .addFields(
            {
              name: 'Executor:',
              value: unbanExecutorId
                ? `${userMention(unbanExecutorId)}\n${inlineCode(unbanExecutorId)}`
                : 'Unknown',
              inline: true,
            },
            {
              name: 'Target:',
              value: unbanTargetId
                ? `${userMention(unbanTargetId)}\n${inlineCode(unbanTargetId)}`
                : 'Unknown',
              inline: true,
            },
          )
          .setTimestamp(unbanAt);

        await unbanLogChannel.send({
          embeds: [banLogEmbed],
        });

        break;
      }
    }
  }
}
