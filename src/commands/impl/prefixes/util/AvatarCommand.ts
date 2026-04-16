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

export default class AvatarCommand extends PrefixCommand {
  constructor() {
    super('avatar', ['av']);

    this.cooldown = 10000;
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

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
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

    const member = message.guild?.members.cache.get(targetUser.id);

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

    const replyMessage = await ogmessage.edit({
      content: '',
      components: [avatarContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    setTimeout(async () => {
      await replyMessage.delete().catch(() => null);
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
          textDisplay.setContent(deleteText),
        );
    }

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
        textDisplay.setContent(deleteText),
      );
  }
}
