import {
  ButtonStyle,
  ContainerBuilder,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  subtext,
  TimestampStyles,
  userMention,
  time,
} from 'discord.js';
import {PrefixCommand} from '../../../PrefixCommand';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class BanCommand extends PrefixCommand {
  constructor() {
    super('ban', []);

    this.cooldown = 30000;
  }

  async run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ) {
    const {message, client} = context;
    const guild = message.guild;

    if (!guild || !client.user) {
      return;
    }

    const userExecute = await guild.members
      .fetch(message.author.id)
      .catch(() => null);
    if (!userExecute?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return;
    }

    const bot = await guild.members.fetch(client.user.id).catch(() => null);
    if (!bot?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return;
    }

    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const loadingContainer = StatusContainer.loading(loadingEmoji);

    const ogmessage = await message.reply({
      content: '',
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    let targetUserId: string | undefined;
    const userInput = args[0];

    if (userInput) {
      const mentionMatch = userInput.match(/^<@!?(\d+)>$/);
      if (mentionMatch) {
        targetUserId = mentionMatch[1];
      } else if (/^\d+$/.test(userInput)) {
        targetUserId = userInput;
      } else {
        const normalizedInput = userInput.toLowerCase();
        const foundMember = guild.members.cache.find(
          member =>
            member.user.username.toLowerCase() === normalizedInput ||
            member.user.tag.toLowerCase() === normalizedInput ||
            member.displayName.toLowerCase() === normalizedInput,
        );
        if (foundMember) {
          targetUserId = foundMember.user.id;
        }
      }

      if (!targetUserId) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          'Người dùng không hợp lệ',
        );

        await ogmessage.edit({
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2],
        });

        return;
      }
    } else {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Không có người dùng nào để cấm!',
      );

      await ogmessage.edit({
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      return;
    }

    const targetUser = await client.users.fetch(targetUserId).catch(() => {});
    if (!targetUser) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Người dùng không hợp lệ!',
      );

      await ogmessage.edit({
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      return;
    }

    if (targetUser.id === message.author.id) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Bạn không thể cấm chính bạn!',
      );

      await ogmessage.edit({
        components: [errorContainer],
        flags: [MessageFlags.IsComponentsV2],
      });

      return;
    }

    const reason =
      args.slice(1).join(' ').trim() || `Banned by ${message.author.username}`;

    const targetMember = await guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (targetMember) {
      const roleComparisonUser = targetMember.roles.highest.comparePositionTo(
        userExecute.roles.highest,
      );

      const roleComparisonBot = targetMember.roles.highest.comparePositionTo(
        bot.roles.highest,
      );

      if (roleComparisonUser >= 0) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          'Bạn không thể ban người dùng có role cao hơn hoặc bằng bạn!',
        );

        await ogmessage.edit({
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2],
        });

        return;
      }

      if (roleComparisonBot >= 0) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          'Bot không thể ban người dùng có role cao hơn hoặc bằng bot!',
        );

        await ogmessage.edit({
          components: [errorContainer],
          flags: [MessageFlags.IsComponentsV2],
        });

        return;
      }
    }

    const componentsId: string[] = [
      `confirmBanPrefix_${message.id}`,
      `cancelBanPrefix_${message.id}`,
    ];

    const expireAt = new Date(Date.now() + 10000);

    const banConfirmContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Bạn có chắc chắn muốn cấm ${userMention(targetUser.id)} khỏi máy chủ?`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .setButtonAccessory(button =>
            button
              .setCustomId(componentsId[0])
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          )
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Vui lòng bấm nút này để thực hiện.'),
            ),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .setButtonAccessory(button =>
            button
              .setCustomId(componentsId[1])
              .setLabel('❌')
              .setStyle(ButtonStyle.Success),
          )
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Vui lòng bấm nút này để huỷ bỏ.')),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `Lệnh của bạn sẽ hết hạn sau ${time(expireAt, TimestampStyles.RelativeTime)}`,
          ),
        ),
      );

    await ogmessage.edit({
      components: [banConfirmContainer],
      flags: [MessageFlags.IsComponentsV2],
    });
  }
}
