import {Command} from '../../../Command';
import Config from '../../../../config/Config';
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  LabelBuilder,
  Message,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  subtext,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  time,
  userMention,
} from 'discord.js';
import {nanoid} from 'nanoid';
import * as crypto from 'crypto';
import SicboSession from '../../../../database/models/SicboSession.model';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {EmbedColors} from '../../../../util/EmbedColors';
import SicboHistory from '../../../../database/models/SicboHistory.model';
import Balance from '../../../../database/models/Balance.model';
import ExtendedClient from '../../../../classes/ExtendedClient';

type BetType = 'tai' | 'xiu';

interface PlayerBet {
  orderId: string;
  ordererTag: string;
  ordererMention: string;
  ordererAvatar: string;
  betType: BetType;
  betLabel: string;
  betAmount: number;
  multiplier: number;
}

interface GameSession {
  sessionId: string;
  players: Map<string, PlayerBet>;
  messageId: string;
  channelId: string;
  startTime: number;
  duration: number;
  isRunning: boolean;
  seed: string;
  hash: string;
}

interface GameResult {
  result: BetType;
  dice: [number, number, number];
  total: number;
  timestamp: number;
}

const config = Config.getInstance();
const sicboConfig = config.sicbo;

export default class SicboNewCommand extends Command {
  private readonly diceEmojis = sicboConfig.diceEmojis;
  private readonly rollingFrame = sicboConfig.rollingFrame;
  private readonly waitTime = sicboConfig.waitTime;
  private readonly updateInterval = sicboConfig.updateInterval;
  private readonly maxHistory = sicboConfig.maxHistory;

