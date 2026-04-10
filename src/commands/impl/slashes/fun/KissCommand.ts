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
import KissCount from '../../../../database/models/KissCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

const KISS_QUOTES = [
  'Một nụ hôn nói lên nghìn điều mà lời nói không thể diễn đạt.',
  'Hôn là ngôn ngữ của trái tim.',
  'Mỗi nụ hôn là một lời hứa không cần lời.',
  'Yêu là khi nụ hôn của họ khiến tim bạn tan chảy.',
  'Không có khoảng cách nào xa khi trái tim ở gần.',
];

const SELF_KISS_QUOTES = [
  'Yêu bản thân là bước đầu tiên của một cuộc tình vĩnh cửu.',
  'Đôi khi bạn chỉ cần tự hôn mình thôi!',
  'Người duy nhất luôn ở bên bạn... chính là bạn.',
  'Tự yêu mình không phải ích kỷ, đó là cần thiết.',
  'Hôn gió cũng tốt chứ sao!',
];

const KISS_BACK_QUOTES = [
  'Tình yêu là con đường hai chiều!',
  'Hôn qua, hôn lại, trái tim rộn ràng.',
  'Khi hai trái tim đồng điệu...',
  'Không ai muốn chịu thiệt cả!',
  'Đáp lại một nụ hôn bằng một nụ hôn!',
];

function randomQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default class KissCommand extends Command {
  constructor() {
    super('kiss', 'Hôn một người dùng nào đó');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người bạn muốn hôn')
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
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Bạn không thể hôn bot!',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

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
      const failEmoji = await client.api.emojiAPI.getEmojiByName('failed');
      await interaction.editReply({
        components: [
          StatusContainer.failed(failEmoji, 'yeah it throw an error'),
        ],
      });
      return;
    }

    const userIds = {
      user1: interaction.user.id,
      user2: targetUser.id,
    };

    let kissCount = 0;
    if (targetUser.id !== interaction.user.id) {
      const [kissRecord] = await KissCount.findOrCreate({
        where: {userId: targetUser.id, guildId: interaction.guild!.id},
        defaults: {
          userId: targetUser.id,
          guildId: interaction.guild!.id,
          kissCount: 0,
        },
      });
      await kissRecord.increment('kissCount');
      kissCount = kissRecord.kissCount + 1;
    }

    let kissBackCustomId: string | null =
      shouldHideName || targetUser.id === interaction.user.id
        ? null
        : `kissBack_${interaction.id}`;

    const kissContainer = this.kissContainer(
      userIds,
      gifUrl,
      kissBackCustomId,
      false,
      false,
      shouldHideName,
      kissCount,
    );

    const successContainer = StatusContainer.success(
      successEmoji,
      'Gửi thành công!',
    );

    await interaction.editReply({
      components: [successContainer],
    });

    const sentMessage = await (interaction.channel as TextChannel).send({
      components: [kissContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (kissBackCustomId) {
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
              shouldHideName,
              kissCount,
            );
            await sentMessage.edit({components: [timedOutContainer]});
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.update({components: [loadingContainer]});

            const [backRecord] = await KissCount.findOrCreate({
              where: {userId: userIds.user1, guildId: interaction.guild!.id},
              defaults: {
                userId: userIds.user1,
                guildId: interaction.guild!.id,
                kissCount: 0,
              },
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
              shouldHideName,
              kissCount,
            );
            await btnInteraction.editReply({components: [kissBackContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [targetUser.id],
        },
      ]);
    }

    return;
  }

  kissContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    kissBackCustomId: string | null,
    isKissBack: boolean,
    disabledKissBackButton: boolean,
    shouldHideName: boolean,
    kissCount: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(
      EmbedColors.random(),
    );

    const isSelfKiss = userIds.user1 === userIds.user2;

    if (isKissBack) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user2)} đã hôn lại ${userMention(userIds.user1)}!`,
        ),
      );
    } else if (shouldHideName) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## Ai đó đã hôn ${userMention(userIds.user2)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} vừa hôn ${userMention(userIds.user2)}`,
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
              `${userMention(kissedUserId)} đã được hôn ${kissCount} lần!`,
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
              textDisplay.setContent(subtext('Đã hết thời gian chờ')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(kissBackCustomId!)
                .setLabel('Hôn lại')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Bấm vào đây để hôn lại họ')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(kissBackCustomId!)
                .setLabel('Hôn lại')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
