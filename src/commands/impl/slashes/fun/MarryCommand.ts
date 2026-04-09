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
import {getCouple, isInCouple} from '../../../../util/CoupleHelper';
import Couple from '../../../../database/models/Couple.model';
import MarriageCooldown from '../../../../database/models/MarriageCooldown.model';

const MARRY_COOLDOWN_MS = 48 * 60 * 60 * 1000;

async function getMarriageCooldownRemaining(
  userId: string,
  guildId: string,
): Promise<number> {
  const record = await MarriageCooldown.findOne({where: {userId, guildId}});
  if (!record) return 0;
  const elapsed = Date.now() - new Date(record.lastDivorcedAt).getTime();
  return elapsed < MARRY_COOLDOWN_MS ? MARRY_COOLDOWN_MS - elapsed : 0;
}

function formatMarryCooldown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

export default class MarryCommand extends Command {
  constructor() {
    super('marry', 'Cầu hôn một người dùng nào đó');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người bạn muốn cầu hôn')
        .setRequired(true),
    );
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

    const targetUser = interaction.options.getUser('user', true);
    const guildId = interaction.guild!.id;

    if (targetUser.bot) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(failedEmoji, 'Bạn không thể cầu hôn bot!'),
        ],
      });
      return;
    }

    if (targetUser.id === interaction.user.id) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(
            failedEmoji,
            'Bạn không thể cầu hôn chính mình!',
          ),
        ],
      });
      return;
    }

    if (await isInCouple(interaction.user.id, guildId)) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(failedEmoji, 'Bạn đã có người yêu rồi!'),
        ],
      });
      return;
    }

    if (await isInCouple(targetUser.id, guildId)) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(
            failedEmoji,
            `${targetUser.username} đã có người yêu rồi!`,
          ),
        ],
      });
      return;
    }

    const proposerCooldown = await getMarriageCooldownRemaining(
      interaction.user.id,
      guildId,
    );
    if (proposerCooldown > 0) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(
            failedEmoji,
            `Bạn vừa chia tay! Hãy chờ thêm **${formatMarryCooldown(proposerCooldown)}** nữa trước khi cầu hôn lại.`,
          ),
        ],
      });
      return;
    }

    const targetCooldown = await getMarriageCooldownRemaining(
      targetUser.id,
      guildId,
    );
    if (targetCooldown > 0) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(
            failedEmoji,
            `${targetUser.username} vừa chia tay! Họ cần thêm **${formatMarryCooldown(targetCooldown)}** nữa trước khi có thể kết hôn lại.`,
          ),
        ],
      });
      return;
    }

    const acceptId = `marry_accept_${interaction.id}`;
    const declineId = `marry_decline_${interaction.id}`;

    const proposalContainer = this.proposalContainer(
      interaction.user.id,
      targetUser.id,
      acceptId,
      declineId,
      false,
    );

    await interaction.editReply({
      components: [
        StatusContainer.success(successEmoji, 'Đã gửi lời cầu hôn!'),
      ],
    });

    const sentMessage = await (interaction.channel as TextChannel).send({
      components: [proposalContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    ComponentManager.getComponentManager().register([
      {
        customId: acceptId,
        timeout: 60000,
        onTimeout: async () => {
          const timedOut = this.proposalContainer(
            interaction.user.id,
            targetUser.id,
            acceptId,
            declineId,
            true,
          );
          await sentMessage.edit({components: [timedOut]});
        },
        handler: async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({components: [loadingContainer]});

          if (
            (await isInCouple(interaction.user.id, guildId)) ||
            (await isInCouple(targetUser.id, guildId))
          ) {
            const alreadyContainer = new ContainerBuilder()
              .setAccentColor(EmbedColors.random())
              .addTextDisplayComponents(t =>
                t.setContent('## Lời cầu hôn đã hết hiệu lực!'),
              )
              .addTextDisplayComponents(t =>
                t.setContent(subtext('Một trong hai người đã có người yêu.')),
              );
            await btnInteraction.editReply({components: [alreadyContainer]});
            return;
          }

          await Couple.create({
            user1Id: interaction.user.id,
            user2Id: targetUser.id,
            guildId,
            marriedAt: new Date(),
            exp: 0,
            level: 0,
          });

          const acceptedContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.random())
            .addTextDisplayComponents(t =>
              t.setContent(
                `## 💍 ${userMention(targetUser.id)} đã đồng ý cầu hôn của ${userMention(interaction.user.id)}!`,
              ),
            )
            .addTextDisplayComponents(t =>
              t.setContent(subtext('"Chúc hai bạn hạnh phúc mãi mãi!"')),
            );
          await btnInteraction.editReply({components: [acceptedContainer]});
        },
        type: ComponentEnum.BUTTON,
        userCheck: [targetUser.id],
      },
      {
        customId: declineId,
        timeout: 60000,
        handler: async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({components: [loadingContainer]});

          const declinedContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.random())
            .addTextDisplayComponents(t =>
              t.setContent(
                `## 💔 ${userMention(targetUser.id)} đã từ chối lời cầu hôn của ${userMention(interaction.user.id)}.`,
              ),
            )
            .addTextDisplayComponents(t =>
              t.setContent(subtext('"Không phải ai cũng có duyên..."')),
            );
          await btnInteraction.editReply({components: [declinedContainer]});
        },
        type: ComponentEnum.BUTTON,
        userCheck: [targetUser.id],
      },
    ]);
  }

  proposalContainer(
    proposerId: string,
    targetId: string,
    acceptId: string,
    declineId: string,
    timedOut: boolean,
  ): ContainerBuilder {
    const container = new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(t =>
        t.setContent(
          `## 💍 ${userMention(proposerId)} muốn cầu hôn ${userMention(targetId)}!`,
        ),
      )
      .addTextDisplayComponents(t =>
        t.setContent(subtext('"Bạn có chấp nhận không?"')),
      )
      .addSeparatorComponents(s => s);

    if (timedOut) {
      container.addTextDisplayComponents(t =>
        t.setContent(subtext('Lời cầu hôn đã hết hạn.')),
      );
    } else {
      container.addActionRowComponents(row =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(acceptId)
            .setLabel('Đồng ý 💍')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(declineId)
            .setLabel('Từ chối 💔')
            .setStyle(ButtonStyle.Danger),
        ),
      );
    }

    return container;
  }
}
