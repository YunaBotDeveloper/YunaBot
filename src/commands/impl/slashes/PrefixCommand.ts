import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import {Command} from '../../Command';
import {EmbedColors} from '../../../util/EmbedColors';
import PrefixManager from '../../PrefixManager';

export default class PrefixCommand extends Command {
  constructor() {
    super('prefix', 'View or change the bot prefix for this server');
    this.data
      .addStringOption(option =>
        option
          .setName('new_prefix')
          .setDescription(
            'The new prefix to set (leave empty to view current prefix)',
          )
          .setRequired(false)
          .setMaxLength(10),
      )
      .addBooleanOption(option =>
        option
          .setName('reset')
          .setDescription('Reset the prefix to default (!)')
          .setRequired(false),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ This command can only be used in a server!',
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
        .setTitle('✅ Prefix Reset')
        .setDescription(
          `The prefix has been reset to the default: \`${defaultPrefix}\``,
        )
        .setFooter({text: `Changed by ${interaction.user.tag}`})
        .setTimestamp();

      await interaction.reply({embeds: [embed]});
      return;
    }

    if (newPrefix) {
      await prefixManager.setPrefix(interaction.guild.id, newPrefix);

      const embed = new EmbedBuilder()
        .setColor(EmbedColors.green())
        .setTitle('✅ Prefix Updated')
        .setDescription(`The prefix has been changed to: \`${newPrefix}\``)
        .addFields({
          name: 'Example',
          value: `\`${newPrefix}help\``,
          inline: true,
        })
        .setFooter({text: `Changed by ${interaction.user.tag}`})
        .setTimestamp();

      await interaction.reply({embeds: [embed]});
      return;
    }

    const currentPrefix = await prefixManager.getPrefix(interaction.guild.id);
    const defaultPrefix = prefixManager.getDefaultPrefix();

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.blue())
      .setTitle('📝 Server Prefix')
      .setDescription(
        `The current prefix for this server is: \`${currentPrefix}\``,
      )
      .addFields(
        {name: 'Default Prefix', value: `\`${defaultPrefix}\``, inline: true},
        {name: 'Example', value: `\`${currentPrefix}help\``, inline: true},
      )
      .setFooter({text: 'Use /prefix <new_prefix> to change it'})
      .setTimestamp();

    await interaction.reply({embeds: [embed]});
  }
}
