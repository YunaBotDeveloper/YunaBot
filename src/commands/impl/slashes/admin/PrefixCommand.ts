import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import {Command} from '../../../Command';
import {EmbedColors} from '../../../../util/EmbedColors';
import PrefixManager from '../../../PrefixManager';
import {t, tMap} from '../../../../locale';

export default class PrefixCommand extends Command {
  constructor() {
    super('prefix', t('prefix.description'));
    this.data
      .setDescriptionLocalizations(tMap('prefix.description'))
      .addStringOption(option =>
        option
          .setName('new_prefix')
          .setDescription(t('prefix.option.new_prefix'))
          .setDescriptionLocalizations(tMap('prefix.option.new_prefix'))
          .setRequired(false)
          .setMaxLength(10),
      )
      .addBooleanOption(option =>
        option
          .setName('reset')
          .setDescription(t('prefix.option.reset'))
          .setDescriptionLocalizations(tMap('prefix.option.reset'))
          .setRequired(false),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = interaction.locale;

    if (!interaction.guild) {
      await interaction.reply({
        content: `❌ ${t('prefix.guild_only', locale)}`,
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
        .setTitle(`✅ ${t('prefix.reset_title', locale)}`)
        .setDescription(
          t('prefix.reset_description', locale, {prefix: defaultPrefix}),
        )
        .setFooter({text: interaction.user.tag})
        .setTimestamp();

      await interaction.reply({embeds: [embed]});
      return;
    }

    if (newPrefix) {
      await prefixManager.setPrefix(interaction.guild.id, newPrefix);

      const embed = new EmbedBuilder()
        .setColor(EmbedColors.green())
        .setTitle(`✅ ${t('prefix.updated_title', locale)}`)
        .setDescription(
          t('prefix.updated_description', locale, {prefix: newPrefix}),
        )
        .addFields({
          name: t('prefix.example', locale),
          value: `\`${t('prefix.updated_example', locale, {prefix: newPrefix})}\``,
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
      .setTitle(`📝 ${t('prefix.current_title', locale)}`)
      .setDescription(
        t('prefix.current_description', locale, {prefix: currentPrefix}),
      )
      .addFields(
        {
          name: t('prefix.default_prefix', locale),
          value: `\`${defaultPrefix}\``,
          inline: true,
        },
        {
          name: t('prefix.example', locale),
          value: `\`${t('prefix.updated_example', locale, {prefix: currentPrefix})}\``,
          inline: true,
        },
      )
      .setFooter({text: t('prefix.change_hint', locale)})
      .setTimestamp();

    await interaction.reply({embeds: [embed]});
  }
}
