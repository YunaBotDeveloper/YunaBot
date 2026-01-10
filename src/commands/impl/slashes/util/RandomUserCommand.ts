import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  Message,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import {Command} from '../../../Command';
import Log4TS from '../../../../logger/Log4TS';
import {nanoid} from 'nanoid';
import ButtonComponentBuilder from '../../../../component/builders/ButtonComponentBuilder';
import ComponentManager from '../../../../component/manager/ComponentManager';

interface RandomSession {
  membersArray: GuildMember[];
  excludedIds: Set<string>;
  filterRoleName: string | null;
  hostId: string;
}

export default class RandomUserCommand extends Command {
  private readonly SESSION_TIMEOUT = 60000; // 1 minute

  constructor() {
    super('randomuser', '🎲 Chọn ngẫu nhiên một thành viên trong server!');

    this.advancedOptions.cooldown = 5000;

    this.data.addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Chỉ chọn từ những người có role này (tùy chọn)'),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Lệnh này chỉ có thể sử dụng trong server!',
        ephemeral: true,
      });
      return;
    }

    const filterRole = interaction.options.getRole('role');

    // Fetch all members
    await interaction.deferReply();

    try {
      const members = await interaction.guild.members.fetch();

      // Filter out bots and optionally filter by role
      let eligibleMembers = members.filter(
        (member: GuildMember) => !member.user.bot,
      );

      if (filterRole) {
        eligibleMembers = eligibleMembers.filter((member: GuildMember) =>
          member.roles.cache.has(filterRole.id),
        );
      }

      if (eligibleMembers.size === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('❌ Không tìm thấy!')
              .setDescription(
                filterRole
                  ? `Không có thành viên nào có role ${filterRole}!`
                  : 'Không có thành viên nào trong server!',
              ),
          ],
        });
        return;
      }

      const sessionId = nanoid(10);
      const session: RandomSession = {
        membersArray: Array.from(eligibleMembers.values()),
        excludedIds: new Set(),
        filterRoleName: filterRole?.name || null,
        hostId: interaction.user.id,
      };

      const message = await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle('🎲 Đang chọn ngẫu nhiên...')
            .setDescription('🔄 Đang quay...'),
        ],
      });

      // Do initial roll
      const winner = await this.rollWithAnimation(message as Message, session);

      if (!winner) {
        return;
      }

      // Setup button
      const nextButtonId = `randomuser_next_${sessionId}`;
      const componentManager = ComponentManager.getComponentManager();

      const createNextHandler = () => {
        return async (
          btnInteraction:
            | ButtonInteraction
            | StringSelectMenuInteraction
            | ModalSubmitInteraction,
        ) => {
          if (!btnInteraction.isButton()) return;

          // Only host can use the button
          if (btnInteraction.user.id !== session.hostId) {
            await btnInteraction.reply({
              content: '❌ Chỉ người dùng lệnh mới có thể bấm nút này!',
              ephemeral: true,
            });
            return;
          }

          await btnInteraction.deferUpdate();

          // Check if there are remaining members
          const remaining = session.membersArray.filter(
            m => !session.excludedIds.has(m.id),
          );

          if (remaining.length === 0) {
            const noMoreEmbed = new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle('❌ Hết thành viên!')
              .setDescription(
                `Đã random hết tất cả ${session.excludedIds.size} thành viên!`,
              )
              .setTimestamp();

            await btnInteraction.editReply({
              embeds: [noMoreEmbed],
              components: [],
            });

            componentManager.unregister(nextButtonId);
            return;
          }

          // Roll again
          const newWinner = await this.rollWithAnimation(
            btnInteraction.message as Message,
            session,
          );

          if (!newWinner) {
            componentManager.unregister(nextButtonId);
            return;
          }

          // Update with new result and button
          const resultEmbed = this.createResultEmbed(newWinner, session);
          const row = this.createButtonRow(nextButtonId, session);

          await btnInteraction.editReply({
            embeds: [resultEmbed],
            components: [row],
          });
        };
      };

      componentManager.register([
        new ButtonComponentBuilder()
          .setCustomId(nextButtonId)
          .setUserCheck(['*'])
          .setTimeout(this.SESSION_TIMEOUT)
          .setHandler(createNextHandler())
          .setOnTimeout(async () => {
            try {
              const expiredEmbed = this.createResultEmbed(winner, session);
              expiredEmbed.setFooter({
                text: `Hết thời gian | Đã loại ${session.excludedIds.size} thành viên`,
              });

              await (message as Message).edit({
                embeds: [expiredEmbed],
                components: [],
              });
            } catch {
              // Message might be deleted
            }
          })
          .build(),
      ]);

      // Show result with button
      const resultEmbed = this.createResultEmbed(winner, session);
      const row = this.createButtonRow(nextButtonId, session);

      await (message as Message).edit({
        embeds: [resultEmbed],
        components: [row],
      });
    } catch (error) {
      Log4TS.getLogger().error(`[RandomUser] Error: ${error}`);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Lỗi!')
            .setDescription('Đã xảy ra lỗi khi lấy danh sách thành viên!'),
        ],
      });
    }
  }

  private async rollWithAnimation(
    message: Message,
    session: RandomSession,
  ): Promise<GuildMember | null> {
    const available = session.membersArray.filter(
      m => !session.excludedIds.has(m.id),
    );

    if (available.length === 0) {
      const noMoreEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Hết thành viên!')
        .setDescription(
          `Đã random hết tất cả ${session.excludedIds.size} thành viên!`,
        )
        .setTimestamp();

      await message.edit({embeds: [noMoreEmbed], components: []});
      return null;
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🎲 Đang chọn ngẫu nhiên...')
      .setDescription('🔄 Đang quay...');

    await message.edit({embeds: [loadingEmbed], components: []});

    // Animation frames
    const frames = 8;
    const frameDelay = 150;

    for (let i = 0; i < frames; i++) {
      await this.sleep(frameDelay);

      const randomMember =
        available[Math.floor(Math.random() * available.length)];

      loadingEmbed.setDescription(`🔄 ${randomMember.user.tag}...`);

      await message.edit({embeds: [loadingEmbed]});
    }

    // Final selection
    const winner = available[Math.floor(Math.random() * available.length)];

    // Add to excluded
    session.excludedIds.add(winner.id);

    return winner;
  }

  private createResultEmbed(
    winner: GuildMember,
    session: RandomSession,
  ): EmbedBuilder {
    const remaining = session.membersArray.length - session.excludedIds.size;

    return new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎉 Kết quả Random User!')
      .setDescription(
        '## 🏆 Người được chọn:\n\n' +
          `${winner}\n\n` +
          `**Username:** ${winner.user.tag}\n` +
          `**ID:** \`${winner.user.id}\`\n` +
          `**Tham gia server:** <t:${Math.floor((winner.joinedTimestamp || 0) / 1000)}:R>`,
      )
      .setThumbnail(winner.user.displayAvatarURL({size: 256}))
      .setFooter({
        text:
          `Còn lại: ${remaining}/${session.membersArray.length}` +
          (session.filterRoleName ? ` | Role: ${session.filterRoleName}` : ''),
      })
      .setTimestamp();
  }

  private createButtonRow(
    buttonId: string,
    session: RandomSession,
  ): ActionRowBuilder<ButtonBuilder> {
    const remaining = session.membersArray.length - session.excludedIds.size;

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buttonId)
        .setLabel(`🔄 Next (${remaining} còn lại)`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(remaining === 0),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
