import {Op} from 'sequelize';
import Couple from '../database/models/Couple.model';
import CoupleActivity from '../database/models/CoupleActivity.model';

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
const COOLDOWN_MS = 60 * 60 * 1000;

export const COUPLE_EXP_CONFIG = {
  kiss: {exp: 15, dailyLimit: 5},
  hug: {exp: 10, dailyLimit: 10},
  pat: {exp: 5, dailyLimit: 15},
} as const;

export type CoupleActionType = keyof typeof COUPLE_EXP_CONFIG;

export function getGMT7DateString(): string {
  const gmt7 = new Date(Date.now() + GMT7_OFFSET_MS);
  return gmt7.toISOString().split('T')[0];
}

export function calcLevel(exp: number): number {
  return Math.floor(Math.sqrt(exp / 100));
}

export function expForLevel(level: number): number {
  return level * level * 100;
}

export async function getCouple(
  userId: string,
  guildId: string,
): Promise<Couple | null> {
  return Couple.findOne({
    where: {
      guildId,
      [Op.or]: [{user1Id: userId}, {user2Id: userId}],
    },
  });
}

export async function isInCouple(
  userId: string,
  guildId: string,
): Promise<boolean> {
  return (await getCouple(userId, guildId)) !== null;
}

export interface ExpAwardResult {
  awarded: boolean;
  expGained: number;
  totalExp: number;
  level: number;
  reason?: 'daily_limit' | 'cooldown' | 'not_partner';
  cooldownRemainingMs?: number;
}

export function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes} phút ${seconds} giây`;
  return `${seconds} giây`;
}

export async function tryAwardCoupleExp(
  actorId: string,
  targetId: string,
  guildId: string,
  action: CoupleActionType,
): Promise<ExpAwardResult> {
  const couple = await getCouple(actorId, guildId);
  if (!couple) {
    return {awarded: false, expGained: 0, totalExp: 0, level: 0};
  }

  const partnerId =
    couple.user1Id === actorId ? couple.user2Id : couple.user1Id;
  if (partnerId !== targetId) {
    return {
      awarded: false,
      expGained: 0,
      totalExp: couple.exp,
      level: couple.level,
      reason: 'not_partner',
    };
  }

  const today = getGMT7DateString();
  const [activity] = await CoupleActivity.findOrCreate({
    where: {userId: actorId, guildId},
    defaults: {
      userId: actorId,
      guildId,
      kissCount: 0,
      hugCount: 0,
      patCount: 0,
      lastKissAt: null,
      lastHugAt: null,
      lastPatAt: null,
      lastResetDate: today,
    },
  });

  if (activity.lastResetDate !== today) {
    await activity.update({
      kissCount: 0,
      hugCount: 0,
      patCount: 0,
      lastResetDate: today,
    });
  }

  const config = COUPLE_EXP_CONFIG[action];
  const countField = `${action}Count` as 'kissCount' | 'hugCount' | 'patCount';
  const lastAtField =
    `last${action.charAt(0).toUpperCase() + action.slice(1)}At` as
      | 'lastKissAt'
      | 'lastHugAt'
      | 'lastPatAt';

  if (activity[countField] >= config.dailyLimit) {
    return {
      awarded: false,
      expGained: 0,
      totalExp: couple.exp,
      level: couple.level,
      reason: 'daily_limit',
    };
  }

  const lastAt = activity[lastAtField];
  if (lastAt) {
    const elapsed = Date.now() - new Date(lastAt).getTime();
    if (elapsed < COOLDOWN_MS) {
      return {
        awarded: false,
        expGained: 0,
        totalExp: couple.exp,
        level: couple.level,
        reason: 'cooldown',
        cooldownRemainingMs: COOLDOWN_MS - elapsed,
      };
    }
  }

  await activity.update({
    [countField]: activity[countField] + 1,
    [lastAtField]: new Date(),
  });

  const newExp = couple.exp + config.exp;
  const newLevel = calcLevel(newExp);
  await couple.update({exp: newExp, level: newLevel});

  return {
    awarded: true,
    expGained: config.exp,
    totalExp: newExp,
    level: newLevel,
  };
}
