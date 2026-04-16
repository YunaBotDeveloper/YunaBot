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
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class BannerCommand extends Command {
  constructor() {
    super('banner', 'Get banner');

    this.advancedOptions.cooldown = 10000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user you specify')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');

    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const targetUser = await (
      interaction.options.getUser('user') || interaction.user
    ).fetch(true);
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const isGlobalBannerAnimated = targetUser.banner?.startsWith('a_');
    const isGuildBannerAnimated = member?.banner?.startsWith('a_');

    const globalBanner = targetUser.bannerURL({
      size: 4096,
      extension: isGlobalBannerAnimated ? 'gif' : 'png',
    });

    if (!globalBanner) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `${userMention(targetUser.id)} has no banner.`,
      );

      const message = await interaction.editReply({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    const guildBanner = member?.bannerURL({
      size: 4096,
      extension: isGuildBannerAnimated ? 'gif' : 'png',
    });

    const hasGuildBanner =
      member && guildBanner && guildBanner !== globalBanner;

    const deleteAt = new Date(Date.now() + 60000);

    const bannerContainer = this.bannerContainer(
      infoEmoji,
      memberEmoji,
      targetUser.id,
      globalBanner,
      hasGuildBanner ? guildBanner : undefined,
      deleteAt,
    );

    const message = await interaction.editReply({
      components: [bannerContainer],
      allowedMentions: {},
    });

    setTimeout(async () => {
      await message.delete().catch(() => null);
    }, 60000);
  }

  private bannerContainer(
    infoEmoji: unknown,
    memberEmoji: unknown,
    userId: string,
    globalBanner: string,
    guildBanner: string | undefined,
    deleteAt: Date,
  ): ContainerBuilder {
    const titleText = `## ${memberEmoji} Banner of ${userMention(userId)}`;
    const deleteText = `${String(infoEmoji)} This message will auto-delete in ${time(deleteAt, TimestampStyles.RelativeTime)}`;

    if (guildBanner) {
      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(titleText),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`**Type:** ${inlineCode('Global banner')}`),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(globalBanner)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Download global banner')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setStyle(ButtonStyle.Link)
                .setURL(globalBanner),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent('\u200b'),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`**Type:** ${inlineCode('Server banner')}`),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(guildBanner)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Download server banner')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setStyle(ButtonStyle.Link)
                .setURL(guildBanner),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(deleteText),
        );
    } else {
      const typeText = `**Type:** ${inlineCode('Global banner')}`;

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
          gallery.addItems(item => item.setURL(globalBanner)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to download banner')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Download')
                .setURL(globalBanner)
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
