import {
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  Message,
  MessageFlags,
  subtext,
  userMention,
} from 'discord.js';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {PrefixCommand} from '../../../PrefixCommand';
import {StatusContainer} from '../../../../util/StatusContainer';
import HugCount from '../../../../database/models/HugCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

const HUG_QUOTES = [
  'A hug can heal what words cannot.',
  'Come on, give them a hug. Life is short!',
  'Warm arms are the best medicine.',
  'Sometimes all you need is a tight hug.',
  "A hug is the heart's language without translation.",
];

const SELF_HUG_QUOTES = [
  'Hugging yourself is also self-love!',
  'Sometimes you need to hug yourself.',
  'You deserve a hug, even from yourself!',
  'No one can hug you better than you can.',
  'Love yourself every day.',
];

const HUG_BACK_QUOTES = [
  'Hugging back makes the bond even stronger!',
  'When love is shared, it doubles.',
  'Spread warmth everywhere!',
  'No one loses in a battle of affection!',
  'Happiness is giving and receiving hugs.',
];

function randomQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default class HugCommand extends PrefixCommand {
  constructor() {
    super('hug', [], 5000);
  }

  async run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ) {
    const {message, client} = context;
    const guild = message.guild;

    if (!guild) return;

    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingContainer = StatusContainer.loading(loadingEmoji);

    const ogMessage = await message.reply({
      content: '',
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    let targetUserId: string | undefined;
    const userInput = args[0];

    if (userInput) {
      const mentionMatch = userInput.match(/^<@!?(\d+)>$/);
      if (mentionMatch) {
        targetUserId = mentionMatch[1];
      } else if (/^\d+$/.test(userInput)) {
        targetUserId = userInput;
      } else {
        const normalizedInput = userInput.toLowerCase();
        const foundMember = guild.members.cache.find(
          member =>
            member.user.username.toLowerCase() === normalizedInput ||
            member.user.tag.toLowerCase() === normalizedInput ||
            member.displayName.toLowerCase() === normalizedInput,
        );
        if (foundMember) targetUserId = foundMember.user.id;
      }

      if (!targetUserId) {
        await ogMessage.edit({
          components: [StatusContainer.failed(failedEmoji, 'Invalid user!')],
          flags: [MessageFlags.IsComponentsV2],
        });
        setTimeout(() => ogMessage.delete().catch(() => null), 5000);
        return;
      }
    }

    const targetUser = targetUserId
      ? ((await guild.members.fetch(targetUserId).catch(() => null))?.user ??
        null)
      : message.author;

    if (!targetUser) return;

    if (targetUserId && !targetUser) {
      await ogMessage.edit({
        components: [StatusContainer.failed(failedEmoji, 'Invalid user!')],
        flags: [MessageFlags.IsComponentsV2],
      });
      setTimeout(() => ogMessage.delete().catch(() => null), 5000);
      return;
    }

    if (targetUser.bot) {
      await ogMessage.edit({
        components: [
          StatusContainer.failed(failedEmoji, 'You cannot hug the bot.'),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });
      setTimeout(() => ogMessage.delete().catch(() => null), 5000);
      return;
    }

    let gifUrl: string;
    try {
      const response = await fetch(
        'https://api.purrbot.site/v2/img/sfw/hug/gif',
      );
      const data = (await response.json()) as {link: string; error: boolean};
      if (data.error || !data.link) throw new Error('API error');
      gifUrl = data.link;
    } catch {
      await ogMessage.edit({
        components: [
          StatusContainer.failed(failedEmoji, 'yeah it throw an error'),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const userIds = {user1: message.author.id, user2: targetUser.id};

    let hugCount = 0;
    if (targetUser.id !== message.author.id) {
      const [hugRecord] = await HugCount.findOrCreate({
        where: {userId: targetUser.id, guildId: guild.id},
        defaults: {userId: targetUser.id, guildId: guild.id, hugCount: 0},
      });
      await hugRecord.increment('hugCount');
      hugCount = hugRecord.hugCount + 1;
    }

    let hugBackCustomId: string | null =
      targetUser.id === message.author.id ? null : `hugBack_${message.id}`;

    const hugContainer = this.hugContainer(
      userIds,
      gifUrl,
      hugBackCustomId,
      false,
      false,
      hugCount,
    );

    await ogMessage.edit({
      components: [hugContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (!hugBackCustomId) return;

    ComponentManager.getComponentManager().register([
      {
        customId: hugBackCustomId,
        timeout: 60000,
        onTimeout: async () => {
          const timedOutContainer = this.hugContainer(
            userIds,
            gifUrl,
            hugBackCustomId,
            false,
            true,
            hugCount,
          );
          await ogMessage.edit({components: [timedOutContainer]});
        },
        handler: async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({components: [loadingContainer]});

          const [backRecord] = await HugCount.findOrCreate({
            where: {userId: userIds.user1, guildId: guild.id},
            defaults: {userId: userIds.user1, guildId: guild.id, hugCount: 0},
          });
          await backRecord.increment('hugCount');
          hugCount = backRecord.hugCount + 1;
          hugBackCustomId = null;

          const hugBackContainer = this.hugContainer(
            userIds,
            gifUrl,
            null,
            true,
            true,
            hugCount,
          );
          await btnInteraction.editReply({components: [hugBackContainer]});
        },
        type: ComponentEnum.BUTTON,
        userCheck: [targetUser.id],
      },
    ]);
  }

  hugContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    hugBackCustomId: string | null,
    isHugBack: boolean,
    disabledHugBackButton: boolean,
    hugCount: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(
      EmbedColors.random(),
    );

    const isSelfHug = userIds.user1 === userIds.user2;

    if (isHugBack) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user2)} hugged back ${userMention(userIds.user1)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} hugged ${userMention(userIds.user2)}`,
        ),
      );
    }

    const quote = isHugBack
      ? randomQuote(HUG_BACK_QUOTES)
      : isSelfHug
        ? randomQuote(SELF_HUG_QUOTES)
        : randomQuote(HUG_QUOTES);

    container.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(subtext(`"${quote}"`)),
    );

    const huggedUserId = isHugBack ? userIds.user1 : userIds.user2;

    container
      .addSeparatorComponents(separator => separator)
      .addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(gifURL)),
      );

    if (hugCount > 0) {
      container
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            subtext(
              `${userMention(huggedUserId)} has been hugged ${hugCount} times!`,
            ),
          ),
        );
    }

    if (hugBackCustomId) {
      container.addSeparatorComponents(separator => separator);

      if (disabledHugBackButton) {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Timeout expired')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(hugBackCustomId!)
                .setLabel('Hug back')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to hug back')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(hugBackCustomId!)
                .setLabel('Hug back')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
