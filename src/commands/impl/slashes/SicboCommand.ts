import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import {Command} from '../../Command';
import {nanoid} from 'nanoid';
import ButtonComponentBuilder from '../../../component/builders/ButtonComponentBuilder';
import ComponentManager from '../../../component/manager/ComponentManager';
import Log4TS from '../../../logger/Log4TS';
import * as crypto from 'crypto';

type BetType = 'tai' | 'xiu' | 'triple';

interface PlayerBet {
  oderId: string;
  odererTag: string;
  odererMention: string;
  odererAvatar: string;
  betType: BetType;
  betLabel: string;
  multiplier: number;
}

interface GameSession {
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
  result: 'tai' | 'xiu' | 'triple';
  dice: [number, number, number];
  total: number;
  timestamp: number;
}

// Store history per guild (max 20 results)
const guildHistory: Map<string, GameResult[]> = new Map();

export default class SicboCommand extends Command {
  private readonly diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  private readonly rollingFrames = ['🎲', '🎰', '🎯', '🎪', '🎲'];
  private readonly WAIT_TIME = 30 * 1000; // 30 seconds
  private readonly UPDATE_INTERVAL = 5000; // Update every 5 seconds
  private readonly MAX_HISTORY = 20; // Max history entries per guild

  constructor() {
    super('sicbo', '🎲 Chơi Sicbo - Tài Xỉu Multiplayer!');

    this.advancedOptions.cooldown = 60000; // 1 minute cooldown
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    // Log when user starts a sicbo game
    const channelName =
      interaction.channel && 'name' in interaction.channel
        ? interaction.channel.name
        : interaction.channelId;
    Log4TS.getLogger().info(
      `[Sicbo] ${interaction.user.tag} started a new game in #${channelName}`,
    );

    const sessionId = nanoid(10);
    
    // Generate provably fair seed
    const seed = `${nanoid(32)}-${Date.now()}`;
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    
    const session: GameSession = {
      players: new Map(),
      messageId: '',
      channelId: interaction.channelId,
      startTime: Date.now(),
      duration: this.WAIT_TIME,
      isRunning: true,
      seed,
      hash,
    };

    const componentManager = ComponentManager.getComponentManager();

    // Create betting buttons
    const taiButtonId = `sicbo_tai_${sessionId}`;
    const xiuButtonId = `sicbo_xiu_${sessionId}`;
    const tripleButtonId = `sicbo_triple_${sessionId}`;

    const createButtonHandler = (betType: BetType) => {
      return async (
        btnInteraction:
          | ButtonInteraction
          | StringSelectMenuInteraction
          | ModalSubmitInteraction,
      ) => {
        if (!btnInteraction.isButton()) return;
        const playerId = btnInteraction.user.id;

        // Check if player already bet - no changing allowed
        if (session.players.has(playerId)) {
          const currentBet = session.players.get(playerId)!;
          await btnInteraction.reply({
            content: `❌ Bạn đã đặt **${currentBet.betLabel}** rồi! Không thể đổi cược!`,
            ephemeral: true,
          });
          return;
        }

        const betInfo = this.getBetInfo(betType);
        session.players.set(playerId, {
          oderId: playerId,
          odererTag: btnInteraction.user.tag,
          odererMention: `${btnInteraction.user}`,
          odererAvatar: btnInteraction.user.displayAvatarURL(),
          betType,
          betLabel: betInfo.label,
          multiplier: betInfo.multiplier,
        });

        await btnInteraction.reply({
          content: `✅ Bạn đã đặt **${betInfo.label}**! Chờ kết quả...`,
          ephemeral: true,
        });

        // Update the embed with new player count
        await this.updateLobbyEmbed(interaction, session);
      };
    };

    // Register button components
    componentManager.register([
      new ButtonComponentBuilder()
        .setCustomId(taiButtonId)
        .setUserCheck(['*'])
        .setTimeout(this.WAIT_TIME + 5000)
        .setHandler(createButtonHandler('tai'))
        .build(),
      new ButtonComponentBuilder()
        .setCustomId(xiuButtonId)
        .setUserCheck(['*'])
        .setTimeout(this.WAIT_TIME + 5000)
        .setHandler(createButtonHandler('xiu'))
        .build(),
      new ButtonComponentBuilder()
        .setCustomId(tripleButtonId)
        .setUserCheck(['*'])
        .setTimeout(this.WAIT_TIME + 5000)
        .setHandler(createButtonHandler('triple'))
        .build(),
    ]);

    // Create buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(taiButtonId)
        .setLabel('🔴 Tài (x2)')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(xiuButtonId)
        .setLabel('🔵 Xỉu (x2)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(tripleButtonId)
        .setLabel('🌟 Triple (x30)')
        .setStyle(ButtonStyle.Success),
    );

    // Send initial lobby embed
    const guildId = interaction.guildId || 'dm';
    const lobbyEmbed = this.createLobbyEmbed(
      session,
      interaction.user.tag,
      guildId,
    );

    const message = await interaction.reply({
      embeds: [lobbyEmbed],
      components: [row],
      fetchReply: true,
    });

    session.messageId = message.id;

    // Update countdown every 5 seconds
    const updateInterval = setInterval(async () => {
      if (!session.isRunning) {
        clearInterval(updateInterval);
        return;
      }
      await this.updateLobbyEmbed(interaction, session);
    }, this.UPDATE_INTERVAL);

    // Wait for betting period to end
    await this.sleep(this.WAIT_TIME);
    session.isRunning = false;
    clearInterval(updateInterval);

    // Unregister buttons
    componentManager.unregister(taiButtonId);
    componentManager.unregister(xiuButtonId);
    componentManager.unregister(tripleButtonId);

    // Check if anyone joined
    if (session.players.size === 0) {
      const noPlayersEmbed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('🎲 Sicbo - Hết giờ!')
        .setDescription('❌ Không có ai tham gia! Ván chơi đã bị hủy.')
        .setTimestamp();

      await interaction.editReply({
        embeds: [noPlayersEmbed],
        components: [],
      });
      return;
    }

    // Log game start with players
    const playerBets = Array.from(session.players.values());
    const taiPlayers = playerBets
      .filter(p => p.betType === 'tai')
      .map(p => p.odererTag)
      .join(', ');
    const xiuPlayers = playerBets
      .filter(p => p.betType === 'xiu')
      .map(p => p.odererTag)
      .join(', ');
    const triplePlayers = playerBets
      .filter(p => p.betType === 'triple')
      .map(p => p.odererTag)
      .join(', ');
    Log4TS.getLogger().info(
      `[Sicbo] Game starting | Players: ${session.players.size} | ` +
        `Tài: ${taiPlayers || 'None'} | ` +
        `Xỉu: ${xiuPlayers || 'None'} | ` +
        `Triple: ${triplePlayers || 'None'}`,
    );

    // Start rolling animation
    await this.runRollingAnimation(interaction, session, message);
  }

