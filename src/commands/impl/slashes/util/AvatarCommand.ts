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
import {Command} from '../../../Command';
import {EmbedColors} from '../../../../util/EmbedColors';
import Access from '../../../../instances/Access';

export default class AvatarCommand extends Command {
  constructor() {
    super('avatar', 'Yep another avatar command');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('User you want see')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply();

    const memberEmoji =
      await Access.getClient().api.emojiAPI.getEmojiByName('ui_member');

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const targetMember = interaction.options.getUser('user')
      ? interaction.options.getMember('user')
      : interaction.member;

    const globalAvatar = targetUser.displayAvatarURL({
      size: 4096,
      extension: 'png',
    });

    const guildAvatar =
      targetMember?.avatarURL({size: 4096, extension: 'png'}) ?? undefined;

    const deleteAt = new Date(Date.now() + 60_000);

    const avatarContainer = this.avatarContainer(
      memberEmoji,
      targetUser.id,
      globalAvatar,
      guildAvatar,
      deleteAt,
    );

    const message = await interaction.editReply({
      components: [avatarContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    setTimeout(() => message.delete().catch(() => null), 60_000);
  }

  private avatarContainer(
    memberEmoji: string | undefined,
    userId: string,
    globalAvatar: string,
    guildAvatar: string | undefined,
    deleteAt: Date,
  ): ContainerBuilder {
    const avatars: [string, string][] = [['Global avatar', globalAvatar]];
    if (guildAvatar) avatars.push(['Server avatar', guildAvatar]);

    const container = new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${memberEmoji ?? '👤'} Avatar of ${userMention(userId)}`,
        ),
      );

    for (const [label, url] of avatars) {
      container
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`**Type:** ${inlineCode(label)}`),
        )
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(url)),
        )
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext(`Download ${label.toLowerCase()}`),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setStyle(ButtonStyle.Link)
                .setURL(url),
            ),
        );
    }

    container
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(`Deletes ${time(deleteAt, TimestampStyles.RelativeTime)}`),
        ),
      );

    return container;
  }
}
