import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  GuildMember,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  StringSelectMenuOptionBuilder,
  subtext,
  TextChannel,
  TextInputStyle,
  time,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';
import BanLog from '../../../../database/models/BanLog.model';
import GuildLog from '../../../../database/models/GuildLog.model';
import {nanoid} from 'nanoid';
import {parseDuration} from '../../../../util/TimeParser';

interface BanState {
  targetUsers: GuildMember[];
  finalReason: string;
  durationMs: number | null;
  durationStr: string;
  purgeSeconds: number;
  purgeStr: string;
  proofURL: string | null;
  shouldDm: boolean;
}

function humanizeDuration(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days} ngày`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}

export default class BanCommand extends Command {
  constructor() {
    super('ban', 'Cấm người dùng bạn chỉ định khỏi server');
    this.advancedOptions.cooldown = 30000;
    this.data.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

    const ids = {
      modal: `banModal_${interaction.id}`,
      userSelect: `userSelect_${interaction.id}`,
      reasonInput: `reasonInput_${interaction.id}`,
      durationInput: `durationInput_${interaction.id}`,
      proofUpload: `proofUpload_${interaction.id}`,
      purgeInput: `purgeInput_${interaction.id}`,
      dmSelect: `dmSelect_${interaction.id}`,
      confirmBtn: `banConfirm_${interaction.id}`,
      editBtn: `banEdit_${interaction.id}`,
      cancelBtn: `banCancel_${interaction.id}`,
    };

    const confirmBtnIds = [ids.confirmBtn, ids.editBtn, ids.cancelBtn];
    const timeout = 60000;

    const buildConfirmPanel = (state: BanState): ContainerBuilder =>
      new ContainerBuilder()
        .setAccentColor(EmbedColors.yellow())
        .addTextDisplayComponents(t =>
          t.setContent(`## ${infoEmoji} Xác nhận cấm người dùng`),
        )
        .addSeparatorComponents(s => s)
        .addTextDisplayComponents(t =>
          t.setContent(
            `**Người bị cấm:** ${state.targetUsers.map(m => userMention(m.id)).join(', ')}\n` +
              `**Lý do:** ${state.finalReason}\n` +
              `**Thời hạn:** ${state.durationMs ? humanizeDuration(state.durationMs) : 'Vĩnh viễn'}\n` +
              `**Xoá tin nhắn:** ${state.purgeSeconds > 0 ? humanizeDuration(state.purgeSeconds * 1000) : 'Không'}\n` +
              `**DM thông báo:** ${state.shouldDm ? 'Có' : 'Không'}` +
              (state.proofURL ? `\n**Bằng chứng:** ${state.proofURL}` : ''),
          ),
        )
        .addSeparatorComponents(s => s)
        .addSectionComponents(sec =>
          sec
            .addTextDisplayComponents(t =>
              t.setContent(subtext('Bấm để xác nhận')),
            )
            .setButtonAccessory(btn =>
              btn
                .setCustomId(ids.confirmBtn)
                .setLabel('✅')
                .setStyle(ButtonStyle.Success),
            ),
        )
        .addSectionComponents(sec =>
          sec
            .addTextDisplayComponents(t =>
              t.setContent(subtext('Bấm để chỉnh sửa')),
            )
            .setButtonAccessory(btn =>
              btn
                .setCustomId(ids.editBtn)
                .setLabel('✏️')
                .setStyle(ButtonStyle.Primary),
            ),
        )
        .addSectionComponents(sec =>
          sec
            .addTextDisplayComponents(t =>
              t.setContent(subtext('Bấm để huỷ bỏ')),
            )
            .setButtonAccessory(btn =>
              btn
                .setCustomId(ids.cancelBtn)
                .setLabel('❌')
                .setStyle(ButtonStyle.Danger),
            ),
        );

    const parseFields = (
      modalInteraction: ModalSubmitInteraction,
    ): {state: BanState; error: string | null} => {
      const targetUsers = modalInteraction.fields.getSelectedMembers(
        ids.userSelect,
      );
      const reasonRaw = modalInteraction.fields.getTextInputValue(
        ids.reasonInput,
      );
      const durationStr = modalInteraction.fields
        .getTextInputValue(ids.durationInput)
        .trim();
      const proof = modalInteraction.fields.getUploadedFiles(ids.proofUpload);
      const purgeStr = modalInteraction.fields
        .getTextInputValue(ids.purgeInput)
        .trim();
      const dm = modalInteraction.fields.getStringSelectValues(ids.dmSelect);

      let durationMs: number | null = null;
      if (durationStr !== '') {
        durationMs = parseDuration(durationStr);
        if (durationMs === null || durationMs > 30 * 24 * 60 * 60 * 1000) {
          return {
            state: null!,
            error:
              'Thời gian cấm không hợp lệ! Vui lòng dùng định dạng như 30d, 12h, 30m (tối đa 30d).',
          };
        }
      }

      let purgeSeconds = 0;
      if (purgeStr !== '') {
        const purgeMs = parseDuration(purgeStr);
        if (purgeMs === null || purgeMs > 7 * 24 * 60 * 60 * 1000) {
          return {
            state: null!,
            error:
              'Thời gian xoá tin nhắn không hợp lệ! Vui lòng dùng định dạng như 7d, 12h (tối đa 7d).',
          };
        }
        purgeSeconds = Math.round(purgeMs / 1000);
      }

      return {
        state: {
          targetUsers,
          finalReason:
            reasonRaw.trim() ||
            `Bị cấm bởi ${interaction.user.displayName} (${interaction.user.id})`,
          durationMs,
          durationStr,
          purgeSeconds,
          purgeStr,
          proofURL:
            proof.length > 0 ? proof.map(f => f.url).join(', ') : null,
          shouldDm: dm[0] === 'yes',
        },
        error: null,
      };
    };

    const executeBans = async (
      btnInteraction: ButtonInteraction,
      state: BanState,
    ): Promise<void> => {
      const guild = btnInteraction.guild!;
      const results: string[] = [];

      for (const member of state.targetUsers) {
        try {
          const botMember = guild.members.me;
          if (
            botMember &&
            member.roles.highest.position >= botMember.roles.highest.position
          ) {
            results.push(
              `${userMention(member.id)}: Bot không có quyền cấm người dùng này!`,
            );
            continue;
          }

          if (state.shouldDm) {
            try {
              const dmContainer = new ContainerBuilder()
                .setAccentColor(EmbedColors.red())
                .addTextDisplayComponents(t =>
                  t.setContent(
                    `## Bạn đã bị cấm khỏi **${guild.name}**\n` +
                      `**Lý do:** ${state.finalReason}\n` +
                      `**Thời hạn:** ${state.durationMs ? humanizeDuration(state.durationMs) : 'Vĩnh viễn'}` +
                      (state.proofURL
                        ? `\n**Bằng chứng:** ${state.proofURL}`
                        : ''),
                  ),
                );
              await member.send({
                components: [dmContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } catch {
              /* DM disabled */
            }
          }

          await guild.members.ban(member, {
            reason: state.finalReason,
            deleteMessageSeconds: state.purgeSeconds,
          });

          await new BanLog({
            guildId: guild.id,
            banId: `#${nanoid(5)}`,
            userExcuteId: btnInteraction.user.id,
            userTargetId: member.id,
            reason: state.finalReason,
            duration: state.durationMs,
            proofURL: state.proofURL,
            purgeMessage: state.purgeSeconds > 0,
            time: Math.round(Date.now()),
          }).save();

          results.push(`${userMention(member.id)}: Thành công!`);
        } catch (error: unknown) {
          const err = error as {code?: number; message?: string};
          results.push(
            `${userMention(member.id)}: ${err.code === 50013 ? 'Bot không có quyền!' : (err.message ?? 'Lỗi không xác định')}`,
          );
        }
      }

      const guildLog = await GuildLog.findOne({where: {guildId: guild.id}});
      if (guildLog?.banLogId) {
        try {
          const logChannel = (await guild.channels.fetch(
            guildLog.banLogId,
          )) as TextChannel | null;
          if (logChannel) {
            const now = Math.round(Date.now() / 1000);
            const logContainer = new ContainerBuilder()
              .setAccentColor(EmbedColors.red())
              .addTextDisplayComponents(t =>
                t.setContent(`## ${successEmoji} Cấm người dùng thành công!`),
              )
              .addSeparatorComponents(s => s)
              .addTextDisplayComponents(t =>
                t.setContent(
                  `Người thực hiện: ${userMention(btnInteraction.user.id)} (${btnInteraction.user.id})\n` +
                    `Người bị cấm: ${state.targetUsers.map(m => `${userMention(m.id)} (${m.id})`).join(', ')}\n` +
                    `Lý do: ${state.finalReason}\n` +
                    `Thời hạn: ${state.durationMs ? humanizeDuration(state.durationMs) : 'Vĩnh viễn'}\n` +
                    `Xoá tin nhắn: ${state.purgeSeconds > 0 ? humanizeDuration(state.purgeSeconds * 1000) : 'Không'}` +
                    (state.proofURL
                      ? `\nBằng chứng: ${state.proofURL}`
                      : ''),
                ),
              )
              .addSeparatorComponents(s => s)
              .addTextDisplayComponents(t =>
                t.setContent(subtext(`Được thực hiện vào ${time(now)}`)),
              );
            await logChannel.send({
              components: [logContainer],
              flags: MessageFlags.IsComponentsV2,
              allowedMentions: {users: []},
            });
          }
        } catch {
          /* Log channel unavailable */
        }
      }

      const resultContainer = new ContainerBuilder()
        .setAccentColor(EmbedColors.green())
        .addTextDisplayComponents(t =>
          t.setContent(`## ${successEmoji} Kết quả cấm người dùng:`),
        )
        .addSeparatorComponents(s => s)
        .addTextDisplayComponents(t => t.setContent(results.join('\n')));

      await btnInteraction.editReply({
        components: [resultContainer],
        flags: [MessageFlags.IsComponentsV2],
      });
    };

    // Use let to allow self-reference inside the closure (recursive edit flow)
    let registerConfirmHandlers: (state: BanState) => void;
    registerConfirmHandlers = (state: BanState) => {
      const editModalId = `banEditModal_${nanoid(4)}_${interaction.id}`;

      ComponentManager.getComponentManager().register([
        {
          customId: ids.confirmBtn,
          timeout,
          onTimeout: async () => {
            ComponentManager.getComponentManager().unregisterMany(confirmBtnIds);
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            ComponentManager.getComponentManager().unregisterMany(confirmBtnIds);
            await btnInteraction.update({
              components: [StatusContainer.loading(loadingEmoji)],
            });
            await executeBans(btnInteraction, state);
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: ids.editBtn,
          timeout,
          onTimeout: async () => {
            ComponentManager.getComponentManager().unregisterMany(confirmBtnIds);
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            ComponentManager.getComponentManager().unregisterMany(confirmBtnIds);

            const editModal = this.banPanel(
              editModalId,
              ids.userSelect,
              ids.reasonInput,
              ids.durationInput,
              ids.proofUpload,
              ids.purgeInput,
              ids.dmSelect,
              {
                reason: state.finalReason,
                duration: state.durationStr,
                purge: state.purgeStr,
              },
            );

            ComponentManager.getComponentManager().register([
              {
                customId: editModalId,
                handler: async (
                  editModalInteraction: ModalSubmitInteraction,
                ) => {
                  const {state: newState, error} =
                    parseFields(editModalInteraction);

                  if (error) {
                    if (editModalInteraction.isFromMessage()) {
                      await editModalInteraction.update({
                        components: [
                          StatusContainer.failed(failedEmoji, error),
                        ],
                      });
                    }
                    return;
                  }

                  registerConfirmHandlers(newState);

                  if (editModalInteraction.isFromMessage()) {
                    await editModalInteraction.update({
                      components: [buildConfirmPanel(newState)],
                      flags: [MessageFlags.IsComponentsV2],
                    });
                  }
                },
                type: ComponentEnum.MODAL,
                userCheck: [interaction.user.id],
              },
            ]);

            await btnInteraction.showModal(editModal);
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: ids.cancelBtn,
          timeout,
          onTimeout: async () => {
            ComponentManager.getComponentManager().unregisterMany(confirmBtnIds);
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            ComponentManager.getComponentManager().unregisterMany(confirmBtnIds);
            await btnInteraction.update({
              components: [
                StatusContainer.success(successEmoji, 'Đã huỷ thao tác!'),
              ],
            });
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
      ]);
    };

    ComponentManager.getComponentManager().register([
      {
        customId: ids.modal,
        handler: async (modalInteraction: ModalSubmitInteraction) => {
          const {state, error} = parseFields(modalInteraction);

          if (error) {
            await modalInteraction.reply({
              components: [StatusContainer.failed(failedEmoji, error)],
              flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            });
            return;
          }

          registerConfirmHandlers(state);
          await modalInteraction.reply({
            components: [buildConfirmPanel(state)],
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          });
        },
        type: ComponentEnum.MODAL,
        userCheck: [interaction.user.id],
      },
    ]);

    await interaction.showModal(
      this.banPanel(
        ids.modal,
        ids.userSelect,
        ids.reasonInput,
        ids.durationInput,
        ids.proofUpload,
        ids.purgeInput,
        ids.dmSelect,
      ),
    );
  }

  banPanel(
    modalCustomId: string,
    userSelectCustomId: string,
    reasonInputCustomId: string,
    durationInputCustomId: string,
    proofUploadCustomId: string,
    purgeInputCustomId: string,
    dmSelectCustomId: string,
    prefill?: {reason?: string; duration?: string; purge?: string},
  ): ModalBuilder {
    return new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle('Cấm người dùng')
      .addLabelComponents(
        new LabelBuilder()
          .setLabel('Bạn muốn cấm ai?')
          .setDescription('Bạn có thể chọn nhiều người cùng một lúc!')
          .setUserSelectMenuComponent(userSelect =>
            userSelect
              .setCustomId(userSelectCustomId)
              .setMinValues(1)
              .setPlaceholder('Bấm vào đây để chọn!')
              .setRequired(true),
          ),
        new LabelBuilder()
          .setLabel('Tại sao bạn muốn cấm họ?')
          .setDescription('Không bắt buộc')
          .setTextInputComponent(textInput => {
            const input = textInput
              .setCustomId(reasonInputCustomId)
              .setMinLength(0)
              .setMaxLength(4000)
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Gõ vào đây...')
              .setRequired(false);
            if (prefill?.reason) input.setValue(prefill.reason);
            return input;
          }),
        new LabelBuilder()
          .setLabel('Bạn muốn cấm họ trong bao lâu?')
          .setDescription(
            'Định dạng: 30d (ngày), 12h (giờ), 30m (phút) | tối đa 30d | bỏ trống = vĩnh viễn',
          )
          .setTextInputComponent(textInput => {
            const input = textInput
              .setCustomId(durationInputCustomId)
              .setMinLength(0)
              .setMaxLength(4)
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Ví dụ: 7d, 12h, 30m')
              .setRequired(false);
            if (prefill?.duration) input.setValue(prefill.duration);
            return input;
          }),
        new LabelBuilder()
          .setLabel('Bằng chứng tại sao họ bị cấm')
          .setDescription('Chấp nhận tệp .png, .jpg (không bắt buộc)')
          .setFileUploadComponent(fileUpload =>
            fileUpload
              .setCustomId(proofUploadCustomId)
              .setMinValues(0)
              .setMaxValues(10)
              .setRequired(false),
          ),
        new LabelBuilder()
          .setLabel('Bạn có muốn xoá tin nhắn của họ không?')
          .setDescription(
            'Định dạng: 7d, 12h, 30m | tối đa 7d | bỏ trống = không xoá',
          )
          .setTextInputComponent(textInput => {
            const input = textInput
              .setCustomId(purgeInputCustomId)
              .setMinLength(0)
              .setMaxLength(4)
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Ví dụ: 7d, 12h')
              .setRequired(false);
            if (prefill?.purge) input.setValue(prefill.purge);
            return input;
          }),
        new LabelBuilder()
          .setLabel('Bạn có muốn thông báo rằng họ bị cấm không?')
          .setStringSelectMenuComponent(select =>
            select
              .setCustomId(dmSelectCustomId)
              .setPlaceholder('Bấm vào đây')
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('Có')
                  .setValue('yes'),
                new StringSelectMenuOptionBuilder()
                  .setLabel('Không')
                  .setValue('no'),
              )
              .setMinValues(1)
              .setMaxValues(1)
              .setRequired(true),
          ),
      );
  }
}
