import {
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  subtext,
  time,
  TimestampStyles,
  UserContextMenuCommandInteraction,
  userMention,
} from 'discord.js';
import {ContextMenuCommand} from '../../../ContextMenuCommand';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

export default class BanCommand extends ContextMenuCommand {
  constructor() {
    super('Ban this user', ApplicationCommandType.User);

    this.advancedOptions.cooldown = 30000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);
  }

  async run(interaction: UserContextMenuCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      allowedMentions: {},
    });

    const targetUser = interaction.targetUser;

    if (!targetUser) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'This user does not exist!',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      return;
    }

    if (!interaction.guild || !client.user) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'This command can only be used in a server.',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      return;
    }

    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);
    const userExecute = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);
    const bot = await interaction.guild.members
      .fetch(client.user.id)
      .catch(() => null);

    if (!userExecute || !bot) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Could not find member information!',
      );

      await interaction.editReply({
        components: [errorContainer],
      });
      return;
    }

    if (!bot.permissions.has(PermissionFlagsBits.BanMembers)) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `The bot does not have permission to ban ${userMention(targetUser.id)}!`,
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      return;
    }

    if (interaction.user.id === targetUser.id) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'You cannot ban yourself.',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      return;
    }

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
          'You cannot ban a user with a role equal to or higher than yours!',
        );

        await interaction.editReply({
          components: [errorContainer],
        });
        return;
      }

      if (roleComparisonBot >= 0) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          'The bot cannot ban a user with a role equal to or higher than the bot.',
        );

        await interaction.editReply({
          components: [errorContainer],
        });
        return;
      }
    }

    const reason = `Banned by ${interaction.user.username}`;

    const componentsId: string[] = [
      `confirmBan_${interaction.id}`,
      `cancelBan_${interaction.id}`,
    ];

    const expireAt = new Date(Date.now() + 10000);

    const banConfirmContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Are you sure you want to ban ${userMention(targetUser.id)} from the server?`,
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
              subtext('Please click this button to proceed.'),
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
            textDisplay.setContent(subtext('Please click this button to cancel.')),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `Your command will expire in ${time(expireAt, TimestampStyles.RelativeTime)}`,
          ),
        ),
      );

    ComponentManager.getComponentManager().register([
      {
        customId: componentsId[0],
        timeout: 10000,
        onTimeout: async () => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'This request has expired. Please try again.',
          );

          await interaction.editReply({
            components: [errorContainer],
          });

          return;
        },
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          await interaction.update({
            components: [loadingContainer],
          });

          try {
            await interaction.guild!.bans.create(targetUser.id, {
              reason,
            });

            const successContainer = StatusContainer.success(
              successEmoji,
              `Successfully banned ${userMention(targetUser.id)} from the server!`,
            );

            await interaction.editReply({
              components: [successContainer],
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            let errorMessage = `An error occurred while banning ${userMention(targetUser.id)}!`;

            if (error.code === 50013) {
              errorMessage = 'The bot does not have permission to ban this user!';
            } else if (error.message) {
              errorMessage = error.message;
            }

            const errorContainer = StatusContainer.failed(
              failedEmoji,
              errorMessage,
            );

            await interaction.editReply({
              components: [errorContainer],
            });
          }

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
      {
        customId: componentsId[1],
        timeout: 10000,
        onTimeout: async () => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'This request has expired. Please try again.',
          );

          await interaction.editReply({
            components: [errorContainer],
          });

          return;
        },
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany(componentsId);

          await interaction.update({
            components: [loadingContainer],
          });

          const successContainer = StatusContainer.success(
            successEmoji,
            'Request canceled successfully.',
          );

          await interaction.editReply({
            components: [successContainer],
          });

          return;
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
    ]);

    await interaction.editReply({
      components: [banConfirmContainer],
    });
  }
}
