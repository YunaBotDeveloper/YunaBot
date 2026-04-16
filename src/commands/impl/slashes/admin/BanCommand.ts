import {
  Attachment,
  bold,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  Guild,
  inlineCode,
  MessageFlags,
  PermissionFlagsBits,
  subtext,
  TextChannel,
  time,
  TimestampStyles,
  User,
  userMention,
  WebhookClient,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';
import {humanizeDuration} from '../../../../util/HumanizeDuration';
import {parseDuration} from '../../../../util/ParseDuration';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {v4 as uuidv4} from 'uuid';
import BanLog from '../../../../database/models/BanLog.model';
import GuildLog from '../../../../database/models/GuildLog.model';

export default class BanCommand extends Command {
  constructor() {
    super('ban', 'Ban the specified user from the server.');

    this.advancedOptions.cooldown = 10000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user you want to ban')
        .setRequired(true),
    );

    this.data.addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for banning this user')
        .setRequired(false),
    );

    this.data.addStringOption(option =>
      option
        .setName('duration')
        .setDescription('How long to ban this user')
        .setRequired(false),
    );

    this.data.addAttachmentOption(option =>
      option
        .setName('proof')
        .setDescription('Proof of why this user is being banned')
        .setRequired(false),
    );

    this.data.addBooleanOption(option =>
      option
        .setName('dm')
        .setDescription('Should the user be notified that they were banned?')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const message = await interaction.deferReply();

    const client = interaction.client as ExtendedClient;
    if (!client.user) return;

    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await message.edit({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
      allowedMentions: {},
    });

    const targetUser = interaction.options.getUser('user', true);

    const reason =
      interaction.options.getString('reason', false) ||
      `Banned by ${interaction.user.username}`;

    const duration = interaction.options.getString('duration', false);
    let durationS = null;
    let durationString = null;
    let invalidDuration = false;
    if (duration) {
      durationS = parseDuration(duration);
      if (durationS) {
        durationString = humanizeDuration(durationS);
      } else {
        invalidDuration = true;
        durationString = 'Permanent';
      }
    } else {
      durationString = 'Permanent';
    }

    const proof = interaction.options.getAttachment('proof', false);
    let isImageProof = false;
    if (proof) {
      if (proof.contentType && proof.contentType.startsWith('image/')) {
        isImageProof = true;
      } else if (proof.url) {
        const imageExtensions = [
          '.png',
          '.jpg',
          '.jpeg',
          '.gif',
          '.webp',
          '.bmp',
          '.tiff',
          '.svg',
          '.ico',
        ];
        const url = proof.url.toLowerCase().split('?')[0];
        isImageProof = imageExtensions.some(ext => url.endsWith(ext));
      }
      if (!isImageProof) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          'Invalid proof file format! Please try again!',
        );

        await interaction.editReply({
          components: [errorContainer],
        });

        setTimeout(async () => {
          await message.delete().catch(() => null);
        }, 5000);

        return;
      }
    }

    const shouldDm = interaction.options.getBoolean('dm', false) || false;

    if (invalidDuration) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Invalid duration format! Please try again!',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    try {
      await client.users.fetch(targetUser.id);
    } catch {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'This user does not exist!',
      );

      await message.edit({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    if (!interaction.guild) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'This command can only be used in a server!',
      );

      await message.edit({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    const banList = await interaction.guild.bans.fetch();
    const targetId = banList.get(targetUser.id)?.user;

    if (targetId) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `${userMention(targetId.id)} is already banned from this server!`,
      );

      await message.edit({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);
    const userExcute = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);
    const bot = await interaction.guild.members
      .fetch(client.user.id)
      .catch(() => null);

    if (!bot) return;

    if (!userExcute) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'Could not fetch your member data from this server!',
      );

      await message.edit({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    if (!bot.permissions.has(PermissionFlagsBits.BanMembers)) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `The bot does not have permission to ban ${userMention(targetUser.id)}!`,
      );

      await message.edit({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    if (interaction.user.id === targetUser.id) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'You cannot ban yourself.',
      );

      await message.edit({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    if (targetMember) {
      const roleComparisonUser = targetMember.roles.highest.comparePositionTo(
        userExcute.roles.highest,
      );

      const roleComparisonBot = targetMember.roles.highest.comparePositionTo(
        bot.roles.highest,
      );

      if (roleComparisonUser >= 0) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          `You do not have permission to ban ${userMention(targetUser.id)}!`,
        );

        await message.edit({
          components: [errorContainer],
        });

        setTimeout(async () => {
          await message.delete().catch(() => null);
        }, 5000);

        return;
      }

      if (roleComparisonBot >= 0) {
        const errorContainer = StatusContainer.failed(
          failedEmoji,
          `The bot does not have permission to ban ${userMention(targetUser.id)}!`,
        );

        await message.edit({
          components: [errorContainer],
        });

        setTimeout(async () => {
          await message.delete().catch(() => null);
        }, 5000);

        return;
      }
    }

    const componentsIds = {
      confirmBanCustomId: `confirmBan_${interaction.id}`,
      cancelBanCustomId: `cancelBan_${interaction.id}`,
    };

    const timeCreate = Math.round(Date.now() / 1000);

    const banConfirmContainer = this.banConfirmContainer(
      infoEmoji,
      failedEmoji,
      successEmoji,
      componentsIds,
      targetUser,
      reason,
      {
        durationS,
        durationString,
      },
      proof,
      shouldDm,
      timeCreate,
    );

    ComponentManager.getComponentManager().register([
      {
        customId: componentsIds.confirmBanCustomId,
        timeout: 10000,
        onTimeout: async () => {
          ComponentManager.getComponentManager().unregisterMany([
            componentsIds.cancelBanCustomId,
            componentsIds.confirmBanCustomId,
          ]);

          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'This request has expired. Please try again.',
          );

          await message.edit({
            components: [errorContainer],
          });

          setTimeout(async () => {
            await message.delete().catch(() => null);
          }, 5000);

          return;
        },
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany([
            componentsIds.cancelBanCustomId,
            componentsIds.confirmBanCustomId,
          ]);

          await interaction.update({
            components: [loadingContainer],
          });

          if (!interaction.guild) return;

          const banId = uuidv4();

          try {
            await interaction.guild.bans.create(targetUser, {
              reason: reason,
              deleteMessageSeconds: 60 * 60 * 24 * 7,
            });

            if (shouldDm) {
              const banDmContainer = this.banDmContainer(
                interaction.guild,
                infoEmoji,
                banId,
                interaction.user,
                reason,
                {
                  durationS,
                  durationString,
                },
                proof,
                timeCreate,
              );

              const dmTargetUser = await targetUser.createDM(true);

              await dmTargetUser.send({
                components: [banDmContainer],
                flags: [MessageFlags.IsComponentsV2],
              });
            }

            const banSuccessContainer = this.banSuccessContainer(
              successEmoji,
              failedEmoji,
              banId,
              targetUser,
              reason,
              {
                durationS,
                durationString,
              },
              proof,
              shouldDm,
              timeCreate,
            );

            const banLog = new BanLog({
              banId: banId,
              guildId: interaction.guild.id,
              userExecuteId: interaction.user.id,
              userTargetId: targetUser.id,
              reason: reason,
              duration: durationS,
              proofURL: proof?.url,
              shouldDm: shouldDm,
              time: timeCreate,
            });

            await banLog.save();

            await interaction.editReply({
              components: [banSuccessContainer],
            });

            const guildLog = await GuildLog.findOne({
              where: {guildId: interaction.guild.id},
            });

            if (!guildLog || !guildLog.banLogId) {
              return;
            }

            const channel = await interaction.guild.channels
              .fetch(guildLog.banLogId)
              .catch(() => null);

            if (!channel || !(channel instanceof TextChannel)) {
              await guildLog.update({banLogId: null, banLogWebhookURL: null});
              return;
            }

            let webhookURL = guildLog.banLogWebhookURL;

            if (!webhookURL) {
              const webhook = await channel.createWebhook({
                name: client.user!.displayName,
                avatar: client.user?.avatarURL(),
              });

              webhookURL = webhook.url;
              await guildLog.update({banLogWebhookURL: webhookURL});
            }

            const isValidWebhook = await fetch(webhookURL, {method: 'GET'})
              .then(res => res.ok)
              .catch(() => false);

            if (!isValidWebhook) {
              await guildLog.update({banLogId: null, banLogWebhookURL: null});
              return;
            }

            const webhookClient = new WebhookClient({url: webhookURL});

            const banLogContainer = this.banLogContainer(
              '🔨',
              banId,
              interaction.user,
              targetUser,
              reason,
              {
                durationS,
                durationString,
              },
              proof,
              shouldDm,
              timeCreate,
            );

            await webhookClient.send({
              components: [banLogContainer],
              withComponents: true,
              flags: [MessageFlags.IsComponentsV2],
              allowedMentions: {},
            });

            return;
          } catch {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              `An error occurred while banning ${userMention(targetUser.id)}!`,
            );

            await interaction.editReply({
              components: [errorContainer],
            });

            return;
          }
        },
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
      },
      {
        customId: componentsIds.cancelBanCustomId,
        timeout: 10000,
        onTimeout: async () => {
          ComponentManager.getComponentManager().unregisterMany([
            componentsIds.cancelBanCustomId,
            componentsIds.confirmBanCustomId,
          ]);

          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'This request has expired. Please try again.',
          );

          await message.edit({
            components: [errorContainer],
          });

          setTimeout(async () => {
            await message.delete().catch(() => null);
          }, 5000);

          return;
        },
        handler: async (interaction: ButtonInteraction) => {
          ComponentManager.getComponentManager().unregisterMany([
            componentsIds.confirmBanCustomId,
            componentsIds.cancelBanCustomId,
          ]);

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

          setTimeout(async () => {
            await message.delete().catch(() => null);
          }, 5000);

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

  parseDuration(duration: string | null): {
    durationS: number | null;
    durationString: string | null;
  } {
    const durationS = parseDuration(duration);
    if (!durationS) {
      return {
        durationS,
        durationString: null,
      };
    }

    const durationString = humanizeDuration(durationS);
    return {
      durationS,
      durationString,
    };
  }

  banDmContainer(
    guild: Guild,
    infoEmoji: unknown,
    banId: string,
    userExcute: User,
    reason: string,
    duration: {
      durationS: number | null;
      durationString: string;
    },
    proof: Attachment | null,
    timeCreate: number,
  ): ContainerBuilder {
    const banDmContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.red())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} You were banned from ${inlineCode(guild.name)}`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('Ban ID:')} ${inlineCode(banId)}\n` +
            `${bold('Banned by:')} ${userMention(userExcute.id)}\n` +
            `${bold('Reason:')} ${reason}\n` +
            `${bold('Duration:')} ${duration.durationString} (${duration.durationS ? time(timeCreate + duration.durationS, TimestampStyles.FullDateShortTime) : ''})\n`,
        ),
      );

    if (proof) {
      banDmContainer.addSeparatorComponents(separator => separator);
      banDmContainer.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(bold('Proof:')),
      );
      banDmContainer.addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(proof.url)),
      );
    }

    banDmContainer.addSeparatorComponents(separator => separator);
    banDmContainer.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        subtext(
          `This request was executed at ${time(timeCreate, TimestampStyles.FullDateShortTime)}`,
        ),
      ),
    );

    return banDmContainer;
  }

  banSuccessContainer(
    successEmoji: unknown,
    failedEmoji: unknown,
    banId: string,
    targetUser: User,
    reason: string,
    duration: {
      durationS: number | null;
      durationString: string;
    },
    proof: Attachment | null,
    dm: boolean,
    timeCreate: number,
  ): ContainerBuilder {
    const banSuccessContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.green())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${successEmoji} Successfully banned ${userMention(targetUser.id)} from the server!`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('Ban ID:')} ${inlineCode(banId)}\n` +
            `${bold('Reason:')} ${reason}\n` +
            `${bold('Duration:')} ${duration.durationString} ${duration.durationS ? `(${time(timeCreate + duration.durationS, TimestampStyles.FullDateShortTime)})` : ''}\n` +
            `${bold('User notified:')} ${dm ? successEmoji : failedEmoji}`,
        ),
      );

    if (proof) {
      banSuccessContainer.addSeparatorComponents(separator => separator);
      banSuccessContainer.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(bold('Proof:')),
      );
      banSuccessContainer.addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(proof.url)),
      );
    }

    banSuccessContainer.addSeparatorComponents(separator => separator);
    banSuccessContainer.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        subtext(
          `This request was executed at ${time(timeCreate, TimestampStyles.FullDateShortTime)}`,
        ),
      ),
    );

    return banSuccessContainer;
  }

  banLogContainer(
    infoEmoji: unknown,
    banId: string,
    userExcute: User,
    targetUser: User,
    reason: string,
    duration: {
      durationS: number | null;
      durationString: string;
    },
    proof: Attachment | null,
    dm: boolean,
    timeCreate: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder()
      .setAccentColor(EmbedColors.red())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${infoEmoji} Banned user`),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('Ban ID:')} ${inlineCode(banId)}\n` +
            `${bold('Banned user:')} ${userMention(targetUser.id)}\n` +
            `${bold('Moderator:')} ${userMention(userExcute.id)}\n` +
            `${bold('Reason:')} ${reason}\n` +
            `${bold('Duration:')} ${duration.durationString} ${duration.durationS ? `(${time(timeCreate + duration.durationS, TimestampStyles.FullDateShortTime)})` : ''}\n` +
            `${bold('User notified:')} ${dm ? '✅' : '❌'}`,
        ),
      );

    if (proof) {
      container.addSeparatorComponents(separator => separator);
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(bold('Proof:')),
      );
      container.addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(proof.url)),
      );
    }

    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        subtext(
          `Executed at ${time(timeCreate, TimestampStyles.FullDateShortTime)}`,
        ),
      ),
    );

    return container;
  }

  banConfirmContainer(
    infoEmoji: unknown,
    failedEmoji: unknown,
    successEmoji: unknown,
    componentsIds: {
      confirmBanCustomId: string;
      cancelBanCustomId: string;
    },
    targetUser: User,
    reason: string,
    duration: {
      durationS: number | null;
      durationString: string;
    },
    proof: Attachment | null,
    dm: boolean,
    timeCreate: number,
  ): ContainerBuilder {
    const banConfirmContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Are you sure you want to ban ${userMention(targetUser.id)} from the server?`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('Reason:')} ${reason}\n` +
            `${bold('Duration:')} ${duration.durationString} ${duration.durationS ? `(${time(timeCreate + duration.durationS, TimestampStyles.FullDateShortTime)})` : ''}\n` +
            `${bold('User notified:')} ${dm ? successEmoji : failedEmoji}`,
        ),
      );

    if (proof) {
      banConfirmContainer.addSeparatorComponents(separator => separator);
      banConfirmContainer.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(bold('Proof:')),
      );
      banConfirmContainer.addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(proof.url)),
      );
    }

    banConfirmContainer.addSeparatorComponents(separator => separator);
    banConfirmContainer.addSectionComponents(section =>
      section
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(subtext('Please click this button to confirm')),
        )
        .setButtonAccessory(button =>
          button
            .setCustomId(componentsIds.confirmBanCustomId)
            .setLabel('✅')
            .setStyle(ButtonStyle.Danger),
        ),
    );
    banConfirmContainer.addSeparatorComponents(separator => separator);
    banConfirmContainer.addSectionComponents(section =>
      section
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(subtext('Please click this button to cancel')),
        )
        .setButtonAccessory(button =>
          button
            .setCustomId(componentsIds.cancelBanCustomId)
            .setLabel('❌')
            .setStyle(ButtonStyle.Success),
        ),
    );
    banConfirmContainer.addSeparatorComponents(separator => separator);
    banConfirmContainer.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(
        subtext(
          `${infoEmoji} This request will automatically expire after ${time(timeCreate + 10, TimestampStyles.RelativeTime)}`,
        ),
      ),
    );
    return banConfirmContainer;
  }
}