  private createLobbyEmbed(
    session: GameSession,
    hostTag: string,
    guildId: string,
  ): EmbedBuilder {
    const remainingTime = Math.max(
      0,
      Math.ceil((session.duration - (Date.now() - session.startTime)) / 1000),
    );

    const playerList = this.getPlayerList(session);
    const historyBoard = this.getHistoryBoard(guildId);

    return new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🎲 Sicbo - Tài Xỉu Multiplayer 🎲')
      .setDescription(
        `**Host:** ${hostTag}\n\n` +
          `## ⏳ Thời gian đặt cược: ${remainingTime}s\n\n` +
          'Nhấn nút bên dưới để đặt cược!\n\n' +
          '**Tỉ lệ thắng:**\n' +
          '🔴 **Tài (11-17):** x2\n' +
          '🔵 **Xỉu (4-10):** x2\n' +
          '🌟 **Triple:** x30\n\n' +
          `🔐 **MD5 Hash:** \`${session.hash}\`\n\n` +
          '---\n' +
          `**📊 Bảng cầu (${this.getHistoryStats(guildId)}):**\n${historyBoard}\n\n` +
          '---\n' +
          `**Người chơi (${session.players.size}):**\n${playerList || '*Chưa có ai tham gia*'}`,
      )
      .setFooter({text: '🎲 Chúc các bạn may mắn!'})
      .setTimestamp();
  }

