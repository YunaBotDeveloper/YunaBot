import {
  ButtonStyle,
  ContainerBuilder,
  inlineCode,
  Message,
  MessageFlags,
  subtext,
  time,
  TimestampStyles,
  userMention,
} from 'discord.js';
import {PrefixCommand} from '../../../PrefixCommand';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class BannerCommand extends PrefixCommand {
  constructor() {
    super('banner', ['b']);

    this.cooldown = 5000;
  }

  async run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ) {
    const {message, client} = context;

    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');

    const loadingContainer = StatusContainer.loading(loadingEmoji);

    const ogmessage = await message.reply({
      content: '',
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    let targetUserId: string | undefined;
    const userInput = args[0];

    if (userInput) {
      const mentionMatch = userInput.match(/^<@!?(\d+)>$/);
      if (mentionMatch) {
        targetUserId = mentionMatch[1];
      } else if (/^\d+$/.test(userInput)) {
        targetUserId = userInput;
      } else if (message.guild) {
        const normalizedInput = userInput.toLowerCase();
        const foundMember = message.guild.members.cache.find(
          member =>
            member.user.username.toLowerCase() === normalizedInput ||
            member.user.tag.toLowerCase() === normalizedInput ||
            member.displayName.toLowerCase() === normalizedInput,
        );
        if (foundMember) {
          targetUserId = foundMember.user.id;
        }
      }

      if (!targetUserId) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          'Invalid user!',
        );

        await ogmessage.edit({
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2],
        });

        setTimeout(async () => {
          await ogmessage.delete().catch(() => null);
        }, 10000);

        return;
      }
    } else {
      targetUserId = message.author.id;
    }

    const targetUser = await client.users
      .fetch(targetUserId, {force: true})
      .catch(() => null);
    if (!targetUser) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Invalid user!',
      );

      await ogmessage.edit({
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      setTimeout(async () => {
        await ogmessage.delete().catch(() => null);
      }, 10000);

      return;
    }

    const member = message.guild
      ? await message.guild.members
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
      await ogmessage.edit({
        content: '',
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      setTimeout(async () => {
        await ogmessage.delete().catch(() => null);
      }, 5000);

      return;
    }

    const hasGuildBanner =
      member && guildBanner && guildBanner !== globalBanner;

    const deleteAt = new Date(Date.now() + 60000);

    const bannerContainer = this.bannerContainer(
      infoEmoji,
      memberEmoji,
      targetUser.id,
      globalBanner ?? undefined,
      hasGuildBanner ? guildBanner : undefined,
      deleteAt,
    );

    const replyMessage = await ogmessage.edit({
      content: '',
      components: [bannerContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    setTimeout(async () => {
      await replyMessage.delete().catch(() => null);
    }, 60000);
  }

  private bannerContainer(
    infoEmoji: unknown,
    memberEmoji: unknown,
    userId: string,
    globalBanner: string | undefined,
    guildBanner: string | undefined,
    deleteAt: Date,
  ): ContainerBuilder {
    const titleText = `## ${memberEmoji} Banner of ${userMention(userId)}`;
    const deleteText = `${String(infoEmoji)} This message will auto-delete in ${time(deleteAt, TimestampStyles.RelativeTime)}`;

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
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(deleteText),
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
              .setStyle(ButtonStyle.Link)
              .setURL(singleBanner!),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(deleteText),
      );
  }
}
