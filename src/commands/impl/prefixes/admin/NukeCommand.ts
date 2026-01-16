import {PrefixCommand} from '../../../PrefixCommand';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {
  ButtonInteraction,
  ButtonStyle,
  channelMention,
  ChannelType,
  ContainerBuilder,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  subtext,
  TextChannel,
  time,
  userMention,
} from 'discord.js';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import NukeLog from '../../../../database/models/NukeLog.model';
import GuildLog from '../../../../database/models/GuildLog.model';
import {nanoid} from 'nanoid';

export default class NukeCommand extends PrefixCommand {
  constructor() {
    super('nuke', [], 1);
  }

  async run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ) {
    const {message, client} = context;
    const guild = message.guild;
    if (!guild) return;

    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    let logChannelId: string | undefined = undefined;

    const member = message.member;
    if (!member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const noPermContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${failedEmoji} Lỗi: Bạn không có quyền quản lý kênh!`,
          ),
        );

      await message.reply({
        components: [noPermContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    let channelInput = args[0];
    let targetChannel: TextChannel | null = null;
    let isChannelSpecified = false;

    if (channelInput) {
      const mentionMatch = channelInput.match(/^<#(\d+)>$/);
      if (mentionMatch) {
        channelInput = mentionMatch[1];
        isChannelSpecified = true;
      } else if (/^\d+$/.test(channelInput)) {
        isChannelSpecified = true;
      }

      if (isChannelSpecified) {
        const fetchedChannel = await guild.channels
          .fetch(channelInput)
          .catch(() => null);

        if (!fetchedChannel) {
          const invalidChannelContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.red())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `## ${failedEmoji} Lỗi: Không tìm thấy kênh!`,
              ),
            );

          await message.reply({
            components: [invalidChannelContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }

        if (
          fetchedChannel.type !== ChannelType.GuildText &&
          fetchedChannel.type !== ChannelType.GuildAnnouncement
        ) {
          const invalidTypeContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.red())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `## ${failedEmoji} Lỗi: Kênh không hợp lệ! Chỉ hỗ trợ kênh văn bản hoặc kênh thông báo.`,
              ),
            );

          await message.reply({
            components: [invalidTypeContainer],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }

        targetChannel = fetchedChannel as TextChannel;
      }
    }

    const channel = targetChannel || (message.channel as TextChannel);

    await channel.sendTyping();

    const reason =
      args.slice(isChannelSpecified ? 1 : 0).join(' ') ||
      `Tạo lại kênh | Người thực hiện: ${message.author.displayName} (${message.author.id})`;

    if (message.author.bot) {
      return;
    }

    const botMember = guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const noBotPermContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${failedEmoji} Lỗi: Bot không có quyền quản lý kênh!`,
          ),
        );

      await message.reply({
        components: [noBotPermContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const ruleChannelId = guild.rulesChannelId;
    const publicUpdateChannelId = guild.publicUpdatesChannelId;

    if (!ruleChannelId) {
      return;
    }

    if (publicUpdateChannelId) {
      if (publicUpdateChannelId === channel.id) {
        const invaildChannelContainer = new ContainerBuilder()
          .setAccentColor(EmbedColors.red())
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `## ${failedEmoji} Lỗi: Kênh này không thể xoá!`,
            ),
          );

        await message.reply({
          components: [invaildChannelContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
    }

    if (
      !(
        channel?.type === ChannelType.GuildText ||
        channel?.type === ChannelType.GuildAnnouncement
      ) ||
      channel.id === ruleChannelId
    ) {
      const invaildChannelContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`## ${failedEmoji} Lỗi: Kênh không hợp lệ!`),
        );
      await message.reply({
        components: [invaildChannelContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const channelName = channel.name;
    const channelParent = channel.parent;
    const channelType = channel.type;
    const channelPerms = channel.permissionOverwrites.cache.map(overwrite => ({
      id: overwrite.id,
      allow: overwrite.allow,
      deny: overwrite.deny,
      type: overwrite.type,
    }));
    const isChannelNsfw = channel.nsfw;
    const channelPos = channel.position;
    const channelRateLimitPerUser = channel.rateLimitPerUser;

    const confirmContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Bạn có chắc chắn muốn tạo lại kênh ${channelMention(channel.id)}?`,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Vui lòng bấm nút này để thực hiện.'),
            ),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId('prefix_nuke_confirm')
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(subtext('Vui lòng bẩm nút này để huỷ bỏ.')),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId('prefix_nuke_reject')
              .setLabel('❌')
              .setStyle(ButtonStyle.Success),
          ),
      );

    const confirmMessage = await message.reply({
      components: [confirmContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    const timeout = 10000;

    const onTimeout = async () => {
      try {
        const timeoutContainer = new ContainerBuilder()
          .setAccentColor(EmbedColors.red())
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              `## ${failedEmoji} Đã hết thời gian! Vui lòng thử lại.`,
            ),
          );
        await confirmMessage.edit({
          components: [timeoutContainer],
        });
      } catch {
        //
      }
    };

    ComponentManager.getComponentManager().register([
      {
        customId: 'prefix_nuke_confirm',
        timeout: timeout,
        onTimeout: onTimeout,
        handler: async (interaction: ButtonInteraction): Promise<void> => {
          ComponentManager.getComponentManager().unregisterMany([
            'prefix_nuke_confirm',
            'prefix_nuke_reject',
          ]);

          await interaction.deferUpdate();
          const successContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.green())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(`## ${successEmoji} Thao tác thành công!`),
            );
          await interaction.editReply({components: [successContainer]});
          await channel.delete(reason);
          const newChannel = await guild.channels.create({
            name: channelName,
            type: channelType,
            parent: channelParent,
            nsfw: isChannelNsfw,
            rateLimitPerUser: channelRateLimitPerUser || 0,
            permissionOverwrites: channelPerms,
          });

          if (!newChannel) {
            return;
          }

          await newChannel.setPosition(channelPos);

          const nukeSuccessContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.blue())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `## ${infoEmoji} Kênh này đã được tạo lại bởi ${userMention(interaction.user.id)}`,
              ),
            );
          await newChannel.send({
            components: [nukeSuccessContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          const nukeLog = new NukeLog({
            guildId: channel.guild.id,
            id: `#${nanoid(5)}`,
            channelId: channel.id,
            userId: interaction.user.id,
            reason: reason,
            time: Math.round(Date.now()),
          });

          await nukeLog.save();

          const guildLog = await GuildLog.findOne({
            where: {guildId: guild.id},
          });

          if (!guildLog || !guildLog?.nukeLogId) {
            return;
          }

          logChannelId = guildLog.nukeLogId;

          const now = Math.round(Date.now() / 1000);

          const logContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.green())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `## ${successEmoji} Tạo lại kênh thành công!`,
              ),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `Kênh tạo lại: ${channelMention(newChannel.id)}`,
              ),
            )
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `Người thực hiện: ${userMention(interaction.user.id)} (${interaction.user.id})`,
              ),
            )
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(`Lý do: ${reason}`),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext(`Được thực hiện vào ${time(now)}`),
              ),
            );

          const nukeLogChannel = (await newChannel.guild.channels.fetch(
            logChannelId,
          )) as TextChannel | null;

          if (nukeLogChannel) {
            await nukeLogChannel.send({
              components: [logContainer],
              flags: MessageFlags.IsComponentsV2,
              allowedMentions: {users: []},
            });
          } else {
            return;
          }

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [message.author.id],
      },
      {
        customId: 'prefix_nuke_reject',
        timeout: timeout,
        onTimeout: onTimeout,
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany([
            'prefix_nuke_confirm',
            'prefix_nuke_reject',
          ]);

          await interaction.deferUpdate();
          await confirmMessage.delete();

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [message.author.id],
      },
    ]);
  }
}
