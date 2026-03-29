import {
  bold,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  subtext,
  TimestampStyles,
  time,
  PermissionFlagsBits,
  ButtonInteraction,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import PrefixManager from '../../../PrefixManager';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

export default class SetupCommand extends Command {
  constructor() {
    super('setup', 'Cài đặt cho bot');

    this.advancedOptions.cooldown = 10000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

    this.data.addSubcommand(subcommand =>
      subcommand
        .setName('prefix')
        .setDescription('Cài đặt prefix cho bot')
        .addStringOption(option =>
          option
            .setName('prefix')
            .setDescription('Prefix của bot')
            .setRequired(true),
        ),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const message = await interaction.deferReply();

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await message.edit({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'prefix': {
        const prefixManager = PrefixManager.getInstance();

        const oldPrefix = await prefixManager.getPrefix(interaction.guild.id);
        const newPrefix = interaction.options.getString('prefix', true);

        if (oldPrefix === newPrefix) {
          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'Prefix cũ và prefix mới không thể giống nhau!',
          );

          await message.edit({
            components: [errorContainer],
          });

          setTimeout(async () => {
            await message.delete().catch(() => null);
          }, 5000);

          return;
        }

        const componentIds = {
          confirmPrefixCustomId: `confirmPrefix_${interaction.id}`,
          cancelPrefixCustomId: `cancelPrefix_${interaction.id}`,
        };

        const timeCreate = Math.round(Date.now() / 1000);

        const prefixConfirmContainer = this.prefixConfirmContainer(
          infoEmoji,
          oldPrefix,
          newPrefix,
          componentIds,
          timeCreate,
        );

        ComponentManager.getComponentManager().register([
          {
            customId: componentIds.confirmPrefixCustomId,
            timeout: 10000,
            onTimeout: async () => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
              ]);

              const errorContainer = StatusContainer.failed(
                failedEmoji,
                'Yêu cầu này đã hết hạn! Vui lòng thử lại',
              );

              await message.edit({
                components: [errorContainer],
              });

              setTimeout(async () => {
                await message.delete().catch(() => null);
              }, 5000);

              return;
            },
            handler: async (interaction: ButtonInteraction) => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
              ]);

              await interaction.update({
                components: [loadingContainer],
              });

              await prefixManager.setPrefix(interaction.guild!.id, newPrefix);

              const successContainer = StatusContainer.success(
                successEmoji,
                `Đã đặt prefix của bot thành ${inlineCode(newPrefix)}`,
              );

              await interaction.editReply({
                components: [successContainer],
              });

              setTimeout(async () => {
                await message.delete().catch(() => null);
              }, 5000);

              return;
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
          {
            customId: componentIds.cancelPrefixCustomId,
            timeout: 10000,
            onTimeout: async () => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
              ]);

              const errorContainer = StatusContainer.failed(
                failedEmoji,
                'Yêu cầu này đã hết hạn! Vui lòng thử lại',
              );

              await message.edit({
                components: [errorContainer],
              });

              setTimeout(async () => {
                await message.delete().catch(() => null);
              }, 5000);

              return;
            },
            handler: async (interaction: ButtonInteraction) => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
              ]);

              await interaction.update({
                components: [loadingContainer],
              });

              const successContainer = StatusContainer.success(
                successEmoji,
                'Đã huỷ yêu cầu thành công!',
              );

              await interaction.editReply({
                components: [successContainer],
              });

              setTimeout(async () => {
                await message.delete().catch(() => null);
              }, 5000);

              return;
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
        ]);

        await message.edit({
          components: [prefixConfirmContainer],
        });
      }
    }
  }

  prefixConfirmContainer(
    infoEmoji: unknown,
    oldPrefix: string,
    newPrefix: string,
    componentIds: {
      confirmPrefixCustomId: string;
      cancelPrefixCustomId: string;
    },
    timeCreate: number,
  ): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Bạn chắc chắn muốn thay đổi prefix của bot?`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('Prefix cũ:')} ${inlineCode(oldPrefix)}\n` +
            `${bold('Prefix mới:')} ${inlineCode(newPrefix)}`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Vui lòng bấm nút này để xác nhận')),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.confirmPrefixCustomId)
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Vui lòng bấm nút này huỷ bỏ')),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.cancelPrefixCustomId)
              .setLabel('❌')
              .setStyle(ButtonStyle.Success),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `${infoEmoji} Yêu cầu sẽ tự động hết hạn sau ${time(timeCreate + 10, TimestampStyles.RelativeTime)}`,
          ),
        ),
      );
  }
}
