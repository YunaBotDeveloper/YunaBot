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
import ExtendedClient from '../../../../classes/ExtendedClient';
import {EmbedColors} from '../../../../util/EmbedColors';

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
    }
  }
}
