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
import KissCount from '../../../../database/models/KissCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

const KISS_QUOTES = [
  'A kiss says what words cannot.',
  'A kiss is the language of the heart.',
  'Every kiss is a promise without words.',
  'Love is when their kiss melts your heart.',
  'No distance is far when hearts are close.',
];

const SELF_KISS_QUOTES = [
  'Self-love is the first step of a lifelong romance.',
  'Sometimes you just need to kiss yourself!',
  'The one always by your side is you.',
  'Loving yourself is not selfish, it is necessary.',
  'An air kiss counts too!',
];

const KISS_BACK_QUOTES = [
  'Love goes both ways!',
  'Kiss and kiss back, hearts racing.',
  'When two hearts beat in sync...',
  'No one wants to miss out!',
  'Return a kiss with a kiss!',
];

function randomQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default class KissCommand extends PrefixCommand {
  constructor() {
    super('kiss', [], 5000);
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
          components: [
            StatusContainer.failed(failedEmoji, 'Invalid user!'),
          ],
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
        components: [
          StatusContainer.failed(failedEmoji, 'Invalid user!'),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });
      setTimeout(() => ogMessage.delete().catch(() => null), 5000);
      return;
    }

    if (targetUser.bot) {
      await ogMessage.edit({
        components: [
          StatusContainer.failed(failedEmoji, 'You cannot kiss the bot.'),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });
      setTimeout(() => ogMessage.delete().catch(() => null), 5000);
      return;
    }

    let gifUrl: string;
    try {
      const response = await fetch(
        'https://api.purrbot.site/v2/img/sfw/kiss/gif',
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

    let kissCount = 0;
    if (targetUser.id !== message.author.id) {
      const [kissRecord] = await KissCount.findOrCreate({
        where: {userId: targetUser.id, guildId: guild.id},
        defaults: {userId: targetUser.id, guildId: guild.id, kissCount: 0},
      });
      await kissRecord.increment('kissCount');
      kissCount = kissRecord.kissCount + 1;
    }

    let kissBackCustomId: string | null =
      targetUser.id === message.author.id ? null : `kissBack_${message.id}`;

    const kissContainer = this.kissContainer(
      userIds,
      gifUrl,
      kissBackCustomId,
      false,
      false,
      kissCount,
    );

    await ogMessage.edit({
      components: [kissContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (!kissBackCustomId) return;

    ComponentManager.getComponentManager().register([
      {
        customId: kissBackCustomId,
        timeout: 60000,
        onTimeout: async () => {
          const timedOutContainer = this.kissContainer(
            userIds,
            gifUrl,
            kissBackCustomId,
            false,
            true,
            kissCount,
          );
          await ogMessage.edit({components: [timedOutContainer]});
        },
        handler: async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({components: [loadingContainer]});

          const [backRecord] = await KissCount.findOrCreate({
            where: {userId: userIds.user1, guildId: guild.id},
            defaults: {userId: userIds.user1, guildId: guild.id, kissCount: 0},
          });
          await backRecord.increment('kissCount');
          kissCount = backRecord.kissCount + 1;
          kissBackCustomId = null;

          const kissBackContainer = this.kissContainer(
            userIds,
            gifUrl,
            null,
            true,
            true,
            kissCount,
          );
          await btnInteraction.editReply({components: [kissBackContainer]});
        },
        type: ComponentEnum.BUTTON,
        userCheck: [targetUser.id],
      },
    ]);
  }

  kissContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    kissBackCustomId: string | null,
    isKissBack: boolean,
    disabledKissBackButton: boolean,
    kissCount: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(
      EmbedColors.random(),
    );

    const isSelfKiss = userIds.user1 === userIds.user2;

    if (isKissBack) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user2)} kissed back ${userMention(userIds.user1)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} kissed ${userMention(userIds.user2)}`,
        ),
      );
    }

    const quote = isKissBack
      ? randomQuote(KISS_BACK_QUOTES)
      : isSelfKiss
        ? randomQuote(SELF_KISS_QUOTES)
        : randomQuote(KISS_QUOTES);

    container.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(subtext(`"${quote}"`)),
    );

    const kissedUserId = isKissBack ? userIds.user1 : userIds.user2;

    container
      .addSeparatorComponents(separator => separator)
      .addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(gifURL)),
      );

    if (kissCount > 0) {
      container
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            subtext(
              `${userMention(kissedUserId)} has been kissed ${kissCount} times!`,
            ),
          ),
        );
    }

    if (kissBackCustomId) {
      container.addSeparatorComponents(separator => separator);

      if (disabledKissBackButton) {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Timeout expired')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(kissBackCustomId!)
                .setLabel('Kiss back')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to kiss back')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(kissBackCustomId!)
                .setLabel('Kiss back')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
