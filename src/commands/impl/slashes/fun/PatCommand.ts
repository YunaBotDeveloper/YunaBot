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
import PatCount from '../../../../database/models/PatCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {
  tryAwardCoupleExp,
  ExpAwardResult,
  formatCooldown,
} from '../../../../util/CoupleHelper';

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

export default class PatCommand extends Command {
  constructor() {
    super('pat', 'Xoa đầu một người dùng nào đó');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người bạn muốn xoa đầu')
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
          StatusContainer.failed(failedEmoji, 'Bạn không thể xoa đầu bot!'),
        ],
      });
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

    let patCount = 0;
    let coupleExpResult: ExpAwardResult | null = null;
    if (targetUser.id !== interaction.user.id) {
      const [patRecord] = await PatCount.findOrCreate({
        where: {userId: targetUser.id, guildId: interaction.guild!.id},
        defaults: {
          userId: targetUser.id,
          guildId: interaction.guild!.id,
          patCount: 0,
        },
      });
      await patRecord.increment('patCount');
      patCount = patRecord.patCount + 1;

      coupleExpResult = await tryAwardCoupleExp(
        interaction.user.id,
        targetUser.id,
        interaction.guild!.id,
        'pat',
      );
    }

    let patBackCustomId: string | null =
      shouldHideName || targetUser.id === interaction.user.id
        ? null
        : `patBack_${interaction.id}`;

    const patContainer = this.patContainer(
      userIds,
      gifUrl,
      patBackCustomId,
      false,
      false,
      shouldHideName,
      patCount,
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
      components: [patContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (patBackCustomId) {
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
              shouldHideName,
              patCount,
              null,
            );
            await sentMessage.edit({components: [timedOutContainer]});
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.update({components: [loadingContainer]});

            const [backRecord] = await PatCount.findOrCreate({
              where: {userId: userIds.user1, guildId: interaction.guild!.id},
              defaults: {
                userId: userIds.user1,
                guildId: interaction.guild!.id,
                patCount: 0,
              },
            });
            await backRecord.increment('patCount');
            patCount = backRecord.patCount + 1;
            patBackCustomId = null;

            await tryAwardCoupleExp(
              targetUser.id,
              interaction.user.id,
              interaction.guild!.id,
              'pat',
            );

            const patBackContainer = this.patContainer(
              userIds,
              gifUrl,
              null,
              true,
              true,
              shouldHideName,
              patCount,
              null,
            );
            await btnInteraction.editReply({components: [patBackContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [targetUser.id],
        },
      ]);
    }

    return;
  }

  patContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    patBackCustomId: string | null,
    isPatBack: boolean,
    disabledPatBackButton: boolean,
    shouldHideName: boolean,
    patCount: number,
    coupleExp: ExpAwardResult | null,
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
    } else if (shouldHideName) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## Ai đó đã xoa đầu ${userMention(userIds.user2)}!`,
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
            `⏳ Cooldown xoa đầu: còn ${formatCooldown(coupleExp.cooldownRemainingMs!)} nữa`,
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
