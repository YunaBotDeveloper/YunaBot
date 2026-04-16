import {Command} from '../../../Command';
import {
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  subtext,
  time,
  TimestampStyles,
  userMention,
} from 'discord.js';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class AvatarCommand extends Command {
  constructor() {
    super('avatar', 'Get avatar');

    this.advancedOptions.cooldown = 10000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user you specify')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');
    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const targetUser = interaction.options.getUser('user') || interaction.user;
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

    const deleteAt = new Date(Date.now() + 60000);

    const avatarContainer = this.avatarContainer(
      infoEmoji,
      memberEmoji,
      targetUser.id,
      globalAvatar,
      hasGuildAvatar ? guildAvatar : undefined,
      deleteAt,
    );

    const message = await interaction.editReply({
      components: [avatarContainer],
      allowedMentions: {},
    });

    setTimeout(async () => {
      await message.delete().catch(() => null);
    }, 60000);
  }

  private avatarContainer(
    infoEmoji: unknown,
    memberEmoji: unknown,
    userId: string,
    globalAvatar: string,
    guildAvatar: string | undefined,
    deleteAt: Date,
  ): ContainerBuilder {
    const titleText = `## ${memberEmoji} Avatar of ${userMention(userId)}`;
    const deleteText = `${String(infoEmoji)} This message will auto-delete in ${time(deleteAt, TimestampStyles.RelativeTime)}`;

    if (guildAvatar) {
      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(titleText),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `**Type:** ${inlineCode('Global avatar')}`,
          ),
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
          textDisplay.setContent(
            `**Type:** ${inlineCode('Server avatar')}`,
          ),
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
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(subtext(deleteText)),
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
              textDisplay.setContent(
                subtext('Click here to download avatar'),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setURL(globalAvatar)
                .setStyle(ButtonStyle.Link),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(subtext(deleteText)),
        );
    }
  }
}
