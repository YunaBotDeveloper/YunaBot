import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
} from 'discord.js';
import {Command} from '../../../Command';
import {sleep} from '../../../../util/Sleep';
import {StatusContainer} from '../../../../util/StatusContainer';
import {ExtendedClient} from '../../../../classes/ExtendedClient';
import GayLog from '../../../../database/models/GayLog.model';

export default class GayCommand extends Command {
  constructor() {
    super('gay', '🏳️‍🌈 Đo chỉ số gay của ai đó!');

    this.advancedOptions.cooldown = 10000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người bạn muốn kiểm tra (mặc định là bạn)'),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const user = interaction.options.getUser('user') ?? interaction.user;

    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const loadingContainer = await StatusContainer.loading(loadingEmoji);

    const message = await interaction.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true,
    });

    await sleep(2000);

    const createProgressBar = (
      progress: number,
      total: number = 20,
    ): string => {
      const filled = Math.round((progress / 100) * total);
      const empty = total - filled;
      return '🟩'.repeat(filled) + '⬜'.repeat(empty);
    };

    const gayPercentage = Math.floor(Math.random() * 101);

    await GayLog.create({
      userId: user.id,
      percentage: gayPercentage,
      guildId: interaction.guildId ?? 'DM',
    });

    let emoji: string;
    let gayMessage: string;
    let color: number;

    if (gayPercentage >= 90) {
      emoji = '🏳️‍🌈🏳️‍🌈🏳️‍🌈';
      gayMessage = 'Gay chúa đây rồi! Slay queen! 💅✨';
      color = 0xff0000;
    } else if (gayPercentage >= 70) {
      emoji = '🏳️‍🌈🏳️‍🌈';
      gayMessage = 'Khá gay đấy! Cầu vồng đang chờ bạn! 🌈';
      color = 0xff8c00;
    } else if (gayPercentage >= 50) {
      emoji = '🏳️‍🌈';
      gayMessage = 'Nửa gay nửa straight, linh hoạt vãi! 😏';
      color = 0xffff00;
    } else if (gayPercentage >= 30) {
      emoji = '🤔';
      gayMessage = 'Có vẻ hơi sú sú... ai mà biết được! 👀';
      color = 0x00ff00;
    } else if (gayPercentage >= 10) {
      emoji = '😐';
      gayMessage = 'Gần như straight... gần như thôi! 😅';
      color = 0x0000ff;
    } else {
      emoji = '💪';
      gayMessage = 'Straight 100%! Hoặc là giấu giỏi lắm! 🤣';
      color = 0x800080;
    }

    const resultContainer = new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${emoji} Gay Meter ${emoji}`),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${user}\n\n` +
            `**[${createProgressBar(gayPercentage)}]**\n\n` +
            `## 🏳️‍🌈 ${gayPercentage}% 🏳️‍🌈\n\n` +
            `*${gayMessage}*`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent('🌈 Happy Pride~'),
      );

    await message.edit({
      components: [resultContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
