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
import PatCount from '../../../../database/models/PatCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

const PAT_QUOTES = [
  'A pat on the head can mean more than a thousand words.',
  'Warm hands, peaceful heart.',
  'Being comforted is pure happiness.',
  'Sometimes all you need is a gentle head pat.',
  'A small gesture can mean a lot.',
];

const SELF_PAT_QUOTES = [
  'It is okay to praise yourself, you deserve it!',
  'Sometimes you need to comfort yourself.',
  'Great job! Treat yourself.',
  'No one understands you better than you do!',
  'Being proud of yourself is wonderful.',
];

const PAT_BACK_QUOTES = [
  'Spread warmth everywhere!',
  'Patting back makes bonds stronger.',
  'When love is shared, it doubles.',
  'No one loses in a battle of affection!',
  'Happiness is comforting and being comforted back.',
];

function randomQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default class PatCommand extends PrefixCommand {
  constructor() {
    super('pat', [], 5000);
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
          StatusContainer.failed(failedEmoji, 'You cannot pat the bot.'),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });
      setTimeout(() => ogMessage.delete().catch(() => null), 5000);
      return;
    }

    let gifUrl: string;
    try {
      const response = await fetch(
        'https://api.purrbot.site/v2/img/sfw/pat/gif',
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

    let patCount = 0;
    if (targetUser.id !== message.author.id) {
      const [patRecord] = await PatCount.findOrCreate({
        where: {userId: targetUser.id, guildId: guild.id},
        defaults: {userId: targetUser.id, guildId: guild.id, patCount: 0},
      });
      await patRecord.increment('patCount');
      patCount = patRecord.patCount + 1;
    }

    let patBackCustomId: string | null =
      targetUser.id === message.author.id ? null : `patBack_${message.id}`;

    const patContainer = this.patContainer(
      userIds,
      gifUrl,
      patBackCustomId,
      false,
      false,
      patCount,
    );

    await ogMessage.edit({
      components: [patContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (!patBackCustomId) return;

    ComponentManager.getComponentManager().register([
      {
        customId: patBackCustomId,
        timeout: 60000,
        onTimeout: async () => {
          const timedOutContainer = this.patContainer(
            userIds,
            gifUrl,
            patBackCustomId,
            false,
            true,
            patCount,
          );
          await ogMessage.edit({components: [timedOutContainer]});
        },
        handler: async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({components: [loadingContainer]});

          const [backRecord] = await PatCount.findOrCreate({
            where: {userId: userIds.user1, guildId: guild.id},
            defaults: {userId: userIds.user1, guildId: guild.id, patCount: 0},
          });
          await backRecord.increment('patCount');
          patCount = backRecord.patCount + 1;
          patBackCustomId = null;

          const patBackContainer = this.patContainer(
            userIds,
            gifUrl,
            null,
            true,
            true,
            patCount,
          );
          await btnInteraction.editReply({components: [patBackContainer]});
        },
        type: ComponentEnum.BUTTON,
        userCheck: [targetUser.id],
      },
    ]);
  }

  patContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    patBackCustomId: string | null,
    isPatBack: boolean,
    disabledPatBackButton: boolean,
    patCount: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(
      EmbedColors.random(),
    );

    const isSelfPat = userIds.user1 === userIds.user2;

    if (isPatBack) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user2)} patted back ${userMention(userIds.user1)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} patted ${userMention(userIds.user2)}`,
        ),
      );
    }

    const quote = isPatBack
      ? randomQuote(PAT_BACK_QUOTES)
      : isSelfPat
        ? randomQuote(SELF_PAT_QUOTES)
        : randomQuote(PAT_QUOTES);

    container.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(subtext(`"${quote}"`)),
    );

    const pattedUserId = isPatBack ? userIds.user1 : userIds.user2;

    container
      .addSeparatorComponents(separator => separator)
      .addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(gifURL)),
      );

    if (patCount > 0) {
      container
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            subtext(
              `${userMention(pattedUserId)} has been patted ${patCount} times!`,
            ),
          ),
        );
    }

    if (patBackCustomId) {
      container.addSeparatorComponents(separator => separator);

      if (disabledPatBackButton) {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Timeout expired')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(patBackCustomId!)
                .setLabel('Pat back')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to pat back')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(patBackCustomId!)
                .setLabel('Pat back')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
