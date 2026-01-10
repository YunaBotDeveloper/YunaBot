import {
  ButtonInteraction,
  ButtonStyle,
  channelMention,
  ChannelType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  subtext,
  TextChannel,
  time,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import {EmbedColors} from '../../../../util/EmbedColors';
import ExtendedClient from '../../../../classes/ExtendedClient';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import NukeLog from '../../../../database/models/NukeLog.model';
import GuildLog from '../../../../database/models/GuildLog.model';
import {nanoid} from 'nanoid';

export default class NukeCommand extends Command {
  constructor() {
    super('nuke', 'Tạo lại kênh');

    this.advancedOptions.cooldown = 30000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

    this.data.addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('kênh chỉ định')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false),
    );

    this.data.addStringOption(option =>
      option
        .setName('reason')
        .setDescription('lý do tạo lại kênh')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply({
      flags: [MessageFlags.Ephemeral],
    });

    const client = interaction.client as ExtendedClient;
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    let logChannelId: string | undefined = undefined;

    const reason =
      interaction.options.getString('reason', false) ||
      `Tạo lại kênh | Người thực hiện: ${interaction.user.displayName} (${interaction.user.id})`;
    if (interaction.user.bot) {
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

      await interaction.editReply({
        components: [noBotPermContainer],
      });

      return;
    }

    const ruleChannelId = guild.rulesChannelId;
    const publicUpdateChannelId = guild.publicUpdatesChannelId;

    if (!ruleChannelId) {
      return;
    }

    const channel =
      interaction.options.getChannel('channel', false, [
        ChannelType.GuildAnnouncement,
        ChannelType.GuildText,
      ]) || interaction.channel;

    if (!channel) {
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

        await interaction.editReply({
          components: [invaildChannelContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }
    }

    if (
      !(
        channel?.type === ChannelType.GuildAnnouncement ||
        channel?.type === ChannelType.GuildText
      ) ||
      channel.id === ruleChannelId
    ) {
      const invaildChannelContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(`## ${failedEmoji} Lỗi: Kênh không hợp lệ!`),
        );
      await interaction.editReply({
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
              .setCustomId('confirm')
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
              .setCustomId('reject')
              .setLabel('❌')
              .setStyle(ButtonStyle.Success),
          ),
      );

    await interaction.editReply({
      components: [confirmContainer],
      flags: [MessageFlags.IsComponentsV2],
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
        await interaction.editReply({
          components: [timeoutContainer],
        });
      } catch {
        //
      }
    };

    ComponentManager.getComponentManager().register([
      {
        customId: 'confirm',
        timeout: timeout,
        onTimeout: onTimeout,
        handler: async (interaction: ButtonInteraction): Promise<void> => {
          ComponentManager.getComponentManager().unregisterMany([
            'confirm',
            'reject',
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

          const confirmContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.blue())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `## ${infoEmoji} Kênh này đã được tạo lại bởi ${userMention(interaction.user.id)}`,
              ),
            );
          await newChannel.send({
            components: [confirmContainer],
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

          if (!guildLog || !guildLog.nukeLogId) {
            return;
          }

          logChannelId = guildLog?.nukeLogId;

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
        userCheck: [interaction.user.id],
      },
      {
        customId: 'reject',
        timeout: timeout,
        onTimeout: onTimeout,
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany([
            'confirm',
            'reject',
          ]);

          await interaction.deferUpdate();
          await interaction.deleteReply();

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
    ]);
  }
}
