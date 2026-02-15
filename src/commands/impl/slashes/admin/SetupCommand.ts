import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
} from 'discord.js';
import {Command} from '../../../Command';
import {StatusContainer} from '../../../../util/StatusContainer';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {EmbedColors} from '../../../../util/EmbedColors';
import GuildLog from '../../../../database/models/GuildLog.model';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {t, tMap} from '../../../../locale';

export default class SetupCommand extends Command {
  constructor() {
    super('setup', t('setup.description'));

    this.data.setDescriptionLocalizations(tMap('setup.description'));

    this.advancedOptions.cooldown = 30000;

    this.data.addSubcommand(subcommand =>
      subcommand
        .setName('log')
        .setDescription(t('setup.subcommand.log'))
        .setDescriptionLocalizations(tMap('setup.subcommand.log')),
    );

    this.data.addSubcommand(subcommand =>
      subcommand
        .setName('verify')
        .setDescription(t('setup.subcommand.verify'))
        .setDescriptionLocalizations(tMap('setup.subcommand.verify')),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const manageServerEmoji =
      await client.api.emojiAPI.getEmojiByName('manage');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');

    const loadingContainer = StatusContainer.loading(loadingEmoji);

    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'log': {
        let guildLog = await GuildLog.findOne({
          where: {guildId: interaction.guildId!},
        });

        if (!guildLog) {
          guildLog = await GuildLog.create({
            guildId: interaction.guildId!,
            nukeLogId: null,
            messageDeleteLogId: null,
          });
        }

        // Track pending selections in memory
        const pending: {
          nukeLogId: string | null;
          messageDeleteLogId: string | null;
        } = {
          nukeLogId: guildLog.nukeLogId,
          messageDeleteLogId: guildLog.messageDeleteLogId,
        };

        // --- Build channel selects ---
        const nukeLogSelect = new ChannelSelectMenuBuilder()
          .setCustomId('setup-log-nuke')
          .setChannelTypes(ChannelType.GuildText)
          .setMaxValues(1)
          .setMinValues(0)
          .setPlaceholder('Chọn kênh nhật ký tạo lại kênh');

        if (guildLog.nukeLogId) {
          const ch = await interaction.guild?.channels
            .fetch(guildLog.nukeLogId)
            .catch(() => null);
          if (ch && ch.type === ChannelType.GuildText) {
            nukeLogSelect.setDefaultChannels(guildLog.nukeLogId);
          } else {
            guildLog.nukeLogId = null;
            pending.nukeLogId = null;
            await guildLog.save();
          }
        }

        const msgDeleteLogSelect = new ChannelSelectMenuBuilder()
          .setCustomId('setup-log-msgdelete')
          .setChannelTypes(ChannelType.GuildText)
          .setMaxValues(1)
          .setMinValues(0)
          .setPlaceholder('Chọn kênh nhật ký xoá tin nhắn');

        if (guildLog.messageDeleteLogId) {
          const ch = await interaction.guild?.channels
            .fetch(guildLog.messageDeleteLogId)
            .catch(() => null);
          if (ch && ch.type === ChannelType.GuildText) {
            msgDeleteLogSelect.setDefaultChannels(guildLog.messageDeleteLogId);
          } else {
            guildLog.messageDeleteLogId = null;
            pending.messageDeleteLogId = null;
            await guildLog.save();
          }
        }

        // --- Build panel ---
        const logPanelContainer = new ContainerBuilder()
          .setAccentColor(EmbedColors.yellow())
          .addTextDisplayComponents(td =>
            td.setContent(`## ${manageServerEmoji} Cài đặt kênh nhật ký`),
          )
          .addSeparatorComponents(s => s)
          .addTextDisplayComponents(td =>
            td.setContent('**Nhật ký tạo lại kênh**'),
          )
          .addActionRowComponents<ChannelSelectMenuBuilder>(row =>
            row.addComponents(nukeLogSelect),
          )
          .addSeparatorComponents(s => s)
          .addTextDisplayComponents(td =>
            td.setContent('**Nhật ký xoá tin nhắn**'),
          )
          .addActionRowComponents<ChannelSelectMenuBuilder>(row =>
            row.addComponents(msgDeleteLogSelect),
          )
          .addSeparatorComponents(s => s)
          .addActionRowComponents<ButtonBuilder>(row =>
            row.addComponents(
              new ButtonBuilder()
                .setCustomId('setup-log-save')
                .setLabel('Lưu')
                .setStyle(ButtonStyle.Success),
            ),
          );

        await interaction.editReply({components: [logPanelContainer]});

        // --- Timeout helper ---
        const componentIds = [
          'setup-log-nuke',
          'setup-log-msgdelete',
          'setup-log-save',
        ];

        const timeoutContainer = StatusContainer.failed(
          failedEmoji,
          'Đã hết thời gian chờ, vui lòng thử lại!',
        );

        const cleanupAll = () => {
          ComponentManager.getComponentManager().unregisterMany(componentIds);
        };

        const onTimeout = async () => {
          cleanupAll();
          await interaction.editReply({
            components: [timeoutContainer],
          });
        };

        // --- Register components ---
        ComponentManager.getComponentManager().register([
          {
            customId: 'setup-log-nuke',
            timeout: 120000,
            onTimeout,
            handler: async (menuInteraction: ChannelSelectMenuInteraction) => {
              pending.nukeLogId = menuInteraction.values[0] ?? null;
              await menuInteraction.deferUpdate();
            },
            type: ComponentEnum.MENU,
            userCheck: [interaction.user.id],
          },
          {
            customId: 'setup-log-msgdelete',
            timeout: 120000,
            onTimeout,
            handler: async (menuInteraction: ChannelSelectMenuInteraction) => {
              pending.messageDeleteLogId = menuInteraction.values[0] ?? null;
              await menuInteraction.deferUpdate();
            },
            type: ComponentEnum.MENU,
            userCheck: [interaction.user.id],
          },
          {
            customId: 'setup-log-save',
            timeout: 120000,
            onTimeout,
            handler: async (btnInteraction: ButtonInteraction) => {
              cleanupAll();

              await btnInteraction.update({
                components: [loadingContainer],
              });

              let log = await GuildLog.findOne({
                where: {guildId: btnInteraction.guildId!},
              });

              if (!log) {
                log = await GuildLog.create({
                  guildId: btnInteraction.guildId!,
                  nukeLogId: null,
                  messageDeleteLogId: null,
                });
              }

              log.nukeLogId = pending.nukeLogId;
              log.messageDeleteLogId = pending.messageDeleteLogId;
              await log.save();

              // Build summary
              const lines: string[] = [];
              if (pending.nukeLogId) {
                lines.push(`- Nhật ký tạo lại kênh: <#${pending.nukeLogId}>`);
              }
              if (pending.messageDeleteLogId) {
                lines.push(
                  `- Nhật ký xoá tin nhắn: <#${pending.messageDeleteLogId}>`,
                );
              }

              const summary =
                lines.length > 0
                  ? `Đã lưu cài đặt nhật ký!\n${lines.join('\n')}`
                  : 'Đã xoá tất cả kênh nhật ký!';

              const resultContainer = StatusContainer.success(
                successEmoji,
                summary,
              );

              await btnInteraction.editReply({
                components: [resultContainer],
              });
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
        ]);

        break;
      }
    }
  }
}
