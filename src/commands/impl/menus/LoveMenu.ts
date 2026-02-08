import {
  ApplicationCommandType,
  ContainerBuilder,
  MessageFlags,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import {ContextMenuCommand} from '../../ContextMenuCommand';
import {StatusContainer} from '../../../util/StatusContainer';
import {ExtendedClient} from '../../../classes/ExtendedClient';
import {sleep} from '../../../util/Sleep';
import LoveLog from '../../../database/models/LoveLog.model';

export default class LoveMenu extends ContextMenuCommand {
  constructor() {
    super('💕 Love Calculator', ApplicationCommandType.User);

    this.advancedOptions.cooldown = 10000;
  }

  async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const user1 = interaction.targetUser;
    const user2 = interaction.user;

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
      return '▓'.repeat(filled) + '░'.repeat(empty);
    };

    const lovePercentage = Math.floor(Math.random() * 101);

    await LoveLog.create({
      user1Id: user1.id,
      user2Id: user2.id,
      percentage: lovePercentage,
      guildId: interaction.guildId ?? 'DM',
    });

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

    const resultContainer = new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${loveEmoji} Love Calculator ${loveEmoji}`),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${user1} 💘 ${user2}\n\n` +
            `**[${createProgressBar(lovePercentage)}]**\n\n` +
            `## 💝 ${lovePercentage}% 💝\n\n` +
            `*${loveMessage}*`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent('💕 Love is in the air~'),
      );

    await message.edit({
      components: [resultContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
