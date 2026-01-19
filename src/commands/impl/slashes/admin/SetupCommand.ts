import {
  channelMention,
  ChannelType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import {Command} from '../../../Command';
import GuildLog from '../../../../database/models/GuildLog.model';
import TempVoiceChannel from '../../../../database/models/TempVoiceChannel.model';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {EmbedColors} from '../../../../util/EmbedColors';
import Log4TS from '../../../../logger/Log4TS';

const logger = Log4TS.getLogger();

export default class SetupCommand extends Command {
  constructor() {
    super('setup', 'Setup the bot!');

    this.data.addSubcommandGroup(group =>
      group
        .setName('log')
        .setDescription('Setup log channel.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('nuke')
            .setDescription('Set default nuke log')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('Log channel')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
            ),
        ),
    );

    this.data.addSubcommandGroup(group =>
      group
        .setName('voice')
        .setDescription('Setup voice channel.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add temp voice channel')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('Voice channel')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice),
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
            const channel = interaction.options.getChannel('channel', true, [
              ChannelType.GuildText,
            ]);

            try {
              await GuildLog.upsert({
                guildId: guild.id,
                nukeLogId: channel.id,
              });

              const successContainer = new ContainerBuilder()
                .setAccentColor(EmbedColors.green())
                .addTextDisplayComponents(text =>
                  text.setContent(
                    `## ${successEmoji} Thành công!\nĐã đặt kênh log nuke thành ${channelMention(channel.id)}`,
                  ),
                );

              await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } catch {
              const failedContainer = new ContainerBuilder()
                .setAccentColor(EmbedColors.red())
                .addTextDisplayComponents(text =>
                  text.setContent(
                    `## ${failedEmoji} Lỗi!\nKhông thể lưu cài đặt. Vui lòng thử lại sau.`,
                  ),
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
      case 'voice': {
        switch (subcommand) {
          case 'add': {
            const channel = interaction.options.getChannel('channel', true, [
              ChannelType.GuildVoice,
            ]);

            try {
              // Fetch existing record or create new one
              const [record] = await TempVoiceChannel.findOrCreate({
                where: {guildId: guild.id},
                defaults: {
                  guildId: guild.id,
                  channelId: [],
                },
              });

              // Check if channel is already in the list
              if (record.channelId.includes(channel.id)) {
                const warningContainer = new ContainerBuilder()
                  .setAccentColor(EmbedColors.yellow())
                  .addTextDisplayComponents(text =>
                    text.setContent(
                      `## ⚠️ Cảnh báo!\\nKênh ${channelMention(channel.id)} đã được thiết lập làm kênh tạm thời rồi.`,
                    ),
                  );

                await interaction.editReply({
                  components: [warningContainer],
                  flags: MessageFlags.IsComponentsV2,
                });
                break;
              }

              // Add channel ID to the array
              record.channelId = [...record.channelId, channel.id];
              await record.save();

              const successContainer = new ContainerBuilder()
                .setAccentColor(EmbedColors.green())
                .addTextDisplayComponents(text =>
                  text.setContent(
                    `## ${successEmoji} Thành công!\\nĐã thêm ${channelMention(channel.id)} làm kênh voice tạm thời.`,
                  ),
                );

              await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } catch (error) {
              logger.error(`Error adding temp voice channel: ${error}`);
              const failedContainer = new ContainerBuilder()
                .setAccentColor(EmbedColors.red())
                .addTextDisplayComponents(text =>
                  text.setContent(
                    `## ${failedEmoji} Lỗi!\\nKhông thể lưu cài đặt. Vui lòng thử lại sau.`,
                  ),
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