  private getPlayerList(session: GameSession): string {
    if (session.players.size === 0) return '';

    const grouped = {
      tai: [] as string[],
      xiu: [] as string[],
      triple: [] as string[],
    };

    session.players.forEach(player => {
      grouped[player.betType].push(player.odererMention);
    });

    const lines: string[] = [];
    if (grouped.tai.length > 0) {
      lines.push(`🔴 **Tài:** ${grouped.tai.join(', ')}`);
    }
    if (grouped.xiu.length > 0) {
      lines.push(`🔵 **Xỉu:** ${grouped.xiu.join(', ')}`);
    }
    if (grouped.triple.length > 0) {
      lines.push(`🌟 **Triple:** ${grouped.triple.join(', ')}`);
    }

    return lines.join('\n');
  }

  private async updateLobbyEmbed(
    interaction: ChatInputCommandInteraction,
    session: GameSession,
  ): Promise<void> {
    try {
      const guildId = interaction.guildId || 'dm';
      const embed = this.createLobbyEmbed(
        session,
        interaction.user.tag,
        guildId,
      );
      await interaction.editReply({embeds: [embed]});
    } catch {
      // Message might be deleted or interaction expired
    }
  }

  private async runRollingAnimation(
    interaction: ChatInputCommandInteraction,
    session: GameSession,
    message: Message,
  ): Promise<void> {
    const loadingEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🎲 Sicbo - Đang lắc xúc xắc! 🎲')
      .setDescription(
        `**Người chơi:** ${session.players.size}\n\n` +
          `## ${this.rollingFrames[0]} Đang lắc... ${this.rollingFrames[0]}\n\n` +
          '```\n🎲  🎲  🎲\n```',
      );

    await interaction.editReply({
      embeds: [loadingEmbed],
      components: [],
    });

    // Rolling animation
    const totalFrames = 10;
    const frameDelay = 300;

    for (let i = 0; i < totalFrames; i++) {
      await this.sleep(frameDelay);

      const randomDice = [
        this.getRandomDice(),
        this.getRandomDice(),
        this.getRandomDice(),
      ];

      const frameEmoji = this.rollingFrames[i % this.rollingFrames.length];

      loadingEmbed.setDescription(
        `**Người chơi:** ${session.players.size}\n\n` +
          `## ${frameEmoji} Đang lắc... ${frameEmoji}\n\n` +
          `\`\`\`\n${randomDice.map(d => this.diceEmojis[d - 1]).join('  ')}\n\`\`\``,
      );

      await message.edit({embeds: [loadingEmbed]});
    }

    // Final result - use seed for deterministic dice
    const diceFromSeed = this.getDiceFromSeed(session.seed);
    const dice1 = diceFromSeed[0];
    const dice2 = diceFromSeed[1];
    const dice3 = diceFromSeed[2];
    const total = dice1 + dice2 + dice3;
    const isTriple = dice1 === dice2 && dice2 === dice3;
    const isTai = total >= 11 && total <= 17 && !isTriple;
    const isXiu = total >= 4 && total <= 10 && !isTriple;

    const resultType: 'tai' | 'xiu' | 'triple' = isTriple
      ? 'triple'
      : isTai
        ? 'tai'
        : 'xiu';

    // Calculate winners and losers
    const winners: PlayerBet[] = [];
    const losers: PlayerBet[] = [];

    session.players.forEach(player => {
      const won = this.checkPlayerWin(player.betType, isTriple, isTai, isXiu);
      if (won) {
        winners.push(player);
      } else {
        losers.push(player);
      }
    });

    const resultEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🎲 Sicbo - Kết quả! 🎲')
      .setDescription(
        '## 🎲 Kết quả 🎲\n\n' +
          `\`\`\`\n${this.diceEmojis[dice1 - 1]}  ${this.diceEmojis[dice2 - 1]}  ${this.diceEmojis[dice3 - 1]}\n\`\`\`\n` +
          `**Tổng: ${total}** ${isTriple ? '🌟 BA SỐ GIỐNG NHAU! 🌟' : ''}\n` +
          `**Kết quả: ${this.getResultLabel(resultType)}**\n\n` +
          '---\n\n' +
          `🎉 **Người thắng (${winners.length}):**\n` +
          `${winners.map(w => `${w.odererMention} (${w.betLabel} - x${w.multiplier})`).join('\n') || '*Không có*'}\n\n` +
          `💔 **Người thua (${losers.length}):**\n` +
          `${losers.map(l => `${l.odererMention} (${l.betLabel})`).join('\n') || '*Không có*'}\n\n` +
          '---\n' +
          `🔐 **Seed:** \`${session.seed}\`\n` +
          `🔒 **MD5:** \`${session.hash}\``,
      )
      .setFooter({text: '🎲 Xác minh: MD5(seed) = hash'})
      .setTimestamp();

    // Log the result
    Log4TS.getLogger().info(
      `[Sicbo] Result: ${this.getResultLabel(resultType)} | ` +
        `Dice: [${dice1}, ${dice2}, ${dice3}] = ${total} | ` +
        `Winners: ${winners.map(w => w.odererTag).join(', ') || 'None'} | ` +
        `Losers: ${losers.map(l => l.odererTag).join(', ') || 'None'}`,
    );

    // Add to history
    const guildId = interaction.guildId || 'dm';
    this.addToHistory(guildId, {
      result: resultType,
      dice: [dice1, dice2, dice3],
      total,
      timestamp: Date.now(),
    });

    await message.edit({embeds: [resultEmbed]});
  }

