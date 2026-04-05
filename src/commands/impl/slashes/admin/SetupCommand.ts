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
  TextDisplayBuilder,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import PrefixManager from '../../../PrefixManager';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import axios from 'axios';
import {ComponentParser} from '../../../../util/ComponentParser';
import GuildContainer from '../../../../database/models/GuildContainer.model';

export default class SetupCommand extends Command {
  constructor() {
    super('setup', 'Cài đặt cho bot');

    this.advancedOptions.cooldown = 10000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

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

    this.data.addSubcommandGroup(group =>
      group
        .setName('container')
        .setDescription('Cài đạt các mẫu container của máy chủ')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Thêm hoặc cập nhật một mẫu container')
            .addStringOption(option =>
              option
                .setName('name')
                .setDescription('Tên mẫu container')
                .setRequired(true)
                .setMaxLength(100),
            )
            .addAttachmentOption(option =>
              option
                .setName('json')
                .setDescription('File JSON chứa container')
                .setRequired(true),
            ),
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

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subCommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'container') {
      switch (subCommand) {
        case 'add': {
          const name = interaction.options.getString('name', true);
          const attachment = interaction.options.getAttachment('json', true);

          const guildContainer = await GuildContainer.findOne({
            where: {
              guildId: interaction.guild!.id,
              name,
            },
          });

          if (guildContainer) {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              'Máy chủ đã có container này rồi!',
            );

            await message.edit({
              components: [errorContainer],
            });

            setTimeout(async () => {
              await message.delete().catch(() => null);
            }, 5000);

            return;
          }

          let isJSON = false;
          if (
            attachment.contentType &&
            attachment.contentType.startsWith('application/json')
          ) {
            isJSON = true;
          } else if (attachment.url) {
            const url = attachment.url.toLowerCase().split('?')[0];
            isJSON = url.endsWith('.json');

            if (!isJSON) {
              const errorContainer = StatusContainer.failed(
                failedEmoji,
                'Sai định dạng container! Vui lòng thử lại!',
              );

              await message.edit({
                components: [errorContainer],
              });

              setTimeout(async () => {
                await message.delete().catch(() => null);
              }, 5000);

              return;
            }
          }

          let jsonText: string;

          try {
            const response = await axios.get<string>(attachment.url, {
              responseType: 'text',
            });

            jsonText = ComponentParser.patch(response.data);
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Tệp JSON không hợp lệ';
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              errorMsg,
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
            confirmContainerAddCustomId: `confirmContainer_${interaction.id}`,
            cancelContainerAddCustomId: `cancelContainer_${interaction.id}`,
          };

          const previewText = new TextDisplayBuilder().setContent('Preview:');

          let containers;
          try {
            containers = ComponentParser.parse(jsonText, {
              user: interaction.user,
              guild: interaction.guild,
            });
          } catch {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              'Không thể phân tích tệp JSON!',
            );
            await message.edit({components: [errorContainer]});
            setTimeout(async () => {
              await message.delete().catch(() => null);
            }, 5000);
            return;
          }

          const timeCreate = Math.round(Date.now() / 1000);

          const containerAddConfirmContainer =
            this.containerAddConfirmContainer(
              infoEmoji,
              name,
              componentIds,
              timeCreate,
            );

          ComponentManager.getComponentManager().register([
            {
              customId: componentIds.confirmContainerAddCustomId,
              timeout: 10000,
              onTimeout: async () => {
                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
                ]);

                const errorContainer = StatusContainer.failed(
                  failedEmoji,
                  'Yêu cầu này đã hết hạn! Vui lòng thử lại!',
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
                await interaction.update({
                  components: [loadingContainer],
                });

                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
                ]);

                try {
                  await GuildContainer.upsert({
                    guildId: interaction.guild!.id,
                    name,
                    json: jsonText,
                  });
                } catch {
                  const errorContainer = StatusContainer.failed(
                    failedEmoji,
                    'Đã có lỗi xảy ra khi lưu container!',
                  );
                  await interaction.editReply({components: [errorContainer]});
                  setTimeout(async () => {
                    await message.delete().catch(() => null);
                  }, 5000);
                  return;
                }

                const successContainer = StatusContainer.success(
                  successEmoji,
                  `Container ${inlineCode(name)} đã được thêm vào máy chủ thành công!`,
                );

                await interaction.editReply({
                  components: [successContainer],
                });

                setTimeout(async () => {
                  await message.delete().catch(() => null);
                }, 5000);
              },
              type: ComponentEnum.BUTTON,
              userCheck: [interaction.user.id],
            },
            {
              customId: componentIds.cancelContainerAddCustomId,
              timeout: 10000,
              onTimeout: async () => {
                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
                ]);

                const errorContainer = StatusContainer.failed(
                  failedEmoji,
                  'Yêu cầu này đã hết hạn! Vui lòng thử lại!',
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
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
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
              },
              type: ComponentEnum.BUTTON,
              userCheck: [interaction.user.id],
            },
          ]);

          await message.edit({
            components: [containerAddConfirmContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          await interaction.followUp({
            components: [previewText, ...containers],
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          });
        }
      }
      return;
    }

    switch (subCommand) {
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
                'Yêu cầu này đã hết hạn! Vui lòng thử lại!',
              );

              await message.edit({
                components: [errorContainer],
              });

              setTimeout(async () => {
                await message.delete().catch(() => null);
              }, 5000);
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
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
        ]);

        await message.edit({
          components: [prefixConfirmContainer],
        });
        break;
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
            textDisplay.setContent(subtext('Vui lòng bấm nút này để huỷ bỏ')),
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

  containerAddConfirmContainer(
    infoEmoji: unknown,
    containerName: string,
    componentIds: {
      confirmContainerAddCustomId: string;
      cancelContainerAddCustomId: string;
    },
    timeCreate: number,
  ): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Bạn chắc chắn muốn thêm container ${inlineCode(containerName)}?`,
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
              .setCustomId(componentIds.confirmContainerAddCustomId)
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Vui lòng bấm nút này để huỷ bỏ')),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.cancelContainerAddCustomId)
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
