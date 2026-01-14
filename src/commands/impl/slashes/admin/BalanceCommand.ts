import {Command} from '../../../Command';
import {ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import Balance from '../../../../database/models/Balance.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import {numberFormat} from '../../../../util/NumberFormat';

export default class BalanceCommand extends Command {
  constructor() {
    super('balance', 'Kiểm tra số dư của bạn hoặc người khác');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người dùng cần kiểm tra số dư (mặc định là bạn)')
        .setRequired(false),
    );
  }

  private numberFormat(num: number): string {
    return num.toLocaleString('en-US');
  }

  private getCreditScoreRating(creditScore: number): string {
    if (creditScore >= 750) return '⭐ Xuất sắc';
    if (creditScore >= 650) return '🟢 Tốt';
    if (creditScore >= 550) return '🟡 Trung bình';
    if (creditScore >= 450) return '🟠 Kém';
    return '🔴 Rất kém';
  }

  async run(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;

    const [balance, created] = await Balance.findOrCreate({
      where: {userId},
      defaults: {userId, balance: 1000},
    });

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.green())
      .setTitle('💰 Số dư tài khoản')
      .setDescription(
        created
          ? `Tạo tài khoản mới cho ${targetUser}!`
          : `Số dư của ${targetUser}`,
      )
      .addFields(
        {
          name: '💵 Số dư hiện tại',
          value: `\`${numberFormat(balance.balance)}\``,
          inline: true,
        },
        {
          name: '💳 Điểm tín dụng',
          value: `\`${balance.creditScore || 500}\` ${this.getCreditScoreRating(balance.creditScore || 500)}`,
          inline: true,
        },
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({
        text: `Yêu cầu bởi ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({embeds: [embed]});
  }
}
