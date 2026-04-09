import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  subtext,
  TextChannel,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import HugCount from '../../../../database/models/HugCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {
  tryAwardCoupleExp,
  ExpAwardResult,
  formatCooldown,
} from '../../../../util/CoupleHelper';

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

export default class HugCommand extends Command {
  constructor() {
    super('hug', 'Ôm một người dùng nào đó');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người bạn muốn ôm')
        .setRequired(true),
    );

    this.data.addBooleanOption(option =>
      option
        .setName('hide')
        .setDescription('Bạn muốn ẩn tên bạn không?')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: [MessageFlags.Ephemeral],
    });

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingContainer = StatusContainer.loading(loadingEmoji);

    await interaction.editReply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const targetUser = interaction.options.getUser('user', true);

    const shouldHideName = interaction.options.getBoolean('hide') ?? false;

    if (targetUser.bot) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(failedEmoji, 'Bạn không thể ôm bot!'),
        ],
      });
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
      await interaction.editReply({
        components: [
          StatusContainer.failed(failedEmoji, 'yeah it throw an error'),
        ],
      });
      return;
    }

    const userIds = {
      user1: interaction.user.id,
      user2: targetUser.id,
    };

    let hugCount = 0;
    let coupleExpResult: ExpAwardResult | null = null;
    if (targetUser.id !== interaction.user.id) {
      const [hugRecord] = await HugCount.findOrCreate({
        where: {userId: targetUser.id, guildId: interaction.guild!.id},
        defaults: {
          userId: targetUser.id,
          guildId: interaction.guild!.id,
          hugCount: 0,
        },
      });
      await hugRecord.increment('hugCount');
      hugCount = hugRecord.hugCount + 1;

      coupleExpResult = await tryAwardCoupleExp(
        interaction.user.id,
        targetUser.id,
        interaction.guild!.id,
        'hug',
      );
    }

    let hugBackCustomId: string | null =
      shouldHideName || targetUser.id === interaction.user.id
        ? null
        : `hugBack_${interaction.id}`;

    const hugContainer = this.hugContainer(
      userIds,
      gifUrl,
      hugBackCustomId,
      false,
      false,
      shouldHideName,
      hugCount,
      coupleExpResult,
    );

    const successContainer = StatusContainer.success(
      successEmoji,
      'Gửi thành công!',
    );

    await interaction.editReply({
      components: [successContainer],
    });

    const sentMessage = await (interaction.channel as TextChannel).send({
      components: [hugContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (hugBackCustomId) {
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
              shouldHideName,
              hugCount,
              null,
            );
            await sentMessage.edit({components: [timedOutContainer]});
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.update({components: [loadingContainer]});

            const [backRecord] = await HugCount.findOrCreate({
              where: {userId: userIds.user1, guildId: interaction.guild!.id},
              defaults: {
                userId: userIds.user1,
                guildId: interaction.guild!.id,
                hugCount: 0,
              },
            });
            await backRecord.increment('hugCount');
            hugCount = backRecord.hugCount + 1;
            hugBackCustomId = null;

            await tryAwardCoupleExp(
              targetUser.id,
              interaction.user.id,
              interaction.guild!.id,
              'hug',
            );

            const hugBackContainer = this.hugContainer(
              userIds,
              gifUrl,
              null,
              true,
              true,
              shouldHideName,
              hugCount,
              null,
            );
            await btnInteraction.editReply({components: [hugBackContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [targetUser.id],
        },
      ]);
    }

    return;
  }

  hugContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    hugBackCustomId: string | null,
    isHugBack: boolean,
    disabledHugBackButton: boolean,
    shouldHideName: boolean,
    hugCount: number,
    coupleExp: ExpAwardResult | null,
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
    } else if (shouldHideName) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## Ai đó đã ôm ${userMention(userIds.user2)}!`),
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

    if (coupleExp?.awarded) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `💑 +${coupleExp.expGained} EXP couple! (Tổng: ${coupleExp.totalExp} • Cấp ${coupleExp.level})`,
          ),
        ),
      );
    } else if (
      coupleExp?.reason === 'cooldown' &&
      coupleExp.cooldownRemainingMs
    ) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `⏳ Cooldown ôm: còn ${formatCooldown(coupleExp.cooldownRemainingMs!)} nữa`,
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
