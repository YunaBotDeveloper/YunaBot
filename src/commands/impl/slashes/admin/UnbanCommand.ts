import {
  bold,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  PermissionFlagsBits,
  subtext,
  time,
  TimestampStyles,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';
import TempBanService from '../../../../services/TempBanService';
import BanLog from '../../../../database/models/BanLog.model';

export default class UnbanCommand extends Command {
  constructor() {
    super('unban', 'Unban a user from the server.');

    this.advancedOptions.cooldown = 5000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

    this.data.addStringOption(option =>
      option
        .setName('user')
        .setDescription('The user ID to unban')
        .setRequired(true),
    );

    this.data.addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unbanning')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const message = await interaction.deferReply();

    const client = interaction.client as ExtendedClient;
    if (!client.user) return;

    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');

    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await message.edit({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    if (!interaction.guild) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'This command can only be used in a server!',
      );
      await message.edit({components: [errorContainer]});
      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);
      return;
    }

    const userId = interaction.options.getString('user', true);
    const reason =
      interaction.options.getString('reason', false) ||
      `Unbanned by ${interaction.user.username}`;

    // Validate user ID format
    if (!/^\d{17,20}$/.test(userId)) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Invalid user ID format! Please provide a valid Discord user ID.',
      );
      await message.edit({components: [errorContainer]});
      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);
      return;
    }

    // Check if user is actually banned
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);

    if (!ban) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `User with ID ${inlineCode(userId)} is not banned from this server!`,
      );
      await message.edit({components: [errorContainer]});
      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);
      return;
    }

    const bot = await interaction.guild.members
      .fetch(client.user.id)
      .catch(() => null);

    if (!bot || !bot.permissions.has(PermissionFlagsBits.BanMembers)) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'The bot does not have permission to unban users!',
      );
      await message.edit({components: [errorContainer]});
      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);
      return;
    }

    try {
      await interaction.guild.members.unban(userId, reason);

      // Cancel any scheduled unban
      const tempBanService = TempBanService.getInstance();
      tempBanService.cancelScheduledUnban(interaction.guild.id, userId);

      // Remove from ban log if exists
      await BanLog.destroy({
        where: {
          guildId: interaction.guild.id,
          userTargetId: userId,
        },
      });

      const timeCreate = Math.round(Date.now() / 1000);

      const successContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.green())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${successEmoji} Successfully unbanned user!`,
          ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${bold('User:')} ${userMention(userId)}\n` +
              `${bold('User ID:')} ${inlineCode(userId)}\n` +
              `${bold('Reason:')} ${reason}`,
          ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            subtext(
              `Executed at ${time(timeCreate, TimestampStyles.FullDateShortTime)}`,
            ),
          ),
        );

      await message.edit({components: [successContainer]});
    } catch {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `An error occurred while unbanning ${userMention(userId)}!`,
      );
      await message.edit({components: [errorContainer]});
      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);
    }
  }
}
