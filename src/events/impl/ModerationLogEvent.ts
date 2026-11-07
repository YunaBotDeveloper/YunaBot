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

        const unbanLogEmbed = new EmbedBuilder()
          .setColor(EmbedColors.green())
          .setAuthor({
            iconURL: unbanExecutor
              ? unbanExecutor.displayAvatarURL()
              : undefined,
            name: unbanExecutor ? unbanExecutor.displayName : 'Unknown',
          })
          .setTitle('Member unbanned')
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
          embeds: [unbanLogEmbed],
        });

        break;
      }

      case AuditLogEvent.MemberKick: {
        const settings = await GuildSettings.findByPk(guild.id);

        if (!settings?.kickLogEnabled || !settings.kickLogChannelId) return;

        const kickExecutorId = entry.executorId;
        const kickExecutor = kickExecutorId
          ? await guild.members.fetch(kickExecutorId).catch(() => null)
          : null;
        const kickTargetId = entry.targetId;
        const kickReason = entry.reason;
        const kickAt = entry.createdAt;

        const kickLogChannel = await guild.channels.fetch(
          settings.kickLogChannelId,
        );

        if (!kickLogChannel?.isSendable()) return;

        const kickLogEmbed = new EmbedBuilder()
          .setColor(EmbedColors.red())
          .setAuthor({
            iconURL: kickExecutor ? kickExecutor.displayAvatarURL() : undefined,
            name: kickExecutor ? kickExecutor.displayName : 'Unknown',
          })
          .setTitle('Member kicked')
          .setDescription(
            `Reason: ${kickReason ? kickReason : 'No reason provided'}`,
          )
          .addFields(
            {
              name: 'Executor:',
              value: kickExecutorId
                ? `${userMention(kickExecutorId)}\n${inlineCode(kickExecutorId)}`
                : 'Unknown',
              inline: true,
            },
            {
              name: 'Target:',
              value: kickTargetId
                ? `${userMention(kickTargetId)}\n${inlineCode(kickTargetId)}`
                : 'Unknown',
              inline: true,
            },
          )
          .setTimestamp(kickAt);

        await kickLogChannel.send({
          embeds: [kickLogEmbed],
        });
      }
    }
  }
}