  private getHistoryBoard(guildId: string): string {
    const history = guildHistory.get(guildId) || [];
    if (history.length === 0) {
      return '*Chưa có lịch sử*';
    }

    // Display last 20 results in rows of 10
    const symbols = history.map(h => {
      if (h.result === 'triple') return '🌟';
      if (h.result === 'tai') return '🔴';
      return '🔵';
    });

    // Split into rows of 10
    const rows: string[] = [];
    for (let i = 0; i < symbols.length; i += 10) {
      rows.push(symbols.slice(i, i + 10).join(' '));
    }

    return rows.join('\n');
  }

  private getHistoryStats(guildId: string): string {
    const history = guildHistory.get(guildId) || [];
    if (history.length === 0) {
      return '0 ván';
    }

    const taiCount = history.filter(h => h.result === 'tai').length;
    const xiuCount = history.filter(h => h.result === 'xiu').length;
    const tripleCount = history.filter(h => h.result === 'triple').length;

    return `${history.length} ván | 🔴${taiCount} - 🔵${xiuCount} - 🌟${tripleCount}`;
  }

  private addToHistory(guildId: string, result: GameResult): void {
    if (!guildHistory.has(guildId)) {
      guildHistory.set(guildId, []);
    }

    const history = guildHistory.get(guildId)!;
    history.push(result);

    // Keep only last MAX_HISTORY results
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }
  }

  private getBetInfo(betType: BetType): {label: string; multiplier: number} {
    switch (betType) {
      case 'tai':
        return {label: '🔴 Tài (11-17)', multiplier: 2};
      case 'xiu':
        return {label: '🔵 Xỉu (4-10)', multiplier: 2};
      case 'triple':
        return {label: '🌟 Triple', multiplier: 30};
    }
  }

  private getResultLabel(resultType: 'tai' | 'xiu' | 'triple'): string {
    switch (resultType) {
      case 'tai':
        return '🔴 TÀI';
      case 'xiu':
        return '🔵 XỈU';
      case 'triple':
        return '🌟 TRIPLE';
    }
  }

  private checkPlayerWin(
    betType: BetType,
    isTriple: boolean,
    isTai: boolean,
    isXiu: boolean,
  ): boolean {
    if (betType === 'triple') return isTriple;
    if (isTriple) return false; // Triple beats both tai and xiu
    if (betType === 'tai') return isTai;
    if (betType === 'xiu') return isXiu;
    return false;
  }

  private getRandomDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  private getDiceFromSeed(seed: string): [number, number, number] {
    // Create deterministic hash from seed
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    // Use first 6 characters for each dice (2 hex chars = 0-255 range)
    const dice1 = (parseInt(hash.substring(0, 2), 16) % 6) + 1;
    const dice2 = (parseInt(hash.substring(2, 4), 16) % 6) + 1;
    const dice3 = (parseInt(hash.substring(4, 6), 16) % 6) + 1;
    
    return [dice1, dice2, dice3];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
