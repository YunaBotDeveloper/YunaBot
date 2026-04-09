import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  subtext,
  TextChannel,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {getCouple} from '../../../../util/CoupleHelper';
import CoupleActivity from '../../../../database/models/CoupleActivity.model';
import MarriageCooldown from '../../../../database/models/MarriageCooldown.model';

export default class DivorceCommand extends Command {
  constructor() {
    super('divorce', 'Chia tay người yêu của bạn');

    this.advancedOptions.cooldown = 5000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingContainer = StatusContainer.loading(loadingEmoji);

    await interaction.editReply({
      components: [loadingContainer],
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

    const confirmId = `divorce_confirm_${interaction.id}`;
    const cancelId = `divorce_cancel_${interaction.id}`;

    const confirmContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(t =>
        t.setContent(
          `## 💔 Bạn có chắc muốn chia tay ${userMention(partnerId)}?`,
        ),
      )
      .addTextDisplayComponents(t =>
        t.setContent(
          subtext('Hành động này không thể hoàn tác. EXP couple sẽ bị xóa.'),
        ),
      )
      .addSeparatorComponents(s => s)
      .addActionRowComponents(row =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(confirmId)
            .setLabel('Xác nhận chia tay')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(cancelId)
            .setLabel('Hủy')
            .setStyle(ButtonStyle.Secondary),
        ),
      );

    await interaction.editReply({
      components: [confirmContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    ComponentManager.getComponentManager().register([
      {
        customId: confirmId,
        timeout: 30000,
        handler: async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({components: [loadingContainer]});

          await CoupleActivity.destroy({
            where: {guildId, userId: [interaction.user.id, partnerId]},
          });
          await couple.destroy();

          const divorceTime = new Date();
          await Promise.all([
            MarriageCooldown.upsert({
              userId: interaction.user.id,
              guildId,
              lastDivorcedAt: divorceTime,
            }),
            MarriageCooldown.upsert({
              userId: partnerId,
              guildId,
              lastDivorcedAt: divorceTime,
            }),
          ]);

          const divorceContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.random())
            .addTextDisplayComponents(t =>
              t.setContent(
                `## 💔 ${userMention(interaction.user.id)} và ${userMention(partnerId)} đã chia tay.`,
              ),
            )
            .addTextDisplayComponents(t =>
              t.setContent(subtext('"Chúc bạn sớm tìm được hạnh phúc mới."')),
            );

          await (interaction.channel as TextChannel).send({
            components: [divorceContainer],
            flags: [MessageFlags.IsComponentsV2],
          });

          await btnInteraction.editReply({
            components: [StatusContainer.success(successEmoji, 'Đã chia tay.')],
          });
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
      {
        customId: cancelId,
        timeout: 30000,
        handler: async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({
            components: [StatusContainer.success(successEmoji, 'Đã hủy.')],
          });
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
    ]);
  }
}
