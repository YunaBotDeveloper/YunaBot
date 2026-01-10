import {ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import {Command} from '../../../Command';
import Balance from '../../../../database/models/Balance.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import {Sequelize} from 'sequelize';

interface LoanData {
  userId: string;
  amount: number;
  interestRate: number;
  dueDate: number;
  takenAt: number;
}

export default class LoanCommand extends Command {
  private activeLoans: Map<string, LoanData> = new Map();
  private readonly maxLoanAmount = 10000;
  private readonly minLoanAmount = 100;
  private readonly interestRate = 0.1; // 10% interest
  private readonly loanDuration = 86400000; // 24 hours in milliseconds

  constructor() {
    super('loan', 'Vay tiền từ ngân hàng');

    this.advancedOptions.cooldown = 5000;

    this.data
      .addSubcommand(subcommand =>
        subcommand
          .setName('borrow')
          .setDescription('Vay tiền từ ngân hàng')
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('Số tiền muốn vay (100-10,000)')
              .setRequired(true)
              .setMinValue(100)
              .setMaxValue(10000),
          ),
      )
      .addSubcommand(subcommand =>
        subcommand.setName('repay').setDescription('Trả nợ ngân hàng'),
      )
      .addSubcommand(subcommand =>
        subcommand.setName('info').setDescription('Xem thông tin khoản vay'),
      );
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'borrow':
        await this.handleBorrow(interaction);
        break;
      case 'repay':
        await this.handleRepay(interaction);
        break;
      case 'info':
        await this.handleInfo(interaction);
        break;
    }
  }

  private async handleBorrow(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const amount = interaction.options.getNumber('amount', true);

    // Check if user already has a loan
    if (this.activeLoans.has(userId)) {
      const loan = this.activeLoans.get(userId)!;
      const totalOwed = Math.floor(loan.amount * (1 + loan.interestRate));

      const embed = new EmbedBuilder()
        .setColor(EmbedColors.red())
        .setTitle('❌ Không thể vay thêm')
        .setDescription(
          'Bạn đã có một khoản vay chưa trả! Vui lòng trả nợ trước khi vay thêm.',
        )
        .addFields(
          {
            name: '💰 Số tiền vay',
            value: `\`${this.formatNumber(loan.amount)}\``,
            inline: true,
          },
          {
            name: '📊 Lãi suất',
            value: `\`${loan.interestRate * 100}%\``,
            inline: true,
          },
          {
            name: '💸 Tổng phải trả',
            value: `\`${this.formatNumber(totalOwed)}\``,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.reply({embeds: [embed], ephemeral: true});
      return;
    }

    // Validate amount
    if (amount < this.minLoanAmount || amount > this.maxLoanAmount) {
      await interaction.reply({
        content: `❌ Số tiền vay phải từ **${this.formatNumber(this.minLoanAmount)}** đến **${this.formatNumber(this.maxLoanAmount)}**!`,
        ephemeral: true,
      });
      return;
    }

    // Create loan
    const now = Date.now();
    const dueDate = now + this.loanDuration;
    const totalOwed = Math.floor(amount * (1 + this.interestRate));

    this.activeLoans.set(userId, {
      userId,
      amount,
      interestRate: this.interestRate,
      dueDate,
      takenAt: now,
    });

    // Add money to user balance
    const [userBalance] = await Balance.findOrCreate({
      where: {userId},
      defaults: {userId, balance: 1000},
    });

    await userBalance.update({
      balance: userBalance.balance + amount,
    });

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.green())
      .setTitle('✅ Vay tiền thành công!')
      .setDescription('Bạn đã vay tiền từ ngân hàng.')
      .addFields(
        {
          name: '💰 Số tiền vay',
          value: `\`${this.formatNumber(amount)}\``,
          inline: true,
        },
        {
          name: '📊 Lãi suất',
          value: `\`${this.interestRate * 100}%\``,
          inline: true,
        },
        {
          name: '💸 Tổng phải trả',
          value: `\`${this.formatNumber(totalOwed)}\``,
          inline: true,
        },
        {
          name: '💵 Số dư mới',
          value: `\`${this.formatNumber(userBalance.balance)}\``,
          inline: true,
        },
        {
          name: '⏰ Hạn trả',
          value: `<t:${Math.floor(dueDate / 1000)}:R>`,
          inline: true,
        },
      )
      .setFooter({
        text: `Vay bởi ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({embeds: [embed]});
  }

  private async handleRepay(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    // Check if user has a loan
    if (!this.activeLoans.has(userId)) {
      await interaction.reply({
        content: '❌ Bạn không có khoản vay nào!',
        ephemeral: true,
      });
      return;
    }

    const loan = this.activeLoans.get(userId)!;
    const now = Date.now();
    const isOverdue = now > loan.dueDate;

    // Calculate amount to repay
    let totalOwed = Math.floor(loan.amount * (1 + loan.interestRate));

    // Add penalty if overdue (additional 5% per day overdue)
    if (isOverdue) {
      const daysOverdue = Math.ceil((now - loan.dueDate) / 86400000);
      const penalty = Math.floor(loan.amount * 0.05 * daysOverdue);
      totalOwed += penalty;
    }

    // Check if user has enough balance
    const userBalance = await Balance.findOne({
      where: {userId},
    });

    if (!userBalance || userBalance.balance < totalOwed) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColors.red())
        .setTitle('❌ Số dư không đủ!')
        .setDescription('Bạn không có đủ tiền để trả nợ.')
        .addFields(
          {
            name: '💸 Tổng phải trả',
            value: `\`${this.formatNumber(totalOwed)}\``,
            inline: true,
          },
          {
            name: '💵 Số dư hiện tại',
            value: `\`${this.formatNumber(userBalance?.balance || 0)}\``,
            inline: true,
          },
          {
            name: '❌ Thiếu',
            value: `\`${this.formatNumber(totalOwed - (userBalance?.balance || 0))}\``,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.reply({embeds: [embed], ephemeral: true});
      return;
    }

    // Deduct from balance and remove loan
    await userBalance.update({
      balance: userBalance.balance - totalOwed,
    });

    this.activeLoans.delete(userId);

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.green())
      .setTitle('✅ Trả nợ thành công!')
      .setDescription(
        isOverdue
          ? '⚠️ Bạn đã trả nợ muộn và bị phạt thêm!'
          : 'Bạn đã trả hết nợ ngân hàng.',
      )
      .addFields(
        {
          name: '💰 Số tiền vay gốc',
          value: `\`${this.formatNumber(loan.amount)}\``,
          inline: true,
        },
        {
          name: '💸 Đã trả',
          value: `\`${this.formatNumber(totalOwed)}\``,
          inline: true,
        },
        {
          name: '💵 Số dư còn lại',
          value: `\`${this.formatNumber(userBalance.balance)}\``,
          inline: true,
        },
      )
      .setFooter({
        text: `Trả nợ bởi ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({embeds: [embed]});
  }

  private async handleInfo(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    // Check if user has a loan
    if (!this.activeLoans.has(userId)) {
      await interaction.reply({
        content: '✅ Bạn không có khoản vay nào!',
        ephemeral: true,
      });
      return;
    }

    const loan = this.activeLoans.get(userId)!;
    const now = Date.now();
    const isOverdue = now > loan.dueDate;

    // Calculate amount to repay
    let totalOwed = Math.floor(loan.amount * (1 + loan.interestRate));
    let penalty = 0;

    // Add penalty if overdue
    if (isOverdue) {
      const daysOverdue = Math.ceil((now - loan.dueDate) / 86400000);
      penalty = Math.floor(loan.amount * 0.05 * daysOverdue);
      totalOwed += penalty;
    }

    const embed = new EmbedBuilder()
      .setColor(isOverdue ? EmbedColors.red() : EmbedColors.yellow())
      .setTitle(isOverdue ? '⚠️ Khoản vay quá hạn!' : '📋 Thông tin khoản vay')
      .setDescription(
        isOverdue
          ? 'Bạn đã quá hạn trả nợ! Phí phạt đang tăng mỗi ngày.'
          : 'Thông tin chi tiết về khoản vay của bạn.',
      )
      .addFields(
        {
          name: '💰 Số tiền vay gốc',
          value: `\`${this.formatNumber(loan.amount)}\``,
          inline: true,
        },
        {
          name: '📊 Lãi suất',
          value: `\`${loan.interestRate * 100}%\``,
          inline: true,
        },
        {
          name: '💸 Tổng phải trả',
          value: `\`${this.formatNumber(totalOwed)}\``,
          inline: true,
        },
        {
          name: '⏰ Hạn trả',
          value: `<t:${Math.floor(loan.dueDate / 1000)}:R>`,
          inline: true,
        },
        {
          name: '📅 Ngày vay',
          value: `<t:${Math.floor(loan.takenAt / 1000)}:R>`,
          inline: true,
        },
      )
      .setFooter({
        text: `Xem bởi ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (penalty > 0) {
      embed.addFields({
        name: '🚨 Phí phạt quá hạn',
        value: `\`${this.formatNumber(penalty)}\` (5% mỗi ngày)`,
        inline: false,
      });
    }

    await interaction.reply({embeds: [embed], ephemeral: true});
  }
}
