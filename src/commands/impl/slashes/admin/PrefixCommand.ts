import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import {Command} from '../../../Command';
import {EmbedColors} from '../../../../util/EmbedColors';
import PrefixManager from '../../../PrefixManager';

export default class PrefixCommand extends Command {
  constructor() {
    super('prefix', 'Xem hoặc thay đổi prefix cho bot trong máy chủ này');
    this.data
      .addStringOption(option =>
        option
          .setName('new_prefix')
          .setDescription('Prefix mới (để trống để xem prefix hiện tại)')
          .setRequired(false)
          .setMaxLength(10),
      )
      .addBooleanOption(option =>
        option
          .setName('reset')
          .setDescription('Đặt lại prefix về mặc định (!)')
          .setRequired(false),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Lệnh này chỉ có thể dùng trong máy chủ!',
        ephemeral: true,
      });
      return;
    }

    const prefixManager = PrefixManager.getInstance();
    const newPrefix = interaction.options.getString('new_prefix');
    const reset = interaction.options.getBoolean('reset');

    if (reset) {
      await prefixManager.resetPrefix(interaction.guild.id);
      const defaultPrefix = prefixManager.getDefaultPrefix();

      const embed = new EmbedBuilder()
        .setColor(EmbedColors.green())
        .setTitle('✅ Đã đặt lại Prefix')
        .setDescription(`Prefix đã được đặt lại về mặc định: \`${defaultPrefix}\``)
        .setFooter({text: interaction.user.tag})
        .setTimestamp();

      await interaction.reply({embeds: [embed]});
      return;
    }

    if (newPrefix) {
      await prefixManager.setPrefix(interaction.guild.id, newPrefix);

      const embed = new EmbedBuilder()
        .setColor(EmbedColors.green())
        .setTitle('✅ Đã cập nhật Prefix')
        .setDescription(`Prefix đã được thay đổi thành: \`${newPrefix}\``)
        .addFields({
          name: 'Ví dụ',
          value: `\`${newPrefix}help\``,
          inline: true,
        })
        .setFooter({text: interaction.user.tag})
        .setTimestamp();

      await interaction.reply({embeds: [embed]});
      return;
    }

    const currentPrefix = await prefixManager.getPrefix(interaction.guild.id);
    const defaultPrefix = prefixManager.getDefaultPrefix();

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.blue())
      .setTitle('📝 Prefix máy chủ')
      .setDescription(`Prefix hiện tại của máy chủ này là: \`${currentPrefix}\``)
      .addFields(
        {
          name: 'Prefix mặc định',
          value: `\`${defaultPrefix}\``,
          inline: true,
        },
        {
          name: 'Ví dụ',
          value: `\`${currentPrefix}help\``,
          inline: true,
        },
      )
      .setFooter({text: 'Dùng /prefix <prefix_mới> để thay đổi'})
      .setTimestamp();

    await interaction.reply({embeds: [embed]});
  }
}
