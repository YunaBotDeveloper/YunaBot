import {
  bold,
  ButtonStyle,
  ContainerBuilder,
  inlineCode,
  italic,
  Message,
  MessageFlags,
  subtext,
  TextChannel,
  time,
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

    const existingSession = await SicboSession.findOne({
      where: {
        guildId: guild.id,
        isRunning: true,
      },
    });

    if (existingSession) {
      const errorEmbed = await StatusContainer.failed(
        failedEmoji,
        'Đã có một ván Tài Xỉu đang diễn ra trong server này!',
      );

      await replyMessage.edit({
        components: [errorEmbed],
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

    const lobbyMessage = await (channel as TextChannel).send({
      content: '',
      components: [LobbyContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });
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
}
