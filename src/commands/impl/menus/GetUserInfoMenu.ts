import {
  ApplicationCommandType,
  EmbedBuilder,
  MessageFlags,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import {ContextMenuCommand} from '../../ContextMenuCommand';
import {EmbedColors} from '../../../util/EmbedColors';

export default class GetUserInfoMenu extends ContextMenuCommand {
  constructor() {
    super('Get User Info', ApplicationCommandType.User);
  }

  async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
    const targetUser = interaction.targetUser;
    const targetMember = interaction.targetMember;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: targetUser.displayName,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setColor(EmbedColors.blue())
      .setTitle('👤 User Information')
      .setThumbnail(targetUser.displayAvatarURL({size: 256}))
      .addFields(
        {name: '🆔 User ID', value: targetUser.id, inline: true},
        {name: '📛 Username', value: targetUser.username, inline: true},
        {name: '🤖 Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true},
        {
          name: '📅 Account Created',
          value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
          inline: false,
        },
      )
      .setFooter({
        text: `Requested by ${interaction.user.displayName}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (targetMember && 'joinedTimestamp' in targetMember) {
      embed.addFields({
        name: '📥 Joined Server',
        value: `<t:${Math.floor((targetMember.joinedTimestamp ?? 0) / 1000)}:F>`,
        inline: false,
      });
    }

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }
}
