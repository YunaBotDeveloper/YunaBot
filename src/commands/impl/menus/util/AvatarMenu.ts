import {
  ApplicationCommandType,
  ButtonStyle,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  subtext,
  UserContextMenuCommandInteraction,
  userMention,
} from 'discord.js';
import {ContextMenuCommand} from '../../../ContextMenuCommand';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class AvatarMenu extends ContextMenuCommand {
  constructor() {
    super('Get avatar', ApplicationCommandType.User);

    this.advancedOptions.cooldown = 10000;
  }

  async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');
    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    const targetUser = interaction.targetUser;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const isGlobalAvatarAnimated = targetUser.avatar?.startsWith('a_');
    const isGuildAvatarAnimated = member?.avatar?.startsWith('a_');

    const globalAvatar = targetUser.displayAvatarURL({
      size: 4096,
      extension: isGlobalAvatarAnimated ? 'gif' : 'png',
    });

    const guildAvatar = member?.displayAvatarURL({
      size: 4096,
      extension: isGuildAvatarAnimated ? 'gif' : 'png',
    });

    const hasGuildAvatar =
      member && guildAvatar && guildAvatar !== globalAvatar;

    const avatarContainer = this.avatarContainer(
      infoEmoji,
      memberEmoji,
      targetUser.id,
      globalAvatar,
      hasGuildAvatar ? guildAvatar : undefined,
    );

    await interaction.editReply({
      components: [avatarContainer],
      allowedMentions: {},
    });
  }

  private avatarContainer(
    infoEmoji: unknown,
    memberEmoji: unknown,
    userId: string,
    globalAvatar: string,
    guildAvatar: string | undefined,
  ): ContainerBuilder {
    const titleText = `## ${memberEmoji} Avatar of ${userMention(userId)}`;

    if (guildAvatar) {
      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(titleText),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`**Type:** ${inlineCode('Global avatar')}`),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(globalAvatar)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Download global avatar')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setStyle(ButtonStyle.Link)
                .setURL(globalAvatar),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent('\u200b'),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`**Type:** ${inlineCode('Server avatar')}`),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(guildAvatar)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Download server avatar')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setStyle(ButtonStyle.Link)
                .setURL(guildAvatar),
            ),
        );
    } else {
      const typeText = `**Type:** ${inlineCode('Global avatar')}`;

      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(titleText),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(typeText),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(globalAvatar)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to download avatar')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setURL(globalAvatar)
                .setStyle(ButtonStyle.Link),
            ),
        );
    }
  }
}
