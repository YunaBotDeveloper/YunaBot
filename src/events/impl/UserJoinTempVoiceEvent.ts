import ExtendedClient from '../../classes/ExtendedClient';
import Log4TS from '../../logger/Log4TS';
import Event from '../Event';
import {
  Events,
  VoiceState,
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  inlineCode,
  StringSelectMenuBuilder,
  MessageFlags,
  StringSelectMenuOptionBuilder,
  bold,
  userMention,
  StringSelectMenuInteraction,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from 'discord.js';
import TempVoiceChannel from '../../database/models/TempVoiceChannel.model';
import {EmbedColors} from '../../util/EmbedColors';
import ComponentManager from '../../component/manager/ComponentManager';
import {ComponentEnum} from '../../enum/ComponentEnum';
import TempVoiceChannelSetting from '../../database/models/TempVoiceChannelSetting.model';

const logger = Log4TS.getLogger();

export default class UserJoinTempVoiceEvent extends Event {
  constructor() {
    super(Events.VoiceStateUpdate, false);
  }

  async run(
    client: ExtendedClient,
    oldState: VoiceState,
    newState: VoiceState,
  ) {
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');

    try {
      if (!newState.channelId || newState.channelId === oldState.channelId) {
        return;
      }

      const guild = newState.guild;
      if (!guild) return;

      const tempVoiceRecord = await TempVoiceChannel.findOne({
        where: {guildId: guild.id},
      });

      if (!tempVoiceRecord || tempVoiceRecord.channelId.length === 0) {
        return;
      }

      if (!tempVoiceRecord.channelId.includes(newState.channelId)) {
        return;
      }

      const member = newState.member;

      const memberVoiceChannelSetting = await TempVoiceChannelSetting.findOne({
        where: {userId: member?.id},
      });

      let channelName = memberVoiceChannelSetting?.channelName;

      if (!channelName) channelName = `${member?.user.username}'s Channel`;

      const parentChannel = newState.channel;

      if (!member || !parentChannel) {
        return;
      }

      const newChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: parentChannel.parentId,
        userLimit: parentChannel.userLimit || 0,
        bitrate: parentChannel.bitrate,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.MuteMembers,
            ],
          },
        ],
      });
      await member.voice.setChannel(newChannel);

      const message = await newChannel.send({
        content: userMention(member.id),
        allowedMentions: {users: [member.id]},
      });

      const panelContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.blue())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${infoEmoji} Chào mừng bạn đến với kênh trò chuyện tạm thời!`,
          ),
        )
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `- Điều khiển kênh của bạn bằng cách sử dụng hộp thoại dưới đây\n- Hoặc bạn có thể sử dụng lệnh ${inlineCode('/voice')} để điều khiển!`,
          ),
        )
        .addSeparatorComponents(seperator => seperator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(bold('Cài đặt của kênh')),
        )
        .addActionRowComponents<StringSelectMenuBuilder>(row =>
          row.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('cSetting')
              .setPlaceholder('Chỉnh sửa tại đây!')
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('Tên kênh')
                  .setDescription('Thay đổi tên kênh')
                  .setValue('cNameChange'),

                new StringSelectMenuOptionBuilder()
                  .setLabel('Giới hạn kênh')
                  .setDescription('Thay đổi giới hạn kênh')
                  .setValue('cLimitChange'),

                new StringSelectMenuOptionBuilder()
                  .setLabel('Trạng thái kênh')
                  .setDescription('Thay đổi trạng thái kênh')
                  .setValue('cStatusChange'),
              ),
          ),
        )
        .addSeparatorComponents(seperator => seperator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(bold('Quyền hạn của kênh')),
        )
        .addActionRowComponents<StringSelectMenuBuilder>(row =>
          row.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('cPermission')
              .setPlaceholder('Chỉnh sửa tại đây!')
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('Khóa')
                  .setDescription('Khóa kênh này lại')
                  .setValue('cLock'),
              ),
          ),
        );

      ComponentManager.getComponentManager().register([
        {
          customId: 'cSetting',
          handler: async (interaction: StringSelectMenuInteraction) => {
            const value = interaction.values[0];

            switch (value) {
              case 'cNameChange': {
                const cNameModal = new ModalBuilder()
                  .setTitle('Đặt tên kênh')
                  .setCustomId('cNameSet')
                  .addLabelComponents(
                    new LabelBuilder()
                      .setLabel('Tên kênh mới của bạn là:')
                      .setTextInputComponent(
                        new TextInputBuilder()
                          .setCustomId('cName')
                          .setPlaceholder('Nhập tên kênh mới của bạn')
                          .setStyle(TextInputStyle.Short)
                          .setMinLength(2)
                          .setMaxLength(32),
                      ),
                  );

                await interaction.showModal(cNameModal);
                break;
              }
              case 'cLimitChange': {
                const cLimitModal = new ModalBuilder()
                  .setTitle('Đặt giới hạn kênh')
                  .setCustomId('cLimitSet')
                  .addLabelComponents(
                    new LabelBuilder()
                      .setLabel('Giới hạn kênh')
                      .setDescription('Đặt 0 để xóa giới hạn')
                      .setTextInputComponent(
                        new TextInputBuilder()
                          .setCustomId('cLimit')
                          .setPlaceholder('Nhập giới hạn bạn muốn')
                          .setStyle(TextInputStyle.Short)
                          .setMinLength(1)
                          .setMaxLength(2),
                      ),
                  );

                await interaction.showModal(cLimitModal);
                break;
              }
              case 'cStatusChange': {
                const cStatusModal = new ModalBuilder()
                  .setCustomId('cStatusModal')
                  .setTitle('Đặt trạng thái kênh')
                  .setLabelComponents(
                    new LabelBuilder()
                      .setLabel('Trạng thái kênh')
                      .setTextInputComponent(
                        new TextInputBuilder()
                          .setCustomId('cStatus')
                          .setPlaceholder('Nhập trạng thái kênh bạn muốn đặt')
                          .setStyle(TextInputStyle.Paragraph)
                          .setMinLength(1)
                          .setMaxLength(200),
                      ),
                  );

                await interaction.showModal(cStatusModal);
                break;
              }
            }

            ComponentManager.getComponentManager().register([
              {
                customId: 'cNameSet',
                handler: async (interaction: ModalSubmitInteraction) => {
                  const loadingContainer =
                    await this.loadingContainer(loadingEmoji);

                  await interaction.reply({
                    components: [loadingContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });

                  const cName = interaction.fields.getTextInputValue('cName');
                  await newChannel.setName(cName);

                  if (memberVoiceChannelSetting) {
                    await memberVoiceChannelSetting.update({
                      channelName: cName,
                    });
                  } else {
                    await TempVoiceChannelSetting.create({
                      userId: member.id,
                      channelName: cName,
                      channelLimit: 0,
                    });
                  }

                  const successContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.green())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${successEmoji} Đổi tên kênh thành công!`,
                      ),
                    );

                  await interaction.editReply({
                    components: [successContainer],
                  });

                  await resetSelectMenu();
                  return;
                },
                userCheck: [member.id],
                type: ComponentEnum.MODAL,
              },
              {
                customId: 'cStatusModal',
                handler: async (interaction: ModalSubmitInteraction) => {
                  const client = interaction.client;
                  const cStatus =
                    interaction.fields.getTextInputValue('cStatus');
                  const loadingContainer =
                    await this.loadingContainer(loadingEmoji);
                  await interaction.reply({
                    components: [loadingContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });

                  await client.rest.put(
                    `/channels/${newChannel.id}/voice-status`,
                    {body: {status: cStatus}},
                  );

                  const successContainer = await this.successContainer(
                    successEmoji,
                    'Thay đổi trạng thái kênh thành công!',
                  );

                  await interaction.editReply({components: [successContainer]});

                  await resetSelectMenu();
                  return;
                },
                userCheck: [member.id],
                type: ComponentEnum.MODAL,
              },
              {
                customId: 'cLimitSet',
                handler: async (interaction: ModalSubmitInteraction) => {
                  const loadingContainer =
                    await this.loadingContainer(infoEmoji);
                  await interaction.reply({
                    components: [loadingContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });

                  const cLimit = parseInt(
                    interaction.fields.getTextInputValue('cLimit'),
                  );

                  if (!cLimit) {
                    const cLimitErrorContainer = new ContainerBuilder()
                      .setAccentColor(EmbedColors.red())
                      .addTextDisplayComponents(textDisplay =>
                        textDisplay.setContent(
                          `## ${failedEmoji} Lỗi: Giới hạn không hợp lệ!`,
                        ),
                      );

                    await interaction.editReply({
                      components: [cLimitErrorContainer],
                    });
                    return;
                  }

                  await newChannel.setUserLimit(cLimit);

                  if (memberVoiceChannelSetting) {
                    await memberVoiceChannelSetting.update({
                      channelLimit: cLimit,
                    });
                  } else {
                    await TempVoiceChannelSetting.create({
                      userId: member.id,
                      channelName,
                      channelLimit: 0,
                    });
                  }

                  const successContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.green())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${successEmoji} Đặt giới hạn kênh thành công!`,
                      ),
                    );

                  await interaction.editReply({components: [successContainer]});

                  await resetSelectMenu();
                },
                type: ComponentEnum.MODAL,
                userCheck: [member.id],
              },
            ]);
          },
          userCheck: [member.id],
          type: ComponentEnum.MENU,
        },
        // {
        //   customId: 'cPermission',
        //   handler: async (interaction: StringSelectMenuInteraction) => {
        //     const value = interaction.values[0];

        //     switch (value) {
        //       case 'cLock': {
        //         try {
        //           const isLocked = newChannel.permissionOverwrites.cache.some(
        //             overwrite =>
        //               overwrite.id === guild.id &&
        //               overwrite.deny.has(PermissionFlagsBits.Connect),
        //           );

        //           if (isLocked) {
        //             await newChannel.permissionOverwrites.edit(guild.id, {
        //               Connect: null,
        //             });

        //             const unlockContainer = new ContainerBuilder()
        //               .setAccentColor(EmbedColors.green())
        //               .addTextDisplayComponents(textDisplay =>
        //                 textDisplay.setContent('🔓 Đã mở khóa kênh!'),
        //               );

        //             await interaction.reply({
        //               components: [unlockContainer],
        //               flags: [
        //                 MessageFlags.Ephemeral,
        //                 MessageFlags.IsComponentsV2,
        //               ],
        //             });
        //           } else {
        //             await newChannel.permissionOverwrites.edit(guild.id, {
        //               Connect: false,
        //             });

        //             const lockContainer = new ContainerBuilder()
        //               .setAccentColor(EmbedColors.red())
        //               .addTextDisplayComponents(textDisplay =>
        //                 textDisplay.setContent('🔒 Đã khóa kênh!'),
        //               );

        //             await interaction.reply({
        //               components: [lockContainer],
        //               flags: [
        //                 MessageFlags.Ephemeral,
        //                 MessageFlags.IsComponentsV2,
        //               ],
        //             });
        //           }
        //         } catch (error) {
        //           logger.error(`Error toggling channel lock: ${error}`);

        //           const errorContainer = new ContainerBuilder()
        //             .setAccentColor(EmbedColors.red())
        //             .addTextDisplayComponents(textDisplay =>
        //               textDisplay.setContent(
        //                 '❌ Có lỗi xảy ra khi khóa/mở khóa kênh!',
        //               ),
        //             );

        //           await interaction.reply({
        //             components: [errorContainer],
        //             flags: [
        //               MessageFlags.Ephemeral,
        //               MessageFlags.IsComponentsV2,
        //             ],
        //           });
        //         }
        //         break;
        //       }
        //     }
        //   },
        //   userCheck: [member.id],
        //   type: ComponentEnum.MENU,
        // },
      ]);
      await message.edit({
        content: '',
        components: [panelContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      logger.error(`Error in UserJoinTempVoiceEvent: ${error}`);
    }
  }

  private async loadingContainer(
    loadingEmoji: unknown,
  ): Promise<ContainerBuilder> {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${loadingEmoji} Đang xử lý...`),
      );
  }

  private async successContainer(
    successEmoji: unknown,
    successMessage: string,
  ): Promise<ContainerBuilder> {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.green())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${successEmoji} ${successMessage}`),
      );
  }
}
