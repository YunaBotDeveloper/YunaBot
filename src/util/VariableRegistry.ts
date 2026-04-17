import {User, Guild} from 'discord.js';

interface ParseContext {
  user: User;
  guild: Guild;
}

export const getTemplateTokens = (
  context: ParseContext,
): Record<string, string> => {
  const {user, guild} = context;
  const isAnimatedAvatar = user.avatar?.startsWith('a_') ?? false;

  return {
    '${user.tag}': user.username,
    '${user.id}': user.id,
    '${user.mention}': `<@${user.id}>`,
    '${user.displayName}': user.displayName,
    '${user.avatar}': user.displayAvatarURL({
      extension: isAnimatedAvatar ? 'gif' : 'png',
      size: 1024,
    }),
    '${user.createdAt}': `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,

    '${server.name}': guild.name,
    '${server.id}': guild.id,
    '${server.icon}': guild.iconURL() ?? '',
    '${server.memberCount}': guild.memberCount.toLocaleString('en-US'),
    '${server.boostCount}': (
      guild.premiumSubscriptionCount ?? 0
    ).toLocaleString('en-US'),
    '${server.boostLevel}': guild.premiumTier.toString(),
  };
};