  constructor() {
    super('sicbo', 'Tài Xỉu');

    this.advancedOptions.cooldown = 60000;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const client = interaction.client as ExtendedClient;
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');

    const guild = interaction.guild;
    const channel = interaction.channel;
    const user = interaction.user;

    if (!guild || !channel) return;

    const existingSession = await SicboSession.findOne({
      where: {
        guildId: guild.id,
        isRunning: true,
      },
    });

    if (existingSession) {
      const existingSessionContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`## ${failedEmoji} Lỗi`),
        )
        .addSeparatorComponents(seperator => seperator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            '**Đã có một ván Tài Xỉu đang diễn ra trong server này!**',
          ),
        )
        .addSeparatorComponents(seperator => seperator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(subtext(`${Math.round(Date.now() / 1000)}`)),
        );

      await interaction.editReply({
        components: [existingSessionContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const sessionId = nanoid(10);

    const seed = `${nanoid(32)}`;
    const hash = crypto.createHash('md5').update(seed).digest('hex');

    const session: GameSession = {
      sessionId,
      players: new Map(),
      messageId: '',
      channelId: channel.id,
      startTime: 0,
      duration: this.waitTime,
      isRunning: true,
      seed,
      hash,
    };

    const guildId = guild.id;
    await SicboSession.create({
      sessionId,
      guildId,
      channelId: channel.id,
      messageId: '',
      hostId: user.id,
      hostTag: user.tag,
      players: '{}',
      startTime: 0,
      duration: session.duration,
      isRunning: true,
      seed,
      hash,
      dice1: null,
      dice2: null,
      dice3: null,
      result: null,
    });

    const taiButtonId = `sicbo_tai_${sessionId}`;
    const xiuButtonId = `sicbo_xiu_${sessionId}`;

    const LobbyContainer = await this.createLobbyContainer(
      session,
      taiButtonId,
      xiuButtonId,
      guild.id,
      client,
    );

    ComponentManager.getComponentManager().register([
      {
        customId: taiButtonId,
        handler: async (interaction: ButtonInteraction) => {
          if (!session.isRunning) {
            await interaction.reply({
              content: `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
              ephemeral: true,
            });
            return;
          }

          if (session.players.has(interaction.user.id)) {
            const currentBet = session.players.get(interaction.user.id)!;
            await interaction.reply({
              content: `❌ Bạn đã đặt **${currentBet.betLabel}** rồi! Không thể đổi cược!`,
              ephemeral: true,
            });
            return;
          }

          const userId = interaction.user.id;
          const [userBalance] = await Balance.findOrCreate({
            where: {userId},
            defaults: {userId, balance: 1000, creditScore: 500},
          });

          const taiBetInput = new TextInputBuilder()
            .setCustomId('taiBetInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('VD: 100, 200, 1000');

          const taiLabel = new LabelBuilder()
            .setLabel('Nhập số tiền bạn muốn cược.')
            .setDescription(
              `Số tiền hiện tại của bạn: ${this.formatNumber(userBalance.balance)}`,
            )
            .setTextInputComponent(taiBetInput);

          const taiBetModal = new ModalBuilder()
            .setCustomId('taiBetModal')
            .setTitle('Tài: Đặt tiền cược')
            .addLabelComponents(taiLabel);

          await interaction.showModal(taiBetModal);

          ComponentManager.getComponentManager().register([
            {
              customId: 'taiBetModal',
              handler: async (interaction: ModalSubmitInteraction) => {
                if (!session.isRunning) {
                  await interaction.reply({
                    content: `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
                    ephemeral: true,
                  });
                  return;
                }

                const betAmountInput =
                  interaction.fields.getTextInputValue('taiBetInput');

                const betAmount = parseFloat(betAmountInput);

                if (isNaN(betAmount) || betAmount <= 0) {
                  await interaction.reply({
                    content:
                      '❌ Số tiền không hợp lệ! Vui lòng nhập một số dương.',
                    ephemeral: true,
                  });
                  return;
                }

                const userId = interaction.user.id;
                const userBalance = await Balance.findOne({
                  where: {userId},
                });

                if (!userBalance || userBalance.balance < betAmount) {
                  await interaction.reply({
                    content: `❌ Số dư không đủ! Số dư hiện tại: **${this.formatNumber(userBalance?.balance || 0)}**, Số tiền cược: **${this.formatNumber(betAmount)}**`,
                    ephemeral: true,
                  });
                  return;
                }

                await userBalance.update({
                  balance: userBalance.balance - betAmount,
                });

                const playerBet: PlayerBet = {
                  orderId: interaction.user.id,
                  ordererTag: interaction.user.tag,
                  ordererMention: userMention(interaction.user.id),
                  ordererAvatar: interaction.user.displayAvatarURL(),
                  betType: 'tai',
                  betLabel: 'Tài',
                  betAmount: betAmount,
                  multiplier: 2,
                };

                session.players.set(userId, playerBet);

                await SicboSession.update(
                  {
                    players: JSON.stringify(
                      Object.fromEntries(session.players),
                    ),
                  },
                  {where: {sessionId}},
                );

                await interaction.reply({
                  content: `✅ Đặt cược **Tài** thành công!\nSố tiền: **${this.formatNumber(betAmount)}**\nSố dư còn lại: **${this.formatNumber(userBalance.balance)}**`,
                  flags: MessageFlags.Ephemeral,
                });

                await this.updateLobbyContainer(interaction, session);
              },
              type: ComponentEnum.MODAL,
            },
          ]);
        },
        timeout: this.waitTime + 5000,
        onTimeout: async () => {},
        type: ComponentEnum.BUTTON,
        userCheck: ['*'],
      },
      {
        customId: xiuButtonId,
        handler: async (interaction: ButtonInteraction) => {
          if (!session.isRunning) {
            await interaction.reply({
              content: `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
              ephemeral: true,
            });
            return;
          }

          if (session.players.has(interaction.user.id)) {
            const currentBet = session.players.get(interaction.user.id)!;
            await interaction.reply({
              content: `❌ Bạn đã đặt **${currentBet.betLabel}** rồi! Không thể đổi cược!`,
              ephemeral: true,
            });
            return;
          }

          const userId = interaction.user.id;
          const [userBalance] = await Balance.findOrCreate({
            where: {userId},
            defaults: {userId, balance: 1000, creditScore: 500},
          });

          const xiuBetInput = new TextInputBuilder()
            .setCustomId('xiuBetInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('VD: 100, 200, 1000');

          const xiuLabel = new LabelBuilder()
            .setLabel('Nhập số tiền bạn muốn cược.')
            .setDescription(
              `Số tiền hiện tại của bạn: ${this.formatNumber(userBalance.balance)}`,
            )
            .setTextInputComponent(xiuBetInput);

          const xiuBetModal = new ModalBuilder()
            .setCustomId('xiuBetModal')
            .setTitle('Xỉu: Đặt tiền cược')
            .addLabelComponents(xiuLabel);

          await interaction.showModal(xiuBetModal);

          ComponentManager.getComponentManager().register([
            {
              customId: 'xiuBetModal',
              handler: async (interaction: ModalSubmitInteraction) => {
                if (!session.isRunning) {
                  await interaction.reply({
                    content: `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
                    ephemeral: true,
                  });
                  return;
                }

                const betAmountInput =
                  interaction.fields.getTextInputValue('xiuBetInput');

                const betAmount = parseFloat(betAmountInput);

                if (isNaN(betAmount) || betAmount <= 0) {
                  await interaction.reply({
                    content:
                      '❌ Số tiền không hợp lệ! Vui lòng nhập một số dương.',
                    ephemeral: true,
                  });
                  return;
                }

                const userId = interaction.user.id;
                const userBalance = await Balance.findOne({
                  where: {userId},
                });

                if (!userBalance || userBalance.balance < betAmount) {
                  await interaction.reply({
                    content: `❌ Số dư không đủ! Số dư hiện tại: **${this.formatNumber(userBalance?.balance || 0)}**, Số tiền cược: **${this.formatNumber(betAmount)}**`,
                    ephemeral: true,
                  });
                  return;
                }

                await userBalance.update({
                  balance: userBalance.balance - betAmount,
                });

                const playerBet: PlayerBet = {
                  orderId: interaction.user.id,
                  ordererTag: interaction.user.tag,
                  ordererMention: userMention(interaction.user.id),
                  ordererAvatar: interaction.user.displayAvatarURL(),
                  betType: 'xiu',
                  betLabel: 'Xỉu',
                  betAmount: betAmount,
                  multiplier: 2,
                };

                session.players.set(userId, playerBet);

                await SicboSession.update(
                  {
                    players: JSON.stringify(
                      Object.fromEntries(session.players),
                    ),
                  },
                  {where: {sessionId}},
                );

                await interaction.reply({
                  content: `✅ Đặt cược **Xỉu** thành công!\nSố tiền: **${this.formatNumber(betAmount)}**\nSố dư còn lại: **${this.formatNumber(userBalance.balance)}**`,
                  flags: MessageFlags.Ephemeral,
                });

                await this.updateLobbyContainer(interaction, session);
              },
              type: ComponentEnum.MODAL,
            },
          ]);
        },
        timeout: this.waitTime + 5000,
        onTimeout: async () => {},
        type: ComponentEnum.BUTTON,
        userCheck: ['*'],
      },
    ]);

    const successContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.green())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${successEmoji} Tài Xỉu | Thành Công`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent('**Tạo bàn cược mới thành công!**'),
      );
    await interaction.editReply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    if (!channel.isTextBased()) return;

    const message = await (channel as TextChannel).send({
      components: [LobbyContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: {},
    });

    // Set startTime AFTER message is sent to ensure accurate countdown
    session.startTime = Date.now();

    session.messageId = message.id;
    await SicboSession.update(
      {messageId: message.id, startTime: session.startTime},
      {where: {sessionId}},
    );

    const updateInterval = setInterval(async () => {
      if (!session.isRunning) {
        clearInterval(updateInterval);
        return;
      }
      await this.updateLobbyContainer(interaction, session);
    }, this.updateInterval);

    await this.sleep(this.waitTime);
    session.isRunning = false;
    clearInterval(updateInterval);

    ComponentManager.getComponentManager().unregisterMany([
      taiButtonId,
      xiuButtonId,
    ]);

    await SicboSession.update({isRunning: false}, {where: {sessionId}});

    if (session.players.size === 0) {
      const noPlayerContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${failedEmoji} ## Không có người tham gia. Ván này đã bị huỷ.`,
          ),
        );

      await interaction.editReply({
        components: [noPlayerContainer],
        allowedMentions: {},
      });

      await SicboSession.destroy({where: {sessionId}});
      return;
    }

    await this.runRollingAnimation(interaction, session, message);
  }

  private getPlayerList(session: GameSession): string {
    if (session.players.size === 0) return '';

    const grouped = {
      tai: [] as string[],
      xiu: [] as string[],
    };

    session.players.forEach(player => {
      grouped[player.betType].push(player.ordererMention);
    });

    const lines: string[] = [];
    if (grouped.tai.length > 0) {
      lines.push(`Tài: ${grouped.tai.join(', ')}`);
    }
    if (grouped.xiu.length > 0) {
      lines.push(`Xỉu: ${grouped.xiu.join(', ')}`);
    }

    return lines.join('\n');
  }

  private async updateLobbyContainer(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    session: GameSession,
  ): Promise<void> {
    try {
      const guildId = interaction.guild?.id;
      if (!guildId) return;

      if (!session.messageId) {
        console.error('Message ID not found in session');
        return;
      }

      const taiButtonId = `sicbo_tai_${session.sessionId}`;
      const xiuButtonId = `sicbo_xiu_${session.sessionId}`;

      const LobbyContainer = await this.createLobbyContainer(
        session,
        taiButtonId,
        xiuButtonId,
        guildId,
        interaction.client as ExtendedClient,
      );

      const channel = await interaction.client.channels.fetch(
        session.channelId,
      );
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(session.messageId);
        await message.edit({
          components: [LobbyContainer],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: {},
        });
      }
    } catch (error) {
      console.error('Error updating lobby container:', error);
    }
  }

  private async getHistoryBoard(guildId: string): Promise<string> {
    const history = await SicboHistory.findAll({
      where: {guildId},
      order: [['timestamp', 'DESC']],
      limit: this.maxHistory,
    });

    if (history.length === 0) {
      return '*Chưa có lịch sử*';
    }

    const reversedHistory = history.reverse();

    const symbols = reversedHistory.map((h: SicboHistory) => {
      if (h.result === 'tai') return '🔴';
      return '🔵';
    });

    const rows: string[] = [];
    for (let i = 0; i < symbols.length; i += 10) {
      rows.push(symbols.slice(i, i + 10).join(' '));
    }

    return rows.join('\n');
  }

  private async getHistoryStats(guildId: string): Promise<string> {
    const history = await SicboHistory.findAll({
      where: {guildId},
      order: [['timestamp', 'DESC']],
      limit: this.maxHistory,
    });

    if (history.length === 0) {
      return '0 ván';
    }

    const taiCount = history.filter(
      (h: SicboHistory) => h.result === 'tai',
    ).length;
    const xiuCount = history.filter(
      (h: SicboHistory) => h.result === 'xiu',
    ).length;

    return `${history.length} ván | 🔴 ${taiCount} - 🔵 ${xiuCount}`;
  }

  private async createLobbyContainer(
    session: GameSession,
    taiButtonId: string,
    xiuButtonId: string,
    guildId: string,
    client: ExtendedClient,
  ): Promise<ContainerBuilder> {
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

    const remainingTime = Math.max(
      0,
      Math.ceil((session.duration - (Date.now() - session.startTime)) / 1000),
    );

    const playerList = this.getPlayerList(session);
    const [historyBoard, historyStats] = await Promise.all([
      this.getHistoryBoard(guildId),
      this.getHistoryStats(guildId),
    ]);

    return new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${infoEmoji} Tài Xỉu | Đặt Cược`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `⏳ **Thời gian đặt cược: ${remainingTime}s** ⏳`,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          '**Tỉ lệ thắng:**\n> 🔴 **Tài:** `x2`\n> 🔵 **Xỉu:** `x2`\n> ⚠️ **Thuế:** `5%`\n',
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`🔐 **MD5 Hash:** \`${session.hash}\``),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`📊 **Bảng cầu (${historyStats}):**`),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(historyBoard),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`**Người chời (${session.players.size}):**`),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(playerList || '*Chưa có ai tham gia*'),
      )
      .addSeparatorComponents(seperator => seperator)
      .addActionRowComponents<ButtonBuilder>(row =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(taiButtonId)
            .setLabel('🔴 Tài')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(xiuButtonId)
            .setLabel('🔵 Xỉu')
            .setStyle(ButtonStyle.Primary),
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Kiểm tra số dư của bạn')),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId('sicboBalance')
              .setStyle(ButtonStyle.Success)
              .setLabel('💵 Số dư'),
          ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `Session ID: ${inlineCode(session.sessionId)} • ${time(Math.round(session.startTime / 1000))}`,
          ),
        ),
      );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async runRollingAnimation(
    interaction: ChatInputCommandInteraction,
    session: GameSession,
    message: Message,
  ): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

    const loadingContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${infoEmoji} Tài Xỉu | Lắc`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `**Người chơi:** \`\`${session.players.size}\`\``,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${this.rollingFrame[0]} **Đang lắc xúc xắc...** ${this.rollingFrame[0]}\n\`\`\`\n🎲  🎲  🎲\n\`\`\``,
        ),
      );

    await interaction.editReply({components: [loadingContainer]});

    const totalFrames = 10;
    const frameDelay = 300;

    for (let i = 0; i < totalFrames; i++) {
      await this.sleep(frameDelay);

      const randomDice = [
        this.getRandomDice(),
        this.getRandomDice(),
        this.getRandomDice(),
      ];

      const frameEmoji = this.rollingFrame[i % this.rollingFrame.length];

      const rollingContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.yellow())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`## ${infoEmoji} Đang lắc xúc xắc...`),
        )
        .addSeparatorComponents(seperator => seperator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `**Người chơi:** \`\`${session.players.size}\`\``,
          ),
        )
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `${frameEmoji} **Đang lắc xúc xắc...** ${frameEmoji}\n\`\`\`${randomDice.map(d => this.diceEmojis[d - 1]).join('  ')}\n\`\`\``,
          ),
        );

      await message.edit({components: [rollingContainer]});
    }

    const diceFromSeed = this.getDiceFromSeed(session.seed);
    const dice1 = diceFromSeed[0];
    const dice2 = diceFromSeed[1];
    const dice3 = diceFromSeed[2];
    const total = dice1 + dice2 + dice3;
    const isTai = total >= 11 && total <= 17;
    const isXiu = total >= 4 && total <= 10;

    const resultType: 'tai' | 'xiu' = isTai ? 'tai' : 'xiu';

    const winners: PlayerBet[] = [];
    const losers: PlayerBet[] = [];

    session.players.forEach(player => {
      const won = this.checkPlayerWin(player.betType, isTai, isXiu);
      if (won) {
        winners.push(player);
      } else {
        losers.push(player);
      }
    });

    const resultContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${infoEmoji} Tài Xỉu | Kết Quả`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `\`\`\`\n${this.diceEmojis[dice1 - 1]}  ${this.diceEmojis[dice2 - 1]}  ${this.diceEmojis[dice3 - 1]}\`\`\``,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`**Tổng: ${total}**`),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `**Kết quả: ${this.getResultLabel(resultType)}**`,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `🎉 **Người thắng (${winners.length}):**\n${winners.map(w => `${w.ordererMention} (${w.betLabel} - x${w.multiplier})`).join('\n') || '*Không có*'}`,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `💔 **Người thua (${losers.length}):**\n${losers.map(l => `${l.ordererMention} (${l.betLabel})`).join('\n') || '*Không có*'}`,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`> 🔐 **Seed:** \`${session.seed}\``),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`> 🔒 **MD5:** \`${session.hash}\``),
      );

    const guildId = interaction.guild!.id;
    await this.addToHistory(guildId, session.sessionId, {
      result: resultType,
      dice: [dice1, dice2, dice3],
      total,
      timestamp: Date.now(),
    });

    await SicboSession.update(
      {
        dice1,
        dice2,
        dice3,
        result: resultType,
        isRunning: false,
      },
      {where: {sessionId: session.sessionId}},
    );

    await this.processPayouts(
      interaction,
      winners,
      losers,
      resultType,
      dice1,
      dice2,
      dice3,
      total,
    );

    await message.edit({
      components: [resultContainer],
      allowedMentions: {},
    });
  }

  private getRandomDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  private getDiceFromSeed(seed: string): [number, number, number] {
    const hash = crypto.createHash('sha256').update(seed).digest('hex');

    const dice1 = (parseInt(hash.substring(0, 2), 16) % 6) + 1;
    const dice2 = (parseInt(hash.substring(2, 4), 16) % 6) + 1;
    const dice3 = (parseInt(hash.substring(4, 6), 16) % 6) + 1;

    return [dice1, dice2, dice3];
  }

  private async addToHistory(
    guildId: string,
    sessionId: string,
    result: GameResult,
  ): Promise<void> {
    await SicboHistory.create({
      guildId,
      sessionId,
      result: result.result,
      dice1: result.dice[0],
      dice2: result.dice[1],
      dice3: result.dice[2],
      total: result.total,
      timestamp: result.timestamp,
    });

    const count = await SicboHistory.count({where: {guildId}});
    if (count > this.maxHistory) {
      const oldest = await SicboHistory.findAll({
        where: {guildId},
        order: [['timestamp', 'ASC']],
        limit: count - this.maxHistory,
      });
      for (const record of oldest) {
        await record.destroy();
      }
    }
  }

  private getResultLabel(resultType: 'tai' | 'xiu'): string {
    switch (resultType) {
      case 'tai':
        return '🔴 TÀI';
      case 'xiu':
        return '🔵 XỈU';
    }
  }

  private checkPlayerWin(
    betType: BetType,
    isTai: boolean,
    isXiu: boolean,
  ): boolean {
    if (betType === 'tai') return isTai;
    if (betType === 'xiu') return isXiu;
    return false;
  }

  private async processPayouts(
    interaction: ChatInputCommandInteraction,
    winners: PlayerBet[],
    losers: PlayerBet[],
    resultType: BetType,
    dice1: number,
    dice2: number,
    dice3: number,
    total: number,
  ): Promise<void> {
    const diceDisplay = `${this.diceEmojis[dice1 - 1]} ${this.diceEmojis[dice2 - 1]} ${this.diceEmojis[dice3 - 1]}`;
    const resultLabel = this.getResultLabel(resultType);

    // Process winners - give them their winnings
    for (const winner of winners) {
      const grossWinAmount = winner.betAmount * winner.multiplier;
      const taxAmount = Math.floor(grossWinAmount * 0.05); // 5% tax
      const netWinAmount = grossWinAmount - taxAmount;

      // Update balance
      const userBalance = await Balance.findOne({
        where: {userId: winner.orderId},
      });

      if (userBalance) {
        await userBalance.update({
          balance: userBalance.balance + netWinAmount,
        });

        // Reload to get the updated balance
        await userBalance.reload();

        try {
          const user = await interaction.client.users.fetch(winner.orderId);
          await user.send({
            content:
              '🎉 **CHÚC MỪNG! BẠN ĐÃ THẮNG!** 🎉\n\n' +
              `**Kết quả:** ${diceDisplay}\n` +
              `**Tổng:** ${total} - ${resultLabel}\n\n` +
              `**Cược của bạn:** ${winner.betLabel}\n` +
              `**Số tiền cược:** ${this.formatNumber(winner.betAmount)}\n` +
              `**Tỷ lệ:** x${winner.multiplier}\n` +
              `**Tiền thắng (trước thuế):** ${this.formatNumber(grossWinAmount)}\n` +
              `**Thuế (5%):** -${this.formatNumber(taxAmount)}\n` +
              `**Tiền thắng (sau thuế):** ${this.formatNumber(netWinAmount)}\n\n` +
              `💰 **Số dư mới:** ${this.formatNumber(userBalance.balance)}`,
          });
        } catch (error) {
          console.error(
            'Failed to send DM to winner ' + winner.orderId + ':',
            error,
          );
        }
      }
    }

    for (const loser of losers) {
      try {
        const user = await interaction.client.users.fetch(loser.orderId);
        const userBalance = await Balance.findOne({
          where: {userId: loser.orderId},
        });

        await user.send({
          content:
            '💔 **RẤT TIẾC! BẠN ĐÃ THUA!** 💔\n\n' +
            `**Kết quả:** ${diceDisplay}\n` +
            `**Tổng:** ${total} - ${resultLabel}\n\n` +
            `**Cược của bạn:** ${loser.betLabel}\n` +
            `**Số tiền cược:** ${loser.betAmount}\n` +
            `**Số tiền mất:** ${loser.betAmount}\n\n` +
            `💰 **Số dư hiện tại:** ${userBalance?.balance || 0}\n\n` +
            'Chúc bạn may mắn lần sau! 🍀',
        });
      } catch (error) {
        console.error(
          'Failed to send DM to loser ' + loser.orderId + ':',
          error,
        );
      }
    }
  }
}
