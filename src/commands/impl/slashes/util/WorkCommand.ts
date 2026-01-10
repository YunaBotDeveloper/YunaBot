import {ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import {Command} from '../../../Command';
import Balance from '../../../../database/models/Balance.model';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class WorkCommand extends Command {
  private readonly jobs = [
    {name: 'Lập trình viên', min: 500, max: 2000, emoji: '💻'},
    {name: 'Bác sĩ', min: 800, max: 2500, emoji: '⚕️'},
    {name: 'Giáo viên', min: 400, max: 1500, emoji: '👨‍🏫'},
    {name: 'Đầu bếp', min: 300, max: 1200, emoji: '👨‍🍳'},
    {name: 'Tài xế', min: 200, max: 1000, emoji: '🚗'},
    {name: 'Nhân viên văn phòng', min: 350, max: 1300, emoji: '💼'},
    {name: 'Streamer', min: 100, max: 3000, emoji: '🎮'},
    {name: 'Nhạc sĩ', min: 250, max: 1800, emoji: '🎵'},
    {name: 'Họa sĩ', min: 200, max: 1600, emoji: '🎨'},
    {name: 'Nhà văn', min: 300, max: 1700, emoji: '✍️'},
  ];

  private readonly cooldownTime = 3600000; // 1 hour in milliseconds
  private lastWorkTime: Map<string, number> = new Map();

  constructor() {
    super('work', 'Làm việc để kiếm tiền');

    this.advancedOptions.cooldown = 5000;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  private getRandomJob() {
    return this.jobs[Math.floor(Math.random() * this.jobs.length)];
  }

  private getRandomAmount(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.user.id;
    const now = Date.now();
    const lastWork = this.lastWorkTime.get(userId) || 0;
    const timeLeft = this.cooldownTime - (now - lastWork);

    // Check cooldown
    if (timeLeft > 0) {
      const minutes = Math.ceil(timeLeft / 60000);
      const embed = new EmbedBuilder()
        .setColor(EmbedColors.red())
        .setTitle('⏰ Bạn đã mệt rồi!')
        .setDescription(
          `Bạn cần nghỉ ngơi thêm **${minutes} phút** nữa trước khi có thể làm việc tiếp.`,
        )
        .setFooter({text: 'Hãy quay lại sau nhé!'})
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
      return;
    }

    // Get random job
    const job = this.getRandomJob();

    // Update cooldown regardless of success/failure
    this.lastWorkTime.set(userId, now);

    // 20% chance of failure
    const failureChance = 0.2;
    const failed = Math.random() < failureChance;

    if (failed) {
      // Calculate failure fee (10-30% of potential earnings)
      const potentialEarnings = this.getRandomAmount(job.min, job.max);
      const feePercentage = 0.1 + Math.random() * 0.2; // 10-30%
      const failureFee = Math.floor(potentialEarnings * feePercentage);

      // Deduct fee from balance
      const [userBalance] = await Balance.findOrCreate({
        where: {userId},
        defaults: {userId, balance: 1000},
      });

      const newBalance = Math.max(0, userBalance.balance - failureFee);
      await userBalance.update({balance: newBalance});

      const failureMessages = [
        'Bạn đã làm hỏng công việc và bị sa thải!',
        'Bạn ngủ quên và không đến làm việc!',
        'Sếp không hài lòng và không trả lương!',
        'Bạn đã làm việc kém và bị phạt!',
        'Công ty phá sản, bạn không nhận được lương!',
        'Bạn bị tai nạn trên đường đi làm!',
        'Máy tính bị hỏng, công việc không hoàn thành!',
        'Bạn bị ốm và phải nghỉ làm!',
      ];

      const randomFailure =
        failureMessages[Math.floor(Math.random() * failureMessages.length)];

      const embed = new EmbedBuilder()
        .setColor(EmbedColors.red())
        .setTitle(`${job.emoji} ${job.name}`)
        .setDescription(`**❌ ${randomFailure}**`)
        .addFields(
          {
            name: '💰 Thu nhập',
            value: '`0`',
            inline: true,
          },
          {
            name: '🚨 Phí thất bại',
            value: `\`-${this.formatNumber(failureFee)}\``,
            inline: true,
          },
          {
            name: '💵 Số dư mới',
            value: `\`${this.formatNumber(newBalance)}\``,
            inline: true,
          },
          {
            name: '😢 Kết quả',
            value: '`Thất bại`',
            inline: true,
          },
          {
            name: '⏰ Cooldown',
            value: '`1 giờ`',
            inline: true,
          },
        )
        .setFooter({
          text: `Thử lại sau 1 giờ | ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({embeds: [embed]});
      return;
    }

    // Success - Get earnings
    const earnings = this.getRandomAmount(job.min, job.max);

    // Apply 5% tax
    const tax = Math.floor(earnings * 0.05);
    const netEarnings = earnings - tax;

    // Update balance
    const [userBalance] = await Balance.findOrCreate({
      where: {userId},
      defaults: {userId, balance: 1000},
    });

    const oldBalance = userBalance.balance;
    const newBalance = oldBalance + netEarnings;

    await userBalance.update({balance: newBalance});

    // Success messages
    const workMessages = [
      'Bạn đã hoàn thành công việc xuất sắc!',
      'Một ngày làm việc hiệu quả!',
      'Sếp rất hài lòng về công việc của bạn!',
      'Bạn đã làm việc chăm chỉ!',
      'Công việc hoàn thành tốt đẹp!',
    ];

    const randomMessage =
      workMessages[Math.floor(Math.random() * workMessages.length)];

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.green())
      .setTitle(`${job.emoji} ${job.name}`)
      .setDescription(`**${randomMessage}**`)
      .addFields(
        {
          name: '💰 Thu nhập',
          value: `\`${this.formatNumber(earnings)}\``,
          inline: true,
        },
        {
          name: '📊 Thuế (5%)',
          value: `\`-${this.formatNumber(tax)}\``,
          inline: true,
        },
        {
          name: '✅ Thực nhận',
          value: `\`${this.formatNumber(netEarnings)}\``,
          inline: true,
        },
        {
          name: '💵 Số dư cũ',
          value: `\`${this.formatNumber(oldBalance)}\``,
          inline: true,
        },
        {
          name: '💵 Số dư mới',
          value: `\`${this.formatNumber(newBalance)}\``,
          inline: true,
        },
        {
          name: '⏰ Cooldown',
          value: '`1 giờ`',
          inline: true,
        },
      )
      .setFooter({
        text: `Làm việc bởi ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({embeds: [embed]});
  }
}
