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
import {Command} from '../../Command';
import {EmbedColors} from '../../../util/EmbedColors';
import ExtendedClient from '../../../classes/ExtendedClient';
import ComponentManager from '../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../enum/ComponentEnum';
import Config from '../../../config/Config';
import Log4TS from '../../../logger/Log4TS';

export default class NukeCommand extends Command {
  constructor() {
    super('nuke', 'Tạo lại kênh');

    this.advancedOptions.cooldown = 30000;

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
    const client = interaction.client as ExtendedClient;
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const logging = Log4TS.getLogger();
    const logChannelId: string | undefined =
      Config.getInstance().nukeLogChannel;

    const reason =
      interaction.options.getString('reason', false) ||
      `Tạo lại kênh | Người thực hiện: ${interaction.user.displayName} (${interaction.user.id})`;
    if (interaction.user.bot) {
      return;
    }

    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)
    ) {
      const noPermissionContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${failedEmoji} Lỗi: Bạn không có quyền để sử dụng lệnh này!`,
          ),
        );

      await interaction.reply({
        components: [noPermissionContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });

      return;
    }

    const botMember = interaction.guild?.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const noBotPermContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.red())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${failedEmoji} Lỗi: Bot không có quyền quản lý kênh!`,
          ),
        );

      await interaction.reply({
        components: [noBotPermContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });

      return;
    }

    const ruleChannelId = interaction.guild?.rulesChannelId;
    const publicUpdateChannelId = interaction.guild?.publicUpdatesChannelId;

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

        await interaction.reply({
          components: [invaildChannelContainer],
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
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
      await interaction.reply({
        components: [invaildChannelContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
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
    const ogMsg = await interaction.reply({
      components: [confirmContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
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
          await ogMsg.delete();
          await channel.delete(reason);
          const newChannel = await interaction.guild?.channels.create({
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

          if (!logChannelId) {
            return;
          }

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

          const logChannel = (await newChannel.guild.channels.fetch(
            logChannelId,
          )) as TextChannel | null;

          if (logChannel) {
            await logChannel.send({
              components: [logContainer],
              flags: MessageFlags.IsComponentsV2,
              allowedMentions: {users: []},
            });
          } else {
            logging.error('Nuke logging channel not found!');
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
        handler: async () => {
          ComponentManager.getComponentManager().unregisterMany([
            'confirm',
            'reject',
          ]);

          await ogMsg.delete();

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
    ]);
  }
}
