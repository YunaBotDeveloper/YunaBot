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
  'Một cái ôm có thể chữa lành những điều mà lời nói không thể.',
  'Ôm nhau đi, cuộc đời ngắn lắm!',
  'Vòng tay ấm áp là liều thuốc tốt nhất.',
  'Đôi khi tất cả những gì bạn cần là một cái ôm thật chặt.',
  'Ôm là ngôn ngữ của trái tim không cần dịch.',
];

const SELF_HUG_QUOTES = [
  'Tự ôm mình cũng là một cách yêu thương bản thân!',
  'Đôi khi bạn cần tự ôm lấy chính mình.',
  'Bạn xứng đáng được ôm, dù là tự ôm!',
  'Không ai có thể ôm bạn tốt hơn chính bạn.',
  'Hãy yêu thương bản thân mỗi ngày.',
];

const HUG_BACK_QUOTES = [
  'Ôm qua ôm lại, tình thân ngày càng bền chặt!',
  'Khi yêu thương được chia sẻ, nó nhân lên gấp đôi.',
  'Lan truyền sự ấm áp đi khắp nơi!',
  'Không ai chịu thua trong cuộc chiến yêu thương!',
  'Hạnh phúc là khi được ôm và được ôm lại.',
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
          StatusContainer.failed(failedEmoji, 'Bạn không thể ôm bot!'),
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
          `## ${userMention(userIds.user2)} đã ôm lại ${userMention(userIds.user1)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} vừa ôm ${userMention(userIds.user2)}`,
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
            subtext(`${userMention(huggedUserId)} đã được ôm ${hugCount} lần!`),
          ),
        );
    }

    if (hugBackCustomId) {
      container.addSeparatorComponents(separator => separator);

      if (disabledHugBackButton) {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Đã hết thời gian chờ')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(hugBackCustomId!)
                .setLabel('Ôm lại')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Bấm vào đây để ôm lại họ')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(hugBackCustomId!)
                .setLabel('Ôm lại')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
