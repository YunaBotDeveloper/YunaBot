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

export default class BannerMenu extends ContextMenuCommand {
  constructor() {
    super('Get banner', ApplicationCommandType.User);

    this.advancedOptions.cooldown = 10000;
  }

  async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');

    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    let targetUser;
    try {
      targetUser = await interaction.targetUser.fetch(true);
    } catch {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Could not fetch user information!',
      );
      await interaction.editReply({components: [errorContainer]});
      return;
    }

    const member = interaction.guild
      ? await interaction.guild.members
          .fetch({user: targetUser.id, force: true})
          .catch(() => null)
      : null;

    const isGlobalBannerAnimated = targetUser.banner?.startsWith('a_');
    const isGuildBannerAnimated = member?.banner?.startsWith('a_');

    const globalBanner = targetUser.bannerURL({
      size: 4096,
      extension: isGlobalBannerAnimated ? 'gif' : 'png',
    });

    const guildBanner = member?.bannerURL({
      size: 4096,
      extension: isGuildBannerAnimated ? 'gif' : 'png',
    });

    if (!globalBanner && !guildBanner) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `${userMention(targetUser.id)} has no banner.`,
      );
      await interaction.editReply({
        components: [errorContainer],
      });
      return;
    }

    const hasGuildBanner =
      member && guildBanner && guildBanner !== globalBanner;

    const bannerContainer = this.bannerContainer(
      infoEmoji,
      memberEmoji,
      targetUser.id,
      globalBanner ?? undefined,
      hasGuildBanner ? guildBanner : undefined,
    );

    await interaction.editReply({
      components: [bannerContainer],
      allowedMentions: {},
    });
  }

  private bannerContainer(
    infoEmoji: unknown,
    memberEmoji: unknown,
    userId: string,
    globalBanner: string | undefined,
    guildBanner: string | undefined,
  ): ContainerBuilder {
    const titleText = `## ${memberEmoji} Banner of ${userMention(userId)}`;

    if (guildBanner && globalBanner) {
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
        );
    }

    const singleBanner = guildBanner ?? globalBanner;
    const singleBannerType = guildBanner ? 'Server banner' : 'Global banner';
    const singleBannerDownload = guildBanner
      ? 'Download server banner'
      : 'Download global banner';

    return new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(titleText),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`**Type:** ${inlineCode(singleBannerType)}`),
      )
      .addSeparatorComponents(separator => separator)
      .addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(singleBanner!)),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext(singleBannerDownload)),
          )
          .setButtonAccessory(button =>
            button
              .setLabel('Download')
              .setURL(singleBanner!)
              .setStyle(ButtonStyle.Link),
          ),
      );
  }
}
