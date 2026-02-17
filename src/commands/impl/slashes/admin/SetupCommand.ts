import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {Command} from '../../../Command';
import {StatusContainer} from '../../../../util/StatusContainer';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {EmbedColors} from '../../../../util/EmbedColors';
import GuildLog from '../../../../database/models/GuildLog.model';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {t, tMap} from '../../../../locale';
import PrefixManager from '../../../PrefixManager';

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
        .setName('prefix')
        .setDescription(t('setup.subcommand.prefix'))
        .setDescriptionLocalizations(tMap('setup.subcommand.prefix')),
    );

    this.data.addSubcommand(subcommand =>
      subcommand
        .setName('verify')
        .setDescription(t('setup.subcommand.verify'))
        .setDescriptionLocalizations(tMap('setup.subcommand.verify')),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = interaction.locale;

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const manageServerEmoji =
      await client.api.emojiAPI.getEmojiByName('manage');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');

    const loadingContainer = StatusContainer.loading(locale, loadingEmoji);

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
          .setPlaceholder(t('setup.log.nuke_placeholder', locale));

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
          .setPlaceholder(t('setup.log.msgdelete_placeholder', locale));

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
            td.setContent(
              `## ${manageServerEmoji} ${t('setup.log.title', locale)}`,
            ),
          )
          .addSeparatorComponents(s => s)
          .addTextDisplayComponents(td =>
            td.setContent(`**${t('setup.log.nuke_label', locale)}**`),
          )
          .addActionRowComponents<ChannelSelectMenuBuilder>(row =>
            row.addComponents(nukeLogSelect),
          )
          .addSeparatorComponents(s => s)
          .addTextDisplayComponents(td =>
            td.setContent(`**${t('setup.log.msgdelete_label', locale)}**`),
          )
          .addActionRowComponents<ChannelSelectMenuBuilder>(row =>
            row.addComponents(msgDeleteLogSelect),
          )
          .addSeparatorComponents(s => s)
          .addActionRowComponents<ButtonBuilder>(row =>
            row.addComponents(
              new ButtonBuilder()
                .setCustomId('setup-log-save')
                .setLabel(t('setup.log.save', locale))
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
          t('setup.log.timeout', locale),
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
                lines.push(
                  t('setup.log.saved_nuke', locale, {
                    channel: pending.nukeLogId,
                  }),
                );
              }
              if (pending.messageDeleteLogId) {
                lines.push(
                  t('setup.log.saved_msgdelete', locale, {
                    channel: pending.messageDeleteLogId,
                  }),
                );
              }

              const summary =
                lines.length > 0
                  ? `${t('setup.log.saved', locale)}\n${lines.join('\n')}`
                  : t('setup.log.cleared', locale);

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

      case 'prefix': {
        const prefixManager = PrefixManager.getInstance();
        const currentPrefix = await prefixManager.getPrefix(
          interaction.guildId!,
        );
        const defaultPrefix = prefixManager.getDefaultPrefix();

        // --- Build panel ---
        const prefixPanelContainer = new ContainerBuilder()
          .setAccentColor(EmbedColors.yellow())
          .addTextDisplayComponents(td =>
            td.setContent(
              `## ${manageServerEmoji} ${t('setup.prefix.title', locale)}`,
            ),
          )
          .addSeparatorComponents(s => s)
          .addTextDisplayComponents(td =>
            td.setContent(
              t('setup.prefix.current_value', locale, {prefix: currentPrefix}),
            ),
          )
          .addSeparatorComponents(s => s)
          .addActionRowComponents<ButtonBuilder>(row =>
            row.addComponents(
              new ButtonBuilder()
                .setCustomId('setup-prefix-change')
                .setLabel(t('setup.prefix.save', locale))
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('setup-prefix-reset')
                .setLabel(t('setup.prefix.reset', locale))
                .setStyle(ButtonStyle.Secondary),
            ),
          );

        await interaction.editReply({components: [prefixPanelContainer]});

        // --- Timeout helper ---
        const prefixComponentIds = [
          'setup-prefix-change',
          'setup-prefix-reset',
          'setup-prefix-modal',
        ];

        const prefixTimeoutContainer = StatusContainer.failed(
          failedEmoji,
          t('setup.prefix.timeout', locale),
        );

        const prefixCleanupAll = () => {
          ComponentManager.getComponentManager().unregisterMany(
            prefixComponentIds,
          );
        };

        const prefixOnTimeout = async () => {
          prefixCleanupAll();
          await interaction.editReply({
            components: [prefixTimeoutContainer],
          });
        };

        // --- Register components ---
        ComponentManager.getComponentManager().register([
          {
            customId: 'setup-prefix-change',
            timeout: 120000,
            onTimeout: prefixOnTimeout,
            handler: async (btnInteraction: ButtonInteraction) => {
              const modal = new ModalBuilder()
                .setCustomId('setup-prefix-modal')
                .setTitle(t('setup.prefix.modal_title', locale));

              const prefixInput = new TextInputBuilder()
                .setCustomId('setup-prefix-input')
                .setLabel(t('setup.prefix.input_label', locale))
                .setPlaceholder(t('setup.prefix.input_placeholder', locale))
                .setStyle(TextInputStyle.Short)
                .setMaxLength(10)
                .setMinLength(1)
                .setRequired(true);

              modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  prefixInput,
                ),
              );

              await btnInteraction.showModal(modal);
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
          {
            customId: 'setup-prefix-reset',
            timeout: 120000,
            onTimeout: prefixOnTimeout,
            handler: async (btnInteraction: ButtonInteraction) => {
              prefixCleanupAll();

              await btnInteraction.update({
                components: [loadingContainer],
              });

              await prefixManager.resetPrefix(interaction.guildId!);

              const resultContainer = StatusContainer.success(
                successEmoji,
                t('setup.prefix.reset_success', locale, {
                  prefix: defaultPrefix,
                }),
              );

              await btnInteraction.editReply({
                components: [resultContainer],
              });
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
          {
            customId: 'setup-prefix-modal',
            timeout: 120000,
            onTimeout: prefixOnTimeout,
            handler: async (modalInteraction: ModalSubmitInteraction) => {
              prefixCleanupAll();

              const newPrefix =
                modalInteraction.fields.getTextInputValue('setup-prefix-input');

              if (!newPrefix || newPrefix.length > 10) {
                const invalidContainer = StatusContainer.failed(
                  failedEmoji,
                  t('setup.prefix.invalid', locale),
                );

                await modalInteraction.editReply({
                  components: [invalidContainer],
                });
                return;
              }

              await modalInteraction.editReply({
                components: [loadingContainer],
              });

              await prefixManager.setPrefix(interaction.guildId!, newPrefix);

              const resultContainer = StatusContainer.success(
                successEmoji,
                t('setup.prefix.saved', locale, {prefix: newPrefix}),
              );

              await modalInteraction.editReply({
                components: [resultContainer],
              });
            },
            type: ComponentEnum.MODAL,
            userCheck: [interaction.user.id],
          },
        ]);

        break;
      }
    }
  }
}
