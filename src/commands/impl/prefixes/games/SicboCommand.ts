import {
  bold,
  ButtonInteraction,
  ButtonStyle,
  codeBlock,
  ContainerBuilder,
  inlineCode,
  italic,
  LabelBuilder,
  Message,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  quote,
  subtext,
  TextInputBuilder,
  TextInputStyle,
  time,
  userMention,
} from 'discord.js';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {PrefixCommand} from '../../../PrefixCommand';
import Config from '../../../../config/Config';
import {StatusContainer} from '../../../../util/StatusContainer';
import SicboSession from '../../../../database/models/SicboSession.model';
import {nanoid} from 'nanoid';
import * as crypto from 'crypto';
import SicboHistory from '../../../../database/models/SicboHistory.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import Balance from '../../../../database/models/Balance.model';
import {numberFormat} from '../../../../util/NumberFormat';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {sleep} from '../../../../util/Sleep';

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

export default class SicboCommand extends PrefixCommand {
  private readonly waitTime = sicboConfig.waitTime;
  private readonly updateInterval = sicboConfig.updateInterval;
  private readonly maxHistory = sicboConfig.maxHistory;

  constructor() {
    super('sicbo', [], 60000);
  }

  async run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ) {
    const {message, client} = context;

    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

    const loadingContainer = await StatusContainer.loading(loadingEmoji);
    const replyMessage = await message.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const guild = message.guild;
    const channel = message.channel;
    const user = message.author;

    if (!guild || !channel) return;

    if (!channel.isTextBased()) return;

    const existingSession = await SicboSession.findOne({
      where: {
        guildId: guild.id,
        isRunning: true,
      },
    });

    if (existingSession) {
      const errorContainer = await StatusContainer.failed(
        failedEmoji,
        'Đã có một ván Tài Xỉu đang diễn ra trong server này!',
      );

      await replyMessage.edit({
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      return;
    }

    const sessionId = nanoid(10);

    const seed = `${nanoid(32)}`;
    const hash = crypto.createHash('md5').update(seed).digest('hex');

    const startTime = Math.round(Date.now() / 1000);

    const session: GameSession = {
      sessionId,
      players: new Map(),
      messageId: '',
      channelId: channel.id,
      startTime,
      duration: this.waitTime,
      isRunning: true,
      seed,
      hash,
    };

    await SicboSession.create({
      sessionId,
      guildId: guild.id,
      channelId: channel.id,
      messageId: '',
      hostId: user.id,
      hostTag: user.tag,
      players: '{}',
      startTime,
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

    ComponentManager.getComponentManager().register([
      {
        customId: taiButtonId,
        handler: async (interaction: ButtonInteraction) => {
          if (!session.isRunning) {
            const endedContainer = new ContainerBuilder()
              .setAccentColor(EmbedColors.red())
              .addTextDisplayComponents(textDisplay =>
                textDisplay.setContent(
                  `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
                ),
              );
            await interaction.reply({
              components: [endedContainer],
              flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });
            return;
          }

          if (session.players.has(interaction.user.id)) {
            const currentBet = session.players.get(interaction.user.id)!;
            const alreadyBetContainer = new ContainerBuilder()
              .setAccentColor(EmbedColors.red())
              .addTextDisplayComponents(textDisplay =>
                textDisplay.setContent(
                  `## ${failedEmoji} Bạn đã đặt ${inlineCode(currentBet.betLabel)} rồi!`,
                ),
              );
            await interaction.reply({
              components: [alreadyBetContainer],
              flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });
            return;
          }

          const userId = interaction.user.id;
          const [userBalance] = await Balance.findOrCreate({
            where: {userId},
            defaults: {userId, balance: 1000, creditScore: 500},
          });

          const taiBetModal = new ModalBuilder()
            .setCustomId('taiBetModal')
            .setTitle('Đặt tiền cược')
            .addLabelComponents(
              new LabelBuilder()
                .setLabel('Nhập số tiền bạn muốn cược')
                .setDescription(`Số dư: ${numberFormat(userBalance.balance)}`)
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId('taiBetInput')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('VD: 100, 1000, ...'),
                ),
            );

          await interaction.showModal(taiBetModal);

          ComponentManager.getComponentManager().register([
            {
              customId: 'taiBetModal',
              handler: async (interaction: ModalSubmitInteraction) => {
                if (!session.isRunning) {
                  const endedContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
                      ),
                    );
                  await interaction.reply({
                    components: [endedContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });
                  return;
                }

                const betAmountInput =
                  interaction.fields.getTextInputValue('taiBetInput');

                const betAmount = parseFloat(betAmountInput);

                if (isNaN(betAmount) || betAmount <= 0) {
                  const invaildBetAmountContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${failedEmoji} Số tiền không hợp lệ!`,
                      ),
                    );
                  await interaction.reply({
                    components: [invaildBetAmountContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });
                  return;
                }

                const userId = interaction.user.id;
                const userBalance = await Balance.findOne({
                  where: {userId},
                });

                if (!userBalance || userBalance.balance < betAmount) {
                  const insufficientBalanceContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${failedEmoji} Số dư của bạn không đủ!`,
                      ),
                    );
                  await interaction.reply({
                    components: [insufficientBalanceContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
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

                const betCompletedContainer = new ContainerBuilder()
                  .setAccentColor(EmbedColors.green())
                  .addTextDisplayComponents(textDisplay =>
                    textDisplay.setContent(
                      `## ${successEmoji} Bạn đã đặt cược vào ${inlineCode('Tài')} thành công!`,
                    ),
                  );
                await interaction.reply({
                  components: [betCompletedContainer],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });

                await this.updateLobbyContainer(interaction, client, session);
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
            const endedContainer = new ContainerBuilder()
              .setAccentColor(EmbedColors.red())
              .addTextDisplayComponents(textDisplay =>
                textDisplay.setContent(
                  `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
                ),
              );
            await interaction.reply({
              components: [endedContainer],
              flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });
            return;
          }

          if (session.players.has(interaction.user.id)) {
            const currentBet = session.players.get(interaction.user.id)!;
            const alreadyBetContainer = new ContainerBuilder()
              .setAccentColor(EmbedColors.red())
              .addTextDisplayComponents(textDisplay =>
                textDisplay.setContent(
                  `## ${failedEmoji} Bạn đã đặt ${inlineCode(currentBet.betLabel)} rồi!`,
                ),
              );
            await interaction.reply({
              components: [alreadyBetContainer],
              flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            });
            return;
          }

          const userId = interaction.user.id;
          const [userBalance] = await Balance.findOrCreate({
            where: {userId},
            defaults: {userId, balance: 1000, creditScore: 500},
          });

          const xiuBetModal = new ModalBuilder()
            .setCustomId('xiuBetModal')
            .setTitle('Đặt tiền cược')
            .addLabelComponents(
              new LabelBuilder()
                .setLabel('Nhập số tiền bạn muốn cược')
                .setDescription(`Số dư: ${numberFormat(userBalance.balance)}`)
                .setTextInputComponent(
                  new TextInputBuilder()
                    .setCustomId('xiuBetInput')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('VD: 100, 1000, ...'),
                ),
            );

          await interaction.showModal(xiuBetModal);

          ComponentManager.getComponentManager().register([
            {
              customId: 'xiuBetModal',
              handler: async (interaction: ModalSubmitInteraction) => {
                if (!session.isRunning) {
                  const endedContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `${failedEmoji} Thời gian đặt cược đã kết thúc!`,
                      ),
                    );
                  await interaction.reply({
                    components: [endedContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });
                  return;
                }

                const betAmountInput =
                  interaction.fields.getTextInputValue('xiuBetInput');

                const betAmount = parseFloat(betAmountInput);

                if (isNaN(betAmount) || betAmount <= 0) {
                  const invaildBetAmountContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${failedEmoji} Số tiền không hợp lệ!`,
                      ),
                    );
                  await interaction.reply({
                    components: [invaildBetAmountContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
                  });
                  return;
                }

                const userId = interaction.user.id;
                const userBalance = await Balance.findOne({
                  where: {userId},
                });

                if (!userBalance || userBalance.balance < betAmount) {
                  const insufficientBalanceContainer = new ContainerBuilder()
                    .setAccentColor(EmbedColors.red())
                    .addTextDisplayComponents(textDisplay =>
                      textDisplay.setContent(
                        `## ${failedEmoji} Số dư của bạn không đủ!`,
                      ),
                    );
                  await interaction.reply({
                    components: [insufficientBalanceContainer],
                    flags: [
                      MessageFlags.Ephemeral,
                      MessageFlags.IsComponentsV2,
                    ],
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

                const betCompletedContainer = new ContainerBuilder()
                  .setAccentColor(EmbedColors.green())
                  .addTextDisplayComponents(textDisplay =>
                    textDisplay.setContent(
                      `## ${successEmoji} Bạn đã đặt cược vào ${inlineCode('Xỉu')} thành công!`,
                    ),
                  );
                await interaction.reply({
                  components: [betCompletedContainer],
                  flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                });

                await this.updateLobbyContainer(interaction, client, session);
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
    const LobbyContainer = await this.createLobbyContainer(
      session,
      infoEmoji,
      taiButtonId,
      xiuButtonId,
      guild.id,
    );

    const successContainer = await StatusContainer.success(
      successEmoji,
      'Tạo bàn cược mới thành công!',
    );

    await replyMessage.edit({
      content: '',
      components: [successContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    setTimeout(async () => {
      await replyMessage.delete();
    }, 5000);

    if (channel.isTextBased() && 'send' in channel) {
      const lobbyMessage = await channel.send({
        content: '',
        components: [LobbyContainer],
        flags: [MessageFlags.IsComponentsV2],
        allowedMentions: {},
      });

      session.messageId = lobbyMessage.id;
      await SicboSession.update(
        {
          messageId: message.id,
        },
        {
          where: {sessionId},
        },
      );

      const updateInterval = setInterval(async () => {
        if (!session.isRunning) {
          clearInterval(updateInterval);
          return;
        }
        await this.updateLobbyContainer(lobbyMessage, client, session);
      }, this.updateInterval);

      await sleep(this.waitTime);
      session.isRunning = false;
      clearInterval(updateInterval);

      ComponentManager.getComponentManager().unregisterMany([
        taiButtonId,
        xiuButtonId,
      ]);

      await SicboSession.update({isRunning: false}, {where: {sessionId}});

      if (session.players.size === 0) {
        const errorContainer = await StatusContainer.failed(
          failedEmoji,
          'Không có người chơi nào tham gia. Ván này đã bị huỷ!',
        );

        await lobbyMessage.edit({
          components: [errorContainer],
        });

        await SicboSession.destroy({where: {sessionId}});
        return;
      }

      await this.gameFinish(session, lobbyMessage, infoEmoji, loadingEmoji);
    }
  }

  private async createLobbyContainer(
    session: GameSession,
    infoEmoji: unknown,
    taiButtonId: string,
    xiuButtonId: string,
    guildId: string,
  ): Promise<ContainerBuilder> {
    const remainingTime = Math.max(
      0,
      Math.ceil(
        session.duration / 1000 - (Date.now() / 1000 - session.startTime),
      ),
    );

    const playerList = this.getPlayerList(session);
    const [historyBoard, historyStats] = await Promise.all([
      await this.getHistoryBoard(guildId),
      await this.getHistoryStats(guildId),
    ]);

    return new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${infoEmoji} Tài Xỉu`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          bold(`⏳ Thời gian đặt cược: ${remainingTime}s ⏳`),
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          bold(`🔐 MD5 Hash: ${inlineCode(session.hash)}`),
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(bold(`📊 Bảng cầu (${historyStats}):`)),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(historyBoard),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(bold(`Người chơi (${session.players.size}):`)),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(playerList || italic('Chưa có ai tham gia')),
      )
      .addSeparatorComponents(seperator => seperator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Bấm vào đây để cược Tài')),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(taiButtonId)
              .setLabel('🔴 Tài')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Bấm vào đây để cược Xỉu')),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(xiuButtonId)
              .setLabel('🔵 Xỉu')
              .setStyle(ButtonStyle.Primary),
          ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `Session ID: ${inlineCode(session.sessionId)} • ${time(session.startTime)}`,
          ),
        ),
      );
  }

  private async updateLobbyContainer(
    message: Message<boolean> | ModalSubmitInteraction,
    client: ExtendedClient,
    session: GameSession,
  ) {
    try {
      const guildId = message.guild?.id;
      if (!guildId) return;

      if (!session.messageId) {
        console.error('Message ID not found in session');
        return;
      }

      const taiButtonId = `sicbo_tai_${session.sessionId}`;
      const xiuButtonId = `sicbo_xiu_${session.sessionId}`;

      const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

      const LobbyContainer = await this.createLobbyContainer(
        session,
        infoEmoji,
        taiButtonId,
        xiuButtonId,
        guildId,
      );

      const channel = await message.client.channels.fetch(session.channelId);

      if (channel?.isTextBased()) {
        const fetchedMessage = await channel.messages.fetch(session.messageId);
        await fetchedMessage.edit({
          components: [LobbyContainer],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: {},
        });
      }
    } catch (error) {
      console.error('Error updating lobby container:', error);
    }
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

  private async getHistoryBoard(guildId: string): Promise<string> {
    const history = await SicboHistory.findAll({
      where: {guildId},
      order: [['timestamp', 'DESC']],
      limit: this.maxHistory,
    });

    if (history.length === 0) {
      return italic('Chưa có lịch sử');
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

  private async gameFinish(
    session: GameSession,
    message: Message<boolean>,
    infoEmoji: unknown,
    loadingEmoji: unknown,
  ): Promise<void> {
    const loadingContainer = await StatusContainer.loading(loadingEmoji);

    await message.edit({components: [loadingContainer]});

    await sleep(this.updateInterval);

    const diceFromSeed = this.getDiceFromSeed(session.seed);
    const dice1 = diceFromSeed[0];
    const dice2 = diceFromSeed[1];
    const dice3 = diceFromSeed[2];
    const total = dice1 + dice2 + dice3;
    const isTai = total >= 11 && total <= 17;
    const isXiu = total >= 3 && total <= 10;

    const resultType: BetType = isTai ? 'tai' : 'xiu';

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
        textDisplay.setContent(`## ${infoEmoji} Tài Xỉu`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(codeBlock(`${dice1}  ${dice2}  ${dice3}`)),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          bold(`Kết quả: ${this.getResultLabel(resultType)}`),
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('🔐 Seed:')} ${inlineCode(session.seed)}`,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('🔒 MD5:')} ${inlineCode(session.hash)}`,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold(`🎉 Người thắng (${winners.length}):`)}\n${winners.map(w => quote(`${w.ordererMention}`)).join('\n') || quote(italic('Không có'))}`,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold(`💔 Người thua (${losers.length}):`)}\n${losers.map(l => quote(`${l.ordererMention}`)).join('\n') || quote(italic('Không có'))}`,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `Session ID: ${inlineCode(session.sessionId)} • ${time(session.startTime)}`,
          ),
        ),
      );

    const guildId = message.guildId;

    if (!guildId) return;

    await this.addToHistory(guildId, session.sessionId, {
      result: resultType,
      dice: [dice1, dice2, dice3],
      total,
      timestamp: Math.round(Date.now() / 1000),
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

    await this.processPayouts(message, infoEmoji, winners, losers, resultType);

    await message.edit({
      components: [resultContainer],
      allowedMentions: {},
    });
  }

  private getDiceFromSeed(seed: string): [number, number, number] {
    const hash = crypto.createHash('sha256').update(seed).digest('hex');

    const dice1 = (parseInt(hash.substring(0, 2), 16) % 6) + 1;
    const dice2 = (parseInt(hash.substring(2, 4), 16) % 6) + 1;
    const dice3 = (parseInt(hash.substring(4, 6), 16) % 6) + 1;

    return [dice1, dice2, dice3];
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
    message: Message<boolean>,
    infoEmoji: unknown,
    winners: PlayerBet[],
    losers: PlayerBet[],
    resultType: BetType,
  ): Promise<void> {
    const resultLabel = this.getResultLabel(resultType);

    for (const winner of winners) {
      const grossWinAmount = winner.betAmount * winner.multiplier;
      const taxAmount = Math.floor(grossWinAmount * 0.05);
      const netWinAmount = grossWinAmount - taxAmount;

      const userBalance = await Balance.findOne({
        where: {userId: winner.orderId},
      });

      if (userBalance) {
        await userBalance.update({
          balance: userBalance.balance + netWinAmount,
        });

        await userBalance.reload();

        try {
          const user = await message.client.users.fetch(winner.orderId);
          const winContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.green())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(`## ${infoEmoji} Kết Quả`),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(bold('🎉 Chúc mừng! Bạn đã thắng cược!')),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(`${bold('Kết quả: ' + resultLabel)}`),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `${bold('💵 Số tiền cược:')} ${numberFormat(winner.betAmount)}`,
              ),
            )
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `${bold('💵 Tiền thắng (trước thuế):')} ${numberFormat(grossWinAmount)}`,
              ),
            )
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `${bold('💸 Thuế (5%):')} -${numberFormat(taxAmount)}`,
              ),
            )
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `${bold('💵 Tiền thắng (sau thuế):')} ${numberFormat(netWinAmount)}`,
              ),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `💰 ${bold('Số dư mới:')} ${numberFormat(userBalance.balance)}`,
              ),
            );

          await user.send({
            components: [winContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } catch {
          //
        }
      }
    }

    for (const loser of losers) {
      try {
        const user = await message.client.users.fetch(loser.orderId);
        const userBalance = await Balance.findOne({
          where: {userId: loser.orderId},
        });

        const loseContainer = new ContainerBuilder()
          .setAccentColor(EmbedColors.red())
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(`## ${infoEmoji} Kết Quả`),
          )
          .addSeparatorComponents(seperator => seperator)
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(bold('💔 Rất tiếc! Bạn đã thua!')),
          )
          .addSeparatorComponents(seperator => seperator)
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(`${bold('Kết quả: ' + resultLabel)}`),
          )
          .addSeparatorComponents(seperator => seperator)
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `${bold('💸 Số tiền mất:')} ${numberFormat(loser.betAmount)}`,
            ),
          )
          .addSeparatorComponents(seperator => seperator)
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `${bold('💰 Số dư hiện tại:')} ${numberFormat(userBalance?.balance || 0)}`,
            ),
          );

        await user.send({
          components: [loseContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch {
        //
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
}
