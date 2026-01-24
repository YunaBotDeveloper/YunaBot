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
  EmbedBuilder,
} from 'discord.js';
import TempVoiceChannel from '../../database/models/TempVoiceChannel.model';
import {EmbedColors} from '../../util/EmbedColors';
import ComponentManager from '../../component/manager/ComponentManager';
import {ComponentEnum} from '../../enum/ComponentEnum';
import TempVoiceChannelSetting from '../../database/models/TempVoiceChannelSetting.model';
import TempVoiceOwner from '../../database/models/TempVoiceOwner.model';

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

      if (!member) {
        return;
      }

      const memberVoiceChannelSetting = await TempVoiceChannelSetting.findOne({
        where: {userId: member.id},
      });

      const currentTime = Date.now();
      const cooldownTime = 5000;

      if (memberVoiceChannelSetting?.lastJoinTimestamp) {
        const timeSinceLastJoin =
          currentTime - Number(memberVoiceChannelSetting.lastJoinTimestamp);

        if (timeSinceLastJoin < cooldownTime) {
          const remainingTime = Math.ceil(
            (cooldownTime - timeSinceLastJoin) / 1000,
          );

          await member.voice.disconnect();

          try {
            const cooldownContainer = new ContainerBuilder()
              .setAccentColor(EmbedColors.red())
              .addTextDisplayComponents(textDisplay =>
                textDisplay.setContent(
                  `## ${failedEmoji} Vui lòng đợi ${remainingTime} giây nữa trước khi tạo kênh mới.`,
                ),
              );

            await member.send({
              components: [cooldownContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          } catch {
            //
          }

          return;
        }
      }

      let channelName = memberVoiceChannelSetting?.channelName;
      if (!channelName) channelName = `${member.user.username}'s Channel`;

      let channelBitrate = memberVoiceChannelSetting?.channelBitrate;
      if (!channelBitrate) channelBitrate = 64;

      let channelLimit = memberVoiceChannelSetting?.channelLimit;
      if (!channelLimit) channelLimit = 0;

      const parentChannel = newState.channel;

      if (!parentChannel) {
        return;
      }

      const newChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: parentChannel.parentId,
        userLimit: channelLimit,
        bitrate: channelBitrate * 1000,
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

      const tempVoiceOwner = new TempVoiceOwner({
        channelId: newChannel.id,
        userId: member.id,
      });

      await tempVoiceOwner.save();

      if (memberVoiceChannelSetting) {
        await memberVoiceChannelSetting.update({
          lastJoinTimestamp: currentTime,
        });
      } else {
        await TempVoiceChannelSetting.create({
          userId: tempVoiceOwner.userId,
          channelName,
          channelLimit: 0,
          channelBitrate: 64,
          lastJoinTimestamp: currentTime,
        });
      }

      const message = await newChannel.send({
        content: userMention(tempVoiceOwner.userId),
        allowedMentions: {users: [tempVoiceOwner.userId]},
      });

      const panelContainer = await this.panelContainer(infoEmoji);

      ComponentManager.getComponentManager().register([
        {
          customId: 'cSetting',
          handler: async (interaction: StringSelectMenuInteraction) => {
            // Check current owner from database
            const currentOwner = await TempVoiceOwner.findOne({
              where: {channelId: newChannel.id},
            });

            if (!currentOwner || currentOwner.userId !== interaction.user.id) {
              const errorEmbed = new EmbedBuilder()
                .setColor(EmbedColors.red())
                .setTitle('❌ Error ❌')
                .setDescription(
                  "Error while processing your request:\nYou don't have any permission to use this!",
                )
                .setFooter({text: 'ManagerBot @ 0.0.1'})
                .setTimestamp();
              await interaction.reply({
                embeds: [errorEmbed],
                flags: 'Ephemeral',
              });
              return;
            }

            const value = interaction.values[0];

            switch (value) {
              case 'cNameChange': {
                await message.edit({
                  content: '',
                  components: [panelContainer],
                  flags: MessageFlags.IsComponentsV2,
                });

                const cNameModal = new ModalBuilder()
                  .setTitle('Đặt tên kênh')
                  .setCustomId('cNameSet')
                  .addLabelComponents(
                    new LabelBuilder()
                      .setLabel('Tên kênh mới của bạn là:')
                      .setTextInputComponent(
                        new TextInputBuilder()
                          .setCustomId('cName')
                          .setPlaceholder('Nhập tên kênh mới bạn muốn đặt')
                          .setStyle(TextInputStyle.Short)
                          .setMinLength(2)
                          .setMaxLength(32),
                      ),
                  );

                await interaction.showModal(cNameModal);
                break;
              }
              case 'cLimitChange': {
                await message.edit({
                  content: '',
                  components: [panelContainer],
                  flags: MessageFlags.IsComponentsV2,
                });

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
                          .setPlaceholder('Nhập giới hạn bạn muốn đặt')
                          .setStyle(TextInputStyle.Short)
                          .setMinLength(1)
                          .setMaxLength(2),
                      ),
                  );

                await interaction.showModal(cLimitModal);
                break;
              }
              case 'cStatusChange': {
                await message.edit({
                  content: '',
                  components: [panelContainer],
                  flags: MessageFlags.IsComponentsV2,
                });

                const cStatusModal = new ModalBuilder()
                  .setCustomId('cStatusSet')
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

              case 'cBitrateChange': {
                await message.edit({
                  content: '',
                  components: [panelContainer],
                  flags: MessageFlags.IsComponentsV2,
                });

                const cBitrateModal = new ModalBuilder()
                  .setCustomId('cBitrateSet')
                  .setTitle('Đặt bitrate kênh')
                  .addLabelComponents(
                    new LabelBuilder()
                      .setLabel('Bitrate kênh')
                      .setDescription('Giới hạn từ 8 - 96 (kbps)')
                      .setTextInputComponent(
                        new TextInputBuilder()
                          .setCustomId('cBitrate')
                          .setPlaceholder('Nhập bitrate kênh bạn muốn đặt')
                          .setStyle(TextInputStyle.Short)
                          .setMinLength(1)
                          .setMaxLength(2),
                      ),
                  );

                await interaction.showModal(cBitrateModal);
                break;
              }

              case 'cRTCChange': {
                await message.edit({
                  content: '',
                  components: [panelContainer],
                  flags: MessageFlags.IsComponentsV2,
                });

                const cRTCModal = new ModalBuilder()
                  .setCustomId('cRTCSet')
                  .setTitle('Đặt quốc gia kênh')
                  .addLabelComponents(
                    new LabelBuilder()
                      .setLabel('Quốc gia kênh')
                      .setStringSelectMenuComponent(select =>
                        select
                          .setCustomId('cRTC')
                          .setPlaceholder('Chọn quốc gia kênh bạn muốn đặt')
                          .addOptions(
                            new StringSelectMenuOptionBuilder()
                              .setLabel('Global')
                              .setValue('global')
                              .setDefault(true)
                              .setEmoji('🌐'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('Brazil')
                              .setValue('brazil')
                              .setEmoji('🇧🇷'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('Hong Kong')
                              .setValue('hongkong')
                              .setEmoji('🇭🇰'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('India')
                              .setValue('india')
                              .setEmoji('🇮🇳'),
                            new StringSelectMenuOptionBuilder()
                              .setLabel('Netherlands')
                              .setValue('rotterdam')
                              .setEmoji('🇳🇱'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('Singapore')
                              .setValue('singapore')
                              .setEmoji('🇸🇬'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('South Africa')
                              .setValue('southafrica')
                              .setEmoji('🇿🇦'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('Australia')
                              .setValue('sydney')
                              .setEmoji('🇦🇺'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('US - East')
                              .setValue('us-east')
                              .setEmoji('🇺🇸'),

                            new StringSelectMenuOptionBuilder()
                              .setLabel('US - West')
                              .setValue('us-west')
                              .setEmoji('🇺🇸'),
                          ),
                      ),
                  );

                await interaction.showModal(cRTCModal);
                break;
              }

              case 'cNSFWChange': {
                await message.edit({
                  content: '',
                  components: [panelContainer],
                  flags: [MessageFlags.IsComponentsV2],
                });

                const loadingContainer =
                  await this.loadingContainer(loadingEmoji);

                await interaction.reply({
                  components: [loadingContainer],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });

                const isChannelNSFW: boolean = newChannel.nsfw;

                if (isChannelNSFW === true) {
                  await newChannel.setNSFW(false);
                } else {
                  await newChannel.setNSFW(true);
                }

                const successContainer = await this.successContainer(
                  successEmoji,
                  'Thay đổi chế độ NSFW thành công!',
                );

                await interaction.editReply({components: [successContainer]});

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
                      userId: tempVoiceOwner.userId,
                      channelName: cName,
                      channelBitrate: 64,
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

                  return;
                },
                userCheck: [tempVoiceOwner.userId],
                type: ComponentEnum.MODAL,
              },
              {
                customId: 'cStatusSet',
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
                    {
                      body: {
                        status: cStatus,
                      },
                    },
                  );

                  const successContainer = await this.successContainer(
                    successEmoji,
                    'Thay đổi trạng thái kênh thành công!',
                  );

                  await interaction.editReply({components: [successContainer]});

                  return;
                },
                userCheck: [tempVoiceOwner.userId],
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

                  if (cLimit < 0 || cLimit > 99 || isNaN(cLimit)) {
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

                  await TempVoiceChannelSetting.upsert({
                    userId: tempVoiceOwner.userId,
                    channelName,
                    channelBitrate: 64,
                    channelLimit: cLimit,
                  });

                  const successContainer = await this.successContainer(
                    successEmoji,
                    'Đặt giới hạn kênh thành công!',
                  );

                  await interaction.editReply({components: [successContainer]});
                },
                type: ComponentEnum.MODAL,
                userCheck: [tempVoiceOwner.userId],
              },
              {
                customId: 'cBitrateSet',
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

                  const cBitrate = parseInt(
                    interaction.fields.getTextInputValue('cBitrate'),
                  );

                  if (cBitrate < 8 || cBitrate > 96 || isNaN(cBitrate)) {
                    const cLimitErrorContainer = new ContainerBuilder()
                      .setAccentColor(EmbedColors.red())
                      .addTextDisplayComponents(textDisplay =>
                        textDisplay.setContent(
                          `## ${failedEmoji} Lỗi: Bitrate không hợp lệ!`,
                        ),
                      );

                    await interaction.editReply({
                      components: [cLimitErrorContainer],
                    });
                    return;
                  }

                  await newChannel.setBitrate(
                    cBitrate * 1000,
                    `${member.user.username} requested.`,
                  );

                  const successContainer = await this.successContainer(
                    successEmoji,
                    'Đặt bitrate thành kênh công!',
                  );

                  await interaction.editReply({
                    components: [successContainer],
                  });
                },
                type: ComponentEnum.MODAL,
                userCheck: [tempVoiceOwner.userId],
              },
            ]);
          },
          type: ComponentEnum.MENU,
        },
        {
          customId: 'cRTCSet',
          handler: async (interaction: ModalSubmitInteraction) => {
            const loadingContainer = await this.loadingContainer(loadingEmoji);
            await interaction.reply({
              components: [loadingContainer],
              flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });

            const cRTC = interaction.fields.getStringSelectValues('cRTC')[0];

            try {
              if (cRTC === 'global') {
                await newChannel.setRTCRegion(null);
              } else {
                await newChannel.setRTCRegion(cRTC);
              }
            } catch (error) {
              console.log(error);
            }

            const successContainer = await this.successContainer(
              successEmoji,
              'Đặt quốc gia cho kênh thành công!',
            );

            await interaction.editReply({components: [successContainer]});

            return;
          },
          type: ComponentEnum.MODAL,
          userCheck: [tempVoiceOwner.userId],
        },
        {
          customId: 'cPermission',
          handler: async (interaction: StringSelectMenuInteraction) => {
            const value = interaction.values[0];

            switch (value) {
              case 'cOwnerChange': {
                await message.edit({
                  content: '',
                  components: [panelContainer],
                  flags: MessageFlags.IsComponentsV2,
                });

                const loadingContainer =
                  await this.loadingContainer(loadingEmoji);

                await interaction.reply({
                  components: [loadingContainer],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });

                // Get current owner from database
                const currentOwner = await TempVoiceOwner.findOne({
                  where: {channelId: newChannel.id},
                });

                if (!currentOwner) {
                  const errorContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${failedEmoji} Không tìm thấy chủ kênh!`,
                      ),
                    );

                  await interaction.editReply({components: [errorContainer]});
                  break;
                }

                const ownerInChannel = newChannel.members.has(
                  currentOwner.userId,
                );

                if (ownerInChannel) {
                  const errorContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${failedEmoji} Chủ kênh hiện tại vẫn đang trong kênh!`,
                      ),
                    );

                  await interaction.editReply({components: [errorContainer]});
                  break;
                }

                await currentOwner.update({
                  userId: interaction.user.id,
                });

                await newChannel.permissionOverwrites.edit(
                  interaction.user.id,
                  {
                    ManageChannels: true,
                    MoveMembers: true,
                    MuteMembers: true,
                  },
                );

                const successContainer = await this.successContainer(
                  successEmoji,
                  'Bạn đã trở thành chủ kênh mới!',
                );

                await interaction.editReply({components: [successContainer]});

                break;
              }
            }
          },
          userCheck: ['*'],
          type: ComponentEnum.MENU,
        },
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

  private async panelContainer(infoEmoji: unknown): Promise<ContainerBuilder> {
    return new ContainerBuilder()
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

              new StringSelectMenuOptionBuilder()
                .setLabel('Bitrate')
                .setDescription('Thay đổi bitrate kênh')
                .setValue('cBitrateChange'),

              new StringSelectMenuOptionBuilder()
                .setLabel('Quốc gia kênh')
                .setDescription('Thay đổi quốc gia của kênh (RTC)')
                .setValue('cRTCChange'),

              new StringSelectMenuOptionBuilder()
                .setLabel('NSFW')
                .setDescription('Thay đổi chế độ NSFW cho kênh')
                .setValue('cNSFWChange'),
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

              new StringSelectMenuOptionBuilder()
                .setLabel('Chủ kênh')
                .setDescription('Nhận quyền chủ kênh (khi chủ kênh cũ đã rời)')
                .setValue('cOwnerChange'),
            ),
        ),
      );
  }
}
