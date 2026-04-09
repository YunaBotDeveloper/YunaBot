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
  'Một cái xoa đầu đôi khi còn ý nghĩa hơn ngàn lời nói.',
  'Đôi tay ấm áp, trái tim bình yên.',
  'Được vỗ về là cảm giác hạnh phúc nhất.',
  'Đôi khi tất cả những gì bạn cần là một cái xoa đầu nhẹ nhàng.',
  'Sự quan tâm nhỏ bé nhưng ý nghĩa lớn lao.',
];

const SELF_PAT_QUOTES = [
  'Tự khen mình cũng không sao, bạn xứng đáng được như vậy!',
  'Đôi khi bạn cần tự vỗ về chính mình.',
  'Giỏi lắm! Hãy tự thưởng cho bản thân nào.',
  'Không ai hiểu bạn hơn chính bạn!',
  'Tự hào về bản thân là điều tuyệt vời.',
];

const PAT_BACK_QUOTES = [
  'Lan truyền sự ấm áp đi khắp nơi!',
  'Xoa đầu qua lại, tình thân ngày càng bền chặt.',
  'Khi yêu thương được chia sẻ, nó nhân lên gấp đôi.',
  'Không ai chịu thua trong cuộc chiến yêu thương!',
  'Hạnh phúc là khi được vỗ về và được vỗ về lại.',
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
            StatusContainer.failed(failedEmoji, 'Người dùng không hợp lệ!'),
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
          StatusContainer.failed(failedEmoji, 'Người dùng không hợp lệ!'),
        ],
        flags: [MessageFlags.IsComponentsV2],
      });
      setTimeout(() => ogMessage.delete().catch(() => null), 5000);
      return;
    }

    if (targetUser.bot) {
      await ogMessage.edit({
        components: [
          StatusContainer.failed(failedEmoji, 'Bạn không thể xoa đầu bot!'),
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
          `## ${userMention(userIds.user2)} đã xoa đầu lại ${userMention(userIds.user1)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} vừa xoa đầu ${userMention(userIds.user2)}`,
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
              `${userMention(pattedUserId)} đã được xoa đầu ${patCount} lần!`,
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
              textDisplay.setContent(subtext('Đã hết thời gian chờ')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(patBackCustomId!)
                .setLabel('Xoa đầu lại')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Bấm vào đây để xoa đầu lại họ')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(patBackCustomId!)
                .setLabel('Xoa đầu lại')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
