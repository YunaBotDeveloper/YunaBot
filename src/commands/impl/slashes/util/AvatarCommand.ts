import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
  GuildMember,
} from 'discord.js';
import {Command} from '../../../Command';

export default class AvatarCommand extends Command {
  constructor() {
    super('avatar', '🖼️ Hiển thị avatar của người dùng');

    this.advancedOptions.cooldown = 3000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người dùng cần xem avatar (mặc định là bạn)'),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    // Get global avatar
    const globalAvatar = targetUser.displayAvatarURL({
      size: 4096,
      extension: 'png',
    });

    // Get guild avatar if available
    const guildAvatar = member?.displayAvatarURL({
      size: 4096,
      extension: 'png',
    });

    // Check if user has a guild-specific avatar
    const hasGuildAvatar =
      member && guildAvatar && guildAvatar !== globalAvatar;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🖼️ Avatar của ${targetUser.tag}`)
      .setDescription(
        hasGuildAvatar
          ? '**Loại avatar:** Server Avatar\n\n*Sử dụng nút bên dưới để chuyển đổi giữa avatar server và avatar global*'
          : '**Loại avatar:** Global Avatar',
      )
      .setImage(hasGuildAvatar ? guildAvatar : globalAvatar)
      .setFooter({
        text: `ID: ${targetUser.id}`,
      })
      .setTimestamp();

    // Create buttons if guild avatar exists
    if (hasGuildAvatar) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Global Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(globalAvatar),
        new ButtonBuilder()
          .setLabel('🏠 Server Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(guildAvatar),
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
      });
    } else {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Open Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(globalAvatar),
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
      });
    }
  }
}
