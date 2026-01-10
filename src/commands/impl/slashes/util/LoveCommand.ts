import {ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import {Command} from '../../../Command';
import {sleep} from '../../../../util/Sleep';

export default class LoveCommand extends Command {
  constructor() {
    super('love', '💕 Tính toán tình yêu giữa hai người!');

    this.advancedOptions.cooldown = 10000;

    this.data.addUserOption(option =>
      option
        .setName('user1')
        .setDescription('Người thứ nhất')
        .setRequired(true),
    );
    this.data.addUserOption(option =>
      option.setName('user2').setDescription('Người thứ hai (mặc định là bạn)'),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const user1 = interaction.options.getUser('user1', true);
    const user2 = interaction.options.getUser('user2') ?? interaction.user;

    const loadingFrames = [
      '💗',
      '💖',
      '💝',
      '💘',
      '💕',
      '💓',
      '💞',
      '💟',
      '❤️',
      '🧡',
    ];

    const createProgressBar = (
      progress: number,
      total: number = 20,
    ): string => {
      const filled = Math.round((progress / 100) * total);
      const empty = total - filled;
      return '▓'.repeat(filled) + '░'.repeat(empty);
    };

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle('💕 Love Calculator')
      .setDescription(
        `Đang tính toán tình yêu giữa ${user1} và ${user2}...\n\n` +
          `${loadingFrames[0]} [${createProgressBar(0)}] 0%`,
      );

    const message = await interaction.reply({
      embeds: [loadingEmbed],
      fetchReply: true,
    });

    const totalSteps = 10;
    const stepDelay = 500;

    for (let i = 1; i <= totalSteps; i++) {
      await sleep(stepDelay);

      const progress = i * 10;
      const frameIndex = i % loadingFrames.length;

      loadingEmbed.setDescription(
        `Đang tính toán tình yêu giữa ${user1} và ${user2}...\n\n` +
          `${loadingFrames[frameIndex]} [${createProgressBar(progress)}] ${progress}%`,
      );

      await message.edit({embeds: [loadingEmbed]});
    }

    const lovePercentage = Math.floor(Math.random() * 101);

    let loveEmoji: string;
    let loveMessage: string;
    let color: number;

    if (lovePercentage >= 90) {
      loveEmoji = '💖💖💖';
      loveMessage = 'Tình yêu hoàn hảo! Hai bạn sinh ra là dành cho nhau! 🥰';
      color = 0xff1493;
    } else if (lovePercentage >= 70) {
      loveEmoji = '💕💕';
      loveMessage = 'Tình yêu nồng cháy! Đừng bao giờ buông tay nhé! 😍';
      color = 0xff69b4;
    } else if (lovePercentage >= 50) {
      loveEmoji = '💗';
      loveMessage = 'Có tiềm năng phát triển! Hãy cố gắng thêm nào! 🤗';
      color = 0xffb6c1;
    } else if (lovePercentage >= 30) {
      loveEmoji = '💛';
      loveMessage = 'Bạn bè thân thiết! Có thể phát triển thêm... 🙂';
      color = 0xffd700;
    } else if (lovePercentage >= 10) {
      loveEmoji = '💔';
      loveMessage = 'Hmm... cần thêm thời gian để hiểu nhau! 😅';
      color = 0x808080;
    } else {
      loveEmoji = '🖤';
      loveMessage = 'Có vẻ không hợp lắm... nhưng ai mà biết được! 😬';
      color = 0x2f3136;
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${loveEmoji} Love Calculator ${loveEmoji}`)
      .setDescription(
        `${user1} 💘 ${user2}\n\n` +
          `**[${createProgressBar(lovePercentage)}]**\n\n` +
          `## 💝 ${lovePercentage}% 💝\n\n` +
          `*${loveMessage}*`,
      )
      .setFooter({text: '💕 Love is in the air~'})
      .setTimestamp();

    await message.edit({embeds: [resultEmbed]});
  }
}
