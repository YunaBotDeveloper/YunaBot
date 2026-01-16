import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  ButtonInteraction,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import Balance from '../../../../database/models/Balance.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import {numberFormat} from '../../../../util/NumberFormat';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import ExtendedClient from '../../../../classes/ExtendedClient';

export default class LeaderboardCommand extends Command {
  private readonly USERS_PER_PAGE = 10;
  private readonly TIMEOUT_MS = 60000; // 1 minute

  constructor() {
    super('leaderboard', 'Xem bảng xếp hạng số dư');

    this.advancedOptions.cooldown = 10000; // 10 seconds
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const trophyEmoji = await client.api.emojiAPI.getEmojiByName('trophy');
    const coinEmoji = await client.api.emojiAPI.getEmojiByName('coin');

    // Fetch all balances sorted by balance descending
    const allBalances = await Balance.findAll({
      order: [['balance', 'DESC']],
    });

    if (allBalances.length === 0) {
      const emptyContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.yellow())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent('## 📊 Bảng Xếp Hạng'),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent('Chưa có người dùng nào trong bảng xếp hạng.'),
        );

      await interaction.reply({
        components: [emptyContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const totalPages = Math.ceil(allBalances.length / this.USERS_PER_PAGE);
    let currentPage = 1;

    const showPage = async (
      page: number,
      targetInteraction: ChatInputCommandInteraction | ButtonInteraction,
      isUpdate: boolean = false,
    ) => {
      const startIdx = (page - 1) * this.USERS_PER_PAGE;
      const endIdx = Math.min(
        startIdx + this.USERS_PER_PAGE,
        allBalances.length,
      );
      const pageBalances = allBalances.slice(startIdx, endIdx);

      // Build leaderboard content
      let leaderboardContent = '';
      for (let i = 0; i < pageBalances.length; i++) {
        const balance = pageBalances[i];
        const rank = startIdx + i + 1;
        const rankEmoji = this.getRankEmoji(rank);
        const creditScore = balance.creditScore || 500;

        leaderboardContent += `${rankEmoji} **#${rank}** ${userMention(balance.userId)}\n`;
        leaderboardContent += `   ${coinEmoji} Số dư: **${numberFormat(balance.balance)}** | 📊 Tín dụng: **${creditScore}**\n\n`;
      }

      const container = new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`## ${trophyEmoji} Bảng Xếp Hạng Số Dư`),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(leaderboardContent.trim()),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `📄 Trang **${page}** / **${totalPages}** | 👥 Tổng: **${allBalances.length}** người dùng`,
          ),
        );

      // Add pagination buttons if needed
      if (totalPages > 1) {
        const prevButton = new ButtonBuilder()
          .setCustomId('leaderboard-prev')
          .setLabel('Trước')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('◀️')
          .setDisabled(page === 1);

        const nextButton = new ButtonBuilder()
          .setCustomId('leaderboard-next')
          .setLabel('Tiếp')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('▶️')
          .setDisabled(page === totalPages);

        container.addActionRowComponents(row =>
          row.addComponents(prevButton, nextButton),
        );
      }

      if (isUpdate && targetInteraction instanceof ButtonInteraction) {
        await targetInteraction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await targetInteraction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    };

    // Show first page
    await showPage(currentPage, interaction);

    // Register pagination handlers if there are multiple pages
    if (totalPages > 1) {
      ComponentManager.getComponentManager().register([
        {
          customId: 'leaderboard-prev',
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
          timeout: this.TIMEOUT_MS,
          onTimeout: async () => {
            try {
              const disabledPrevButton = new ButtonBuilder()
                .setCustomId('leaderboard-prev')
                .setLabel('Trước')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setDisabled(true);

              const disabledNextButton = new ButtonBuilder()
                .setCustomId('leaderboard-next')
                .setLabel('Tiếp')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
                .setDisabled(true);

              const timeoutContainer = new ContainerBuilder()
                .setAccentColor(EmbedColors.red())
                .addTextDisplayComponents(textDisplay =>
                  textDisplay.setContent('## ⏰ Hết thời gian'),
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(textDisplay =>
                  textDisplay.setContent(
                    'Phiên xem bảng xếp hạng đã hết hạn. Vui lòng chạy lệnh lại.',
                  ),
                )
                .addActionRowComponents(row =>
                  row.addComponents(disabledPrevButton, disabledNextButton),
                );

              await interaction.editReply({
                components: [timeoutContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } catch {
              // Message may have been deleted
            }
          },
          handler: async (buttonInteraction: ButtonInteraction) => {
            if (currentPage > 1) {
              currentPage--;
              await showPage(currentPage, buttonInteraction, true);
            }
          },
        },
        {
          customId: 'leaderboard-next',
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
          timeout: this.TIMEOUT_MS,
          onTimeout: async () => {
            // Handled by prev button timeout
          },
          handler: async (buttonInteraction: ButtonInteraction) => {
            if (currentPage < totalPages) {
              currentPage++;
              await showPage(currentPage, buttonInteraction, true);
            }
          },
        },
      ]);
    }
  }

  private getRankEmoji(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  }
}
