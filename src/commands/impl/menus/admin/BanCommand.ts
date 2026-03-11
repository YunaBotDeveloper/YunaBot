import {
  ApplicationCommandType,
  GuildMember,
  MessageFlags,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import {ContextMenuCommand} from '../../../ContextMenuCommand';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';

export default class BanCommand extends ContextMenuCommand {
  constructor() {
    super('Cấm người dùng này', ApplicationCommandType.User);

    this.advancedOptions.cooldown = 30000;
  }

  async run(interaction: UserContextMenuCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      allowedMentions: {},
    });

    let targetMember = interaction.targetMember;

    if (!targetMember) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Người dùng này không tồn tại!',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      return;
    }

    if (!interaction.guild || !client.user) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Lệnh này chỉ có thể sử dụng trong máy chủ',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      return;
    }

    targetMember = await interaction.guild.members
      .fetch(targetMember.user.id)
      .catch(() => null);
    const userExecute = await interaction.guild.members.fetch(
      interaction.user.id,
    );
    const bot = await interaction.guild.members
      .fetch(client.user.id)
      .catch(() => null);
  }
}
