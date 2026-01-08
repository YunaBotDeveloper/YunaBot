import {Command} from '../../Command';
import Config from '../../../config/Config';
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  InteractionCallbackResponse,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  userMention,
} from 'discord.js';
import {nanoid} from 'nanoid';
import * as crypto from 'crypto';
import SicboSession from '../../../database/models/SicboSession.model';
import ComponentManager from '../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../enum/ComponentEnum';
import {EmbedColors} from '../../../util/EmbedColors';
import SicboHistory from '../../../database/models/SicboHistory.model';
import Balance from '../../../database/models/Balance.model';

type BetType = 'tai' | 'xiu' | 'boba';

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
    super('sicbonew', 'testing feature do not use');

    this.advancedOptions.cooldown = 60000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    const channel = interaction.channel;
    const user = interaction.user;

    if (!guild || !channel) return;

    // Check if there's already a running game in this guild
    const existingSession = await SicboSession.findOne({
      where: {
        guildId: guild.id,
        isRunning: true,
      },
    });

    if (existingSession) {
      await interaction.reply({
        content:
          '❌ Đã có một ván Tài Xỉu đang diễn ra trong server này! Vui lòng đợi ván hiện tại kết thúc.',
        flags: MessageFlags.Ephemeral,
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
      startTime: Math.round(Date.now()),
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
      startTime: session.startTime,
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
    const bobaButtonId = `sicbo_boba_${sessionId}`;

    const LobbyContainer = await this.createLobbyContainer(
      session,
      taiButtonId,
      xiuButtonId,
      bobaButtonId,
      guild.id,
    );

    ComponentManager.getComponentManager().register([
      {
        customId: taiButtonId,
        handler: async (interaction: ButtonInteraction) => {
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
            defaults: {userId, balance: 0},
          });

          const taiBetInput = new TextInputBuilder()
            .setCustomId('taiBetInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('VD: 100, 200, 1000');

          const taiLabel = new LabelBuilder()
            .setLabel('Nhập số tiền bạn muốn cược.')
            .setDescription(`Số tiền hiện tại của bạn: ${userBalance.balance}`)
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
                    content: `❌ Số dư không đủ! Số dư hiện tại: **${userBalance?.balance || 0}**, Số tiền cược: **${betAmount}**`,
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
                  content: `✅ Đặt cược **Tài** thành công!\nSố tiền: **${betAmount}**\nSố dư còn lại: **${userBalance.balance}**`,
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
            defaults: {userId, balance: 0},
          });

          const xiuBetInput = new TextInputBuilder()
            .setCustomId('xiuBetInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('VD: 100, 200, 1000');

          const xiuLabel = new LabelBuilder()
            .setLabel('Nhập số tiền bạn muốn cược.')
            .setDescription(`Số tiền hiện tại của bạn: ${userBalance.balance}`)
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
                    content: `❌ Số dư không đủ! Số dư hiện tại: **${userBalance?.balance || 0}**, Số tiền cược: **${betAmount}**`,
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
                  content: `✅ Đặt cược **Xỉu** thành công!\nSố tiền: **${betAmount}**\nSố dư còn lại: **${userBalance.balance}**`,
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
        customId: bobaButtonId,
        handler: async (interaction: ButtonInteraction) => {
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
            defaults: {userId, balance: 0},
          });

          const bobaBetInput = new TextInputBuilder()
            .setCustomId('bobaBetInput')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('VD: 100, 200, 1000');

          const bobaLabel = new LabelBuilder()
            .setLabel('Nhập số tiền bạn muốn cược.')
            .setDescription(`Số tiền hiện tại của bạn: ${userBalance.balance}`)
            .setTextInputComponent(bobaBetInput);

          const bobaBetModal = new ModalBuilder()
            .setCustomId('bobaBetModal')
            .setTitle('Bộ Ba: Đặt tiền cược')
            .addLabelComponents(bobaLabel);

          await interaction.showModal(bobaBetModal);

          ComponentManager.getComponentManager().register([
            {
              customId: 'bobaBetModal',
              handler: async (interaction: ModalSubmitInteraction) => {
                const betAmountInput =
                  interaction.fields.getTextInputValue('bobaBetInput');

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
                    content: `❌ Số dư không đủ! Số dư hiện tại: **${userBalance?.balance || 0}**, Số tiền cược: **${betAmount}**`,
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
                  betType: 'boba',
                  betLabel: 'Bộ Ba',
                  betAmount: betAmount,
                  multiplier: 30,
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
                  content: `✅ Đặt cược **Bộ Ba** thành công!\nSố tiền: **${betAmount}**\nSố dư còn lại: **${userBalance.balance}**`,
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

    const reply = await interaction.reply({
      components: [LobbyContainer],
      flags: MessageFlags.IsComponentsV2,
      withResponse: true,
    });

    session.messageId = reply.resource?.message!.id || '';
    await SicboSession.update(
      {messageId: reply.resource?.message!.id},
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
      bobaButtonId,
    ]);

    await SicboSession.update({isRunning: false}, {where: {sessionId}});

    if (session.players.size === 0) {
      const noPlayerContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            '## Không có người tham gia. Ván này đã bị huỷ.',
          ),
        );

      await interaction.editReply({components: [noPlayerContainer]});

      await SicboSession.destroy({where: {sessionId}});
      return;
    }

    await this.runRollingAnimation(interaction, session, reply);
  }

  private getPlayerList(session: GameSession): string {
    if (session.players.size === 0) return '';

    const grouped = {
      tai: [] as string[],
      xiu: [] as string[],
      boba: [] as string[],
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
    if (grouped.boba.length > 0) {
      lines.push(`Bộ ba: ${grouped.boba.join(', ')}`);
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

      // Check if messageId exists
      if (!session.messageId) {
        console.error('Message ID not found in session');
        return;
      }

      const taiButtonId = `sicbo_tai_${session.sessionId}`;
      const xiuButtonId = `sicbo_xiu_${session.sessionId}`;
      const bobaButtonId = `sicbo_boba_${session.sessionId}`;

      const LobbyContainer = await this.createLobbyContainer(
        session,
        taiButtonId,
        xiuButtonId,
        bobaButtonId,
        guildId,
      );

      const channel = await interaction.client.channels.fetch(
        session.channelId,
      );
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(session.messageId);
        await message.edit({
          components: [LobbyContainer],
          flags: MessageFlags.IsComponentsV2,
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
      if (h.result === 'boba') return '🌟';
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
    const tripleCount = history.filter(
      (h: SicboHistory) => h.result === 'triple',
    ).length;

    return `${history.length} ván | 🔴 ${taiCount} - 🔵 ${xiuCount} - 🌟 ${tripleCount}`;
  }

  private async createLobbyContainer(
    session: GameSession,
    taiButtonId: string,
    xiuButtonId: string,
    bobaButtonId: string,
    guildId: string,
  ): Promise<ContainerBuilder> {
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
        textDisplay.setContent('## Tài Xỉu MD5'),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `⏳ **Thời gian đặt cược: ${remainingTime}s** ⏳`,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          '**Tỉ lệ thắng:**\n> 🔴 **Tài:** `x2`\n> 🔵 **Xỉu:** `x2`\n> 🌟 **Bộ Ba:** `x30`\n',
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
          new ButtonBuilder()
            .setCustomId(bobaButtonId)
            .setLabel('🌟 Bộ ba')
            .setStyle(ButtonStyle.Success),
        ),
      );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async runRollingAnimation(
    interaction: ChatInputCommandInteraction,
    session: GameSession,
    message: InteractionCallbackResponse,
  ): Promise<void> {
    const loadingContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent('## Đang lắc xúc xắc...'),
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
          textDisplay.setContent('## Đang lắc xúc xắc...'),
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

      await message.resource?.message!.edit({components: [rollingContainer]});
    }

    // Final result - use seed for deterministic dice
    const diceFromSeed = this.getDiceFromSeed(session.seed);
    const dice1 = diceFromSeed[0];
    const dice2 = diceFromSeed[1];
    const dice3 = diceFromSeed[2];
    const total = dice1 + dice2 + dice3;
    const isBoBa = dice1 === dice2 && dice2 === dice3;
    const isTai = total >= 11 && total <= 17 && !isBoBa;
    const isXiu = total >= 4 && total <= 10 && !isBoBa;

    const resultType: 'tai' | 'xiu' | 'boba' = isBoBa
      ? 'boba'
      : isTai
        ? 'tai'
        : 'xiu';

    // Calculate winners and losers
    const winners: PlayerBet[] = [];
    const losers: PlayerBet[] = [];

    session.players.forEach(player => {
      const won = this.checkPlayerWin(player.betType, isBoBa, isTai, isXiu);
      if (won) {
        winners.push(player);
      } else {
        losers.push(player);
      }
    });

    const resultContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## Tài Xỉu - Kết Quả\n\`\`\`\n${this.diceEmojis[dice1 - 1]}  ${this.diceEmojis[dice2 - 1]}  ${this.diceEmojis[dice3 - 1]}\n\`\`\``,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `**Tổng: ${total}** ${isBoBa ? '🌟 BA SỐ GIỐNG NHAU! 🌟' : ''}`,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`Kết quả: ${this.getResultLabel(resultType)}**`),
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
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`🔐 **Seed:** \`${session.seed}\``),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`🔒 **MD5:** \`${session.hash}\``),
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

    // Process payouts and send DMs
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

    await message.resource?.message!.edit({components: [resultContainer]});
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

  private getBetInfo(betType: BetType): {label: string; multiplier: number} {
    switch (betType) {
      case 'tai':
        return {label: '🔴 Tài', multiplier: 2};
      case 'xiu':
        return {label: '🔵 Xỉu', multiplier: 2};
      case 'boba':
        return {label: '🌟 BỘ BA', multiplier: 30};
    }
  }

  private getResultLabel(resultType: 'tai' | 'xiu' | 'boba'): string {
    switch (resultType) {
      case 'tai':
        return '🔴 TÀI';
      case 'xiu':
        return '🔵 XỈU';
      case 'boba':
        return '🌟 BỘ BA';
    }
  }

  private checkPlayerWin(
    betType: BetType,
    isBoBa: boolean,
    isTai: boolean,
    isXiu: boolean,
  ): boolean {
    if (betType === 'boba') return isBoBa;
    if (isBoBa) return false; // Triple beats both tai and xiu
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
      const winAmount = winner.betAmount * winner.multiplier;

      // Update balance
      const userBalance = await Balance.findOne({
        where: {userId: winner.orderId},
      });

      if (userBalance) {
        await userBalance.update({
          balance: userBalance.balance + winAmount,
        });

        // Send DM to winner
        try {
          const user = await interaction.client.users.fetch(winner.orderId);
          await user.send({
            content:
              '🎉 **CHÚC MỪNG! BẠN ĐÃ THẮNG!** 🎉\n\n' +
              `**Kết quả:** ${diceDisplay}\n` +
              `**Tổng:** ${total} - ${resultLabel}\n\n` +
              `**Cược của bạn:** ${winner.betLabel}\n` +
              `**Số tiền cược:** ${winner.betAmount}\n` +
              `**Tỷ lệ:** x${winner.multiplier}\n` +
              `**Tiền thắng:** ${winAmount}\n\n` +
              `💰 **Số dư mới:** ${userBalance.balance + winAmount}`,
          });
        } catch (error) {
          console.error(
            'Failed to send DM to winner ' + winner.orderId + ':',
            error,
          );
        }
      }
    }

    // Process losers - send them notification (they already lost their bet amount)
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
