import {
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import {Command} from '../../../Command';
import {StatusContainer} from '../../../../util/StatusContainer';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {EmbedColors} from '../../../../util/EmbedColors';
import GuildLog from '../../../../database/models/GuildLog.model';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

export default class SetupCommand extends Command {
  constructor() {
    super('setup', 'Cài đặt cho bot');

    this.advancedOptions.cooldown = 30000;

    this.data.addSubcommand(subcommand =>
      subcommand.setName('log').setDescription('Cài đặt kênh nhật ký'),
    );

    this.data.addSubcommand(subcommand =>
      subcommand
        .setName('tempvoice')
        .setDescription('Cài đặt kênh nói chuyện tạm thời'),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const manageServerEmoji =
      await client.api.emojiAPI.getEmojiByName('manageserver');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');

    const loadingContainer = await StatusContainer.loading(loadingEmoji);

    const timeOutContainer = await StatusContainer.failed(
      failedEmoji,
      'Đã hết thời gian chờ, vui lòng thử lại!',
    );

    const subcommand = interaction.options.getSubcommand(true);

    const ogMessage = await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    switch (subcommand) {
      case 'log': {
        const logChooseContainer = new ContainerBuilder()
          .setAccentColor(EmbedColors.yellow())
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `## ${manageServerEmoji} Vui lòng chọn kênh nhật ký bạn muốn sửa:`,
            ),
          )
          .addSeparatorComponents(seperator => seperator)
          .addActionRowComponents<StringSelectMenuBuilder>(actionRow =>
            actionRow.addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('logChoose')
                .setPlaceholder('Bấm vào đây để chọn')
                .addOptions(
                  new StringSelectMenuOptionBuilder()
                    .setLabel('Nhật ký tạo lại kênh')
                    .setValue('nuke'),
                ),
            ),
          );

        await interaction.editReply({components: [logChooseContainer]});

        break;
      }
    }

    ComponentManager.getComponentManager().register([
      {
        customId: 'logChoose',
        timeout: 30000,
        onTimeout: async () => {
          ComponentManager.getComponentManager().unregister('logChoose');

          await ogMessage.edit({
            components: [timeOutContainer],
            flags: [MessageFlags.IsComponentsV2],
          });

          return;
        },
        handler: async (interaction: StringSelectMenuInteraction) => {
          ComponentManager.getComponentManager().unregister('logChoose');

          await interaction.update({
            components: [loadingContainer],
            flags: [MessageFlags.IsComponentsV2],
          });

          const selectedValue = interaction.values[0];

          let guildLog = await GuildLog.findOne({
            where: {guildId: interaction.guildId!},
          });

          if (!guildLog) {
            guildLog = await GuildLog.create({
              guildId: interaction.guildId!,
              nukeLogId: null,
            });
          }

          switch (selectedValue) {
            case 'nuke': {
              if (guildLog.nukeLogId) {
                const channel = await interaction.guild?.channels
                  .fetch(guildLog.nukeLogId)
                  .catch(() => null);

                if (
                  channel &&
                  channel.isTextBased() &&
                  channel.type === ChannelType.GuildText
                ) {
                  const nukeLogChooseContainer =
                    this.createNukeLogChooseContainer(
                      manageServerEmoji,
                      channel.id,
                    );

                  await interaction.editReply({
                    components: [nukeLogChooseContainer],
                    flags: [MessageFlags.IsComponentsV2],
                  });

                  break;
                } else if (channel && !channel.isTextBased()) {
                  guildLog.nukeLogId = null;
                  await guildLog.save();

                  const nukeLogChooseContainer =
                    this.createNukeLogChooseContainer(manageServerEmoji);

                  await interaction.editReply({
                    components: [nukeLogChooseContainer],
                    flags: [MessageFlags.IsComponentsV2],
                  });

                  break;
                } else {
                  guildLog.nukeLogId = null;
                  await guildLog.save();

                  const nukeLogChooseContainer =
                    this.createNukeLogChooseContainer(manageServerEmoji);

                  await interaction.editReply({
                    components: [nukeLogChooseContainer],
                    flags: [MessageFlags.IsComponentsV2],
                  });

                  break;
                }
              } else {
                const nukeLogChooseContainer =
                  this.createNukeLogChooseContainer(manageServerEmoji);

                await interaction.editReply({
                  components: [nukeLogChooseContainer],
                  flags: [MessageFlags.IsComponentsV2],
                });

                break;
              }
            }
          }

          ComponentManager.getComponentManager().register([
            {
              customId: 'logChooserRow',
              timeout: 30000,
              onTimeout: async () => {
                ComponentManager.getComponentManager().unregister(
                  'logChooserRow',
                );

                await ogMessage.edit({
                  components: [timeOutContainer],
                  flags: [MessageFlags.IsComponentsV2],
                });

                return;
              },
              handler: async (interaction: ChannelSelectMenuInteraction) => {
                ComponentManager.getComponentManager().unregister(
                  'logChooserRow',
                );

                await interaction.update({
                  components: [loadingContainer],
                  flags: [MessageFlags.IsComponentsV2],
                });

                const selectedChannelId = interaction.values[0];

                try {
                  let guildLog = await GuildLog.findOne({
                    where: {guildId: interaction.guildId!},
                  });

                  if (!guildLog) {
                    guildLog = await GuildLog.create({
                      guildId: interaction.guildId!,
                      nukeLogId: selectedChannelId,
                    });
                  } else {
                    guildLog.nukeLogId = selectedChannelId;
                    await guildLog.save();
                  }

                  const successEmoji =
                    await client.api.emojiAPI.getEmojiByName('success');

                  const successContainer = await StatusContainer.success(
                    successEmoji,
                    `Đã cài đặt kênh nhật ký tạo lại kênh thành công! (<#${selectedChannelId}>)`,
                  );

                  await interaction.editReply({
                    components: [successContainer],
                    flags: [MessageFlags.IsComponentsV2],
                  });
                } catch (error) {
                  console.error('Error saving nuke log channel:', error);

                  const failedContainer = await StatusContainer.failed(
                    failedEmoji,
                    'Đã xảy ra lỗi khi lưu kênh nhật ký!',
                  );

                  await interaction.editReply({
                    components: [failedContainer],
                    flags: [MessageFlags.IsComponentsV2],
                  });
                }
              },
              type: ComponentEnum.MENU,
              userCheck: [interaction.user.id],
            },
          ]);
        },
        type: ComponentEnum.MENU,
        userCheck: [interaction.user.id],
      },
    ]);
  }

  private createNukeLogChooseContainer(
    manageServerEmoji: unknown,
    defaultChannelId?: string,
  ): ContainerBuilder {
    const builder = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${manageServerEmoji} Kênh nhật ký tạo lại kênh`,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          'Vui lòng chọn kênh bạn muốn làm nhật ký dưới đây!',
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addActionRowComponents<ChannelSelectMenuBuilder>(actionRow => {
        const channelSelect = new ChannelSelectMenuBuilder()
          .setCustomId('logChooserRow')
          .setChannelTypes(ChannelType.GuildText)
          .setMaxValues(1)
          .setMinValues(1);

        if (defaultChannelId) {
          channelSelect.setDefaultChannels(defaultChannelId);
        }

        return actionRow.addComponents(channelSelect);
      });

    return builder;
  }
}
