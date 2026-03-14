import {
  AutocompleteInteraction,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
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
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

export default class UnbanCommand extends Command {
  constructor() {
    super('unban', 'Gỡ cấm người dùng bạn chỉ định khỏi server');

    this.advancedOptions.cooldown = 30000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

    this.data.addStringOption(option =>
      option
        .setName('user')
        .setDescription('Chọn người dùng bạn muốn gỡ cấm')
        .setRequired(true)
        .setAutocomplete(true),
    );

    this.data.addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Lý do bạn muốn gỡ cấm')
        .setRequired(false),
    );
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    try {
      const bans = await interaction.guild!.bans.fetch();

      const filtered = bans
        .filter(ban => {
          const label = `${ban.user.username} (ID: ${ban.user.id})`;
          return (
            label.toLowerCase().includes(focusedValue) ||
            ban.user.id.includes(focusedValue)
          );
        })
        .first(25);

      await interaction.respond(
        filtered.map(ban => ({
          name: `${ban.user.username} (ID: ${ban.user.id})`,
          value: ban.user.id,
        })),
      );
    } catch {
      await interaction.respond([]);
    }
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    const targetUserId = interaction.options.getString('user', true);
    const reason =
      interaction.options.getString('reason', false) ||
      `Unbanned by ${interaction.user.username}`;

    if (!interaction.guild || !client.user) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Lệnh này chỉ có thể sử dụng trong máy chủ!',
      );

      await interaction.editReply({
        components: [errorContainer],
      });
      return;
    }

    let bannedUser;
    try {
      bannedUser = await interaction.guild.bans.fetch(targetUserId);
    } catch {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Người dùng này không bị cấm trong máy chủ!',
      );

      await interaction.editReply({
        components: [errorContainer],
      });
      return;
    }

    const componentsId: string[] = [
      `confirmUnban_${interaction.id}`,
      `cancelUnban_${interaction.id}`,
    ];

    const expireAt = new Date(Date.now() + 10000);

    const unbanConfirmContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Bạn có chắc chắn muốn gỡ cấm ${userMention(bannedUser.user.id)} khỏi máy chủ?`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .setButtonAccessory(button =>
            button
              .setCustomId(componentsId[0])
              .setLabel('❌')
              .setStyle(ButtonStyle.Success),
          )
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Vui lòng bấm nút này để thực hiện.'),
            ),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .setButtonAccessory(button =>
            button
              .setCustomId(componentsId[1])
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          )
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Vui lòng bấm nút này để huỷ bỏ.')),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `Lệnh của bạn sẽ hết hạn sau ${time(expireAt, TimestampStyles.RelativeTime)}`,
          ),
        ),
      );

    ComponentManager.getComponentManager().register([
      {
        customId: componentsId[0],
        timeout: 10000,
        onTimeout: async () => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'Đã hết thời gian chờ! Vui lòng thử lại!',
          );

          await interaction.editReply({
            components: [errorContainer],
          });

          return;
        },
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          await interaction.update({
            components: [loadingContainer],
          });

          try {
            await interaction.guild!.bans.remove(bannedUser.user.id, reason);

            const successContainer = StatusContainer.success(
              successEmoji,
              `Đã gỡ cấm ${userMention(bannedUser.user.id)} khỏi máy chủ thành công!`,
            );

            await interaction.editReply({
              components: [successContainer],
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            let errorMessage = `Đã có lỗi xảy ra khi gỡ cấm ${userMention(bannedUser.user.id)}!`;

            if (error.code === 50013) {
              errorMessage = 'Bot không có quyền hạn để gỡ cấm người dùng này!';
            } else if (error.message) {
              errorMessage = error.message;
            }

            const errorContainer = StatusContainer.failed(
              failedEmoji,
              errorMessage,
            );

            await interaction.editReply({
              components: [errorContainer],
            });
          }

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
      {
        customId: componentsId[1],
        timeout: 10000,
        onTimeout: async () => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'Đã hết thời gian chờ! Vui lòng thử lại!',
          );

          await interaction.editReply({
            components: [errorContainer],
          });

          return;
        },
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          await interaction.update({
            components: [loadingContainer],
          });

          const successContainer = StatusContainer.success(
            successEmoji,
            'Đã huỷ hành động thành công!',
          );

          await interaction.editReply({
            components: [successContainer],
          });

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
    ]);

    await interaction.editReply({
      components: [unbanConfirmContainer],
    });
  }
}
