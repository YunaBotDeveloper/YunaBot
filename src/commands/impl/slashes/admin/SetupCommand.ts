import {
  channelMention,
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import {Command} from '../../../Command';
import GuildLog from '../../../../database/models/GuildLog.model';
import TempVoiceChannel from '../../../../database/models/TempVoiceChannel.model';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';

export default class SetupCommand extends Command {
  constructor() {
    super('setup', 'Setup the bot!');

    this.data.addSubcommandGroup(group =>
      group
        .setName('log')
        .setDescription('Cài đặt kênh log')
        .addSubcommand(subcommand =>
          subcommand
            .setName('nuke')
            .setDescription('Cài đặt kênh nuke log')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('Kênh log bạn muốn đặt')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
            ),
        ),
    );

    this.data.addSubcommandGroup(group =>
      group
        .setName('tempvoice')
        .setDescription('Cài đặt kênh trò chuyện tạm thời.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('create')
            .setDescription('Tạo kênh trò chuyện tạm thời mới.')
            .addStringOption(option =>
              option
                .setName('name')
                .setDescription('Tên kênh tạm thời bạn muốn tạo')
                .setRequired(true),
            )
            .addChannelOption(option =>
              option
                .setName('category')
                .setDescription('Vị trí kênh bạn muốn đặt')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false),
            ),
        ),
    );

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const client = interaction.client as ExtendedClient;
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');

    const guild = interaction.guild;

    if (!guild) return;

    const subcommandGroup = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommandGroup) {
      case 'log': {
        switch (subcommand) {
          case 'nuke': {
            const channel =
              interaction.options.getChannel<ChannelType.GuildText>(
                'channel',
                true,
                [ChannelType.GuildText],
              );

            try {
              await GuildLog.upsert({
                guildId: guild.id,
                nukeLogId: channel.id,
              });

              const successContainer = await StatusContainer.success(
                successEmoji,
                `Đã đặt kênh log nuke thành ${channelMention(channel.id)}`,
              );

              await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } catch {
              const failedContainer = await StatusContainer.failed(
                failedEmoji,
                'Không thể lưu cài đặt. Vui lòng thử lại sau.',
              );

              await interaction.editReply({
                components: [failedContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            }
            break;
          }
        }
        break;
      }
      case 'tempvoice': {
        switch (subcommand) {
          case 'create': {
            const existingConfig = await TempVoiceChannel.findOne({
              where: {
                guildId: guild.id,
              },
            });

            if (existingConfig) {
              const failedContainer = await StatusContainer.failed(
                failedEmoji,
                'Máy chủ này đã được thiết lập kênh voice tạm thời.',
              );

              await interaction.editReply({
                components: [failedContainer],
                flags: MessageFlags.IsComponentsV2,
              });
              return;
            }

            const channelName = interaction.options.getString('name', true);
            const channelCategory =
              interaction.options.getChannel<ChannelType.GuildCategory>(
                'category',
                false,
                [ChannelType.GuildCategory],
              );

            try {
              const newTempVoiceChannel =
                await guild.channels.create<ChannelType.GuildVoice>({
                  name: channelName,
                  type: ChannelType.GuildVoice,
                  parent: channelCategory,
                });

              const newTempVoiceChannelDB = new TempVoiceChannel({
                guildId: guild.id,
                channelId: newTempVoiceChannel.id,
              });

              await newTempVoiceChannelDB.save();

              const successContainer = await StatusContainer.success(
                successEmoji,
                `## ${successEmoji} Đã tạo kênh voice tạm thời ${channelMention(newTempVoiceChannel.id)}.`,
              );

              await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } catch {
              const failedContainer = await StatusContainer.failed(
                failedEmoji,
                `## ${failedEmoji} Đã xảy ra lỗi khi tạo kênh voice tạm thời. Vui lòng thử lại sau.`,
              );

              await interaction.editReply({
                components: [failedContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            }
            break;
          }
        }
        break;
      }
    }
  }
}
