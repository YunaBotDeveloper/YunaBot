import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  subtext,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';
import {
  getCouple,
  calcLevel,
  expForLevel,
  COUPLE_EXP_CONFIG,
  getGMT7DateString,
} from '../../../../util/CoupleHelper';
import CoupleActivity from '../../../../database/models/CoupleActivity.model';

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function progressBar(current: number, max: number, length = 10): string {
  const filled = Math.round((current / max) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

export default class CoupleCommand extends Command {
  constructor() {
    super('couple', 'Xem thông tin couple của bạn');

    this.advancedOptions.cooldown = 3000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');

    await interaction.editReply({
      components: [StatusContainer.loading(loadingEmoji)],
      flags: [MessageFlags.IsComponentsV2],
    });

    const guildId = interaction.guild!.id;
    const couple = await getCouple(interaction.user.id, guildId);

    if (!couple) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(failedEmoji, 'Bạn chưa có người yêu!'),
        ],
      });
      return;
    }

    const partnerId =
      couple.user1Id === interaction.user.id ? couple.user2Id : couple.user1Id;

    const days = daysSince(couple.marriedAt);
    const level = calcLevel(couple.exp);
    const currentLevelExp = expForLevel(level);
    const nextLevelExp = expForLevel(level + 1);
    const expInLevel = couple.exp - currentLevelExp;
    const expNeeded = nextLevelExp - currentLevelExp;
    const bar = progressBar(expInLevel, expNeeded);

    const today = getGMT7DateString();
    const activity = await CoupleActivity.findOne({
      where: {userId: interaction.user.id, guildId},
    });

    const kissUsed =
      activity && activity.lastResetDate === today ? activity.kissCount : 0;
    const hugUsed =
      activity && activity.lastResetDate === today ? activity.hugCount : 0;
    const patUsed =
      activity && activity.lastResetDate === today ? activity.patCount : 0;

    const kissLimit = COUPLE_EXP_CONFIG.kiss.dailyLimit;
    const hugLimit = COUPLE_EXP_CONFIG.hug.dailyLimit;
    const patLimit = COUPLE_EXP_CONFIG.pat.dailyLimit;

    const container = new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(t =>
        t.setContent(
          `## 💑 ${userMention(interaction.user.id)} & ${userMention(partnerId)}`,
        ),
      )
      .addTextDisplayComponents(t =>
        t.setContent(subtext(`Đã bên nhau được **${days}** ngày`)),
      )
      .addSeparatorComponents(s => s)
      .addTextDisplayComponents(t =>
        t.setContent(
          `**Cấp độ:** ${level}\n**EXP:** ${couple.exp} (${expInLevel}/${expNeeded})\n\`${bar}\``,
        ),
      )
      .addSeparatorComponents(s => s)
      .addTextDisplayComponents(t =>
        t.setContent(
          [
            '**Tương tác hôm nay:**',
            `💋 Hôn: ${kissUsed}/${kissLimit} (+${COUPLE_EXP_CONFIG.kiss.exp} EXP mỗi lần)`,
            `🤗 Ôm: ${hugUsed}/${hugLimit} (+${COUPLE_EXP_CONFIG.hug.exp} EXP mỗi lần)`,
            `🤚 Xoa đầu: ${patUsed}/${patLimit} (+${COUPLE_EXP_CONFIG.pat.exp} EXP mỗi lần)`,
          ].join('\n'),
        ),
      )
      .addTextDisplayComponents(t =>
        t.setContent(subtext('Reset lúc 0:00 GMT+7 • Cooldown 1 giờ mỗi lần')),
      );

    await interaction.editReply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  }
}
