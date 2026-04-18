import {
  bold,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  subtext,
  TimestampStyles,
  time,
  PermissionFlagsBits,
  ButtonInteraction,
  TextDisplayBuilder,
  AutocompleteInteraction,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import PrefixManager from '../../../PrefixManager';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import axios from 'axios';
import {ComponentParser} from '../../../../util/ComponentParser';
import GuildContainer from '../../../../database/models/GuildContainer.model';

export default class SetupCommand extends Command {
  constructor() {
    super('setup', 'Bot setup');

    this.advancedOptions.cooldown = 10000;

    this.data.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

    this.data.addSubcommand(subcommand =>
      subcommand
        .setName('prefix')
        .setDescription('Set bot prefix')
        .addStringOption(option =>
          option
            .setName('prefix')
            .setDescription('Bot prefix')
            .setRequired(true),
        ),
    );

    this.data.addSubcommandGroup(group =>
      group
        .setName('container')
        .setDescription('Manage server container templates')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a container template')
            .addStringOption(option =>
              option
                .setName('name')
                .setDescription('Container template name')
                .setRequired(true)
                .setMaxLength(100),
            )
            .addAttachmentOption(option =>
              option
                .setName('json')
                .setDescription('JSON file containing the container')
                .setRequired(true),
            ),
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a container template')
            .addStringOption(option =>
              option
                .setName('name')
                .setDescription('Container template name')
                .setRequired(true)
                .setAutocomplete(true),
            ),
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('preview')
            .setDescription('Preview a container template')
            .addStringOption(option =>
              option
                .setName('name')
                .setDescription('Container template name')
                .setRequired(true)
                .setAutocomplete(true),
            ),
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all container templates'),
        ),
    );
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const subcommandGroup = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);
    const focusedValue = interaction.options.getFocused().toLowerCase();

    if (subcommandGroup === 'container') {
      switch (subcommand) {
        case 'remove': {
          const containers = await GuildContainer.findAll({
            where: {guildId: interaction.guildId!},
          });

          const choices = containers
            .filter(c => c.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(c => ({name: c.name, value: c.name}));

          await interaction.respond(choices);
          break;
        }

        case 'preview': {
          const containers = await GuildContainer.findAll({
            where: {guildId: interaction.guildId!},
          });

          const choices = containers
            .filter(c => c.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(c => ({name: c.name, value: c.name}));

          await interaction.respond(choices);
          break;
        }
      }
    }

    switch (subcommand) {
      default: {
        //
      }
    }
  }

  async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const message = await interaction.deferReply();

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await message.edit({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subCommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'container') {
      switch (subCommand) {
        case 'add': {
          const name = interaction.options.getString('name', true);
          const attachment = interaction.options.getAttachment('json', true);

          const guildContainer = await GuildContainer.findOne({
            where: {
              guildId: interaction.guild.id,
              name,
            },
          });

          if (guildContainer) {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              'This server already has this container!',
            );

            await message.edit({
              components: [errorContainer],
            });

            setTimeout(async () => {
              await message.delete().catch(() => null);
            }, 5000);

            return;
          }

          let isJSON = false;
          if (
            attachment.contentType &&
            attachment.contentType.startsWith('application/json')
          ) {
            isJSON = true;
          } else if (attachment.url) {
            const url = attachment.url.toLowerCase().split('?')[0];
            isJSON = url.endsWith('.json');

            if (!isJSON) {
              const errorContainer = StatusContainer.failed(
                failedEmoji,
                'Invalid container format! Please try again!',
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

          let jsonText: string;

          try {
            const response = await axios.get<string>(attachment.url, {
              responseType: 'text',
            });

            jsonText = ComponentParser.patch(response.data);
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Invalid JSON file';
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              errorMsg,
            );

            await message.edit({
              components: [errorContainer],
            });

            setTimeout(async () => {
              await message.delete().catch(() => null);
            }, 5000);

            return;
          }

          const componentIds = {
            confirmContainerAddCustomId: `confirmContainer_${interaction.id}`,
            cancelContainerAddCustomId: `cancelContainer_${interaction.id}`,
          };

          const previewText = new TextDisplayBuilder().setContent('Preview:');

          let containers;
          try {
            containers = ComponentParser.parse(jsonText, {
              user: interaction.user,
              guild: interaction.guild,
            });
          } catch {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              'Could not parse the JSON file!',
            );
            await message.edit({components: [errorContainer]});
            setTimeout(async () => {
              await message.delete().catch(() => null);
            }, 5000);
            return;
          }

          const timeCreate = Math.round(Date.now() / 1000);

          const containerAddConfirmContainer =
            this.containerAddConfirmContainer(
              infoEmoji,
              name,
              componentIds,
              timeCreate,
            );

          ComponentManager.getComponentManager().register([
            {
              customId: componentIds.confirmContainerAddCustomId,
              timeout: 10000,
              onTimeout: async () => {
                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
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
                await interaction.update({
                  components: [loadingContainer],
                });

                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
                ]);

                try {
                  await GuildContainer.upsert({
                    guildId: interaction.guild!.id,
                    name,
                    json: jsonText,
                  });
                } catch {
                  const errorContainer = StatusContainer.failed(
                    failedEmoji,
                    'An error occurred while saving the container!',
                  );
                  await interaction.editReply({components: [errorContainer]});
                  setTimeout(async () => {
                    await message.delete().catch(() => null);
                  }, 5000);
                  return;
                }

                const successContainer = StatusContainer.success(
                  successEmoji,
                  `Container ${inlineCode(name)} has been successfully added to the server!`,
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
            {
              customId: componentIds.cancelContainerAddCustomId,
              timeout: 10000,
              onTimeout: async () => {
                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
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
                  componentIds.confirmContainerAddCustomId,
                  componentIds.cancelContainerAddCustomId,
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

          await message.edit({
            components: [containerAddConfirmContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          await interaction.followUp({
            components: [previewText, ...containers],
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          });

          break;
        }

        case 'remove': {
          const name = interaction.options.getString('name', true);

          const guildContainer = await GuildContainer.findOne({
            where: {
              guildId: interaction.guild!.id,
              name,
            },
          });

          if (!guildContainer) {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              `This server has no container named ${inlineCode(name)}!`,
            );

            await message.edit({
              components: [errorContainer],
            });

            setTimeout(async () => {
              await message.delete().catch(() => null);
            }, 5000);

            return;
          }

          const componentIds = {
            confirmContainerRemoveCustomId: `confirmContainer_${interaction.id}`,
            cancelContainerRemoveCustomId: `cancelContainer_${interaction.id}`,
          };

          const previewText = new TextDisplayBuilder().setContent('Preview:');

          const containers = ComponentParser.parse(guildContainer.json, {
            user: interaction.user,
            guild: interaction.guild,
          });

          const timeCreate = Math.round(Date.now() / 1000);

          ComponentManager.getComponentManager().register([
            {
              customId: componentIds.confirmContainerRemoveCustomId,
              timeout: 10000,
              onTimeout: async () => {
                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerRemoveCustomId,
                  componentIds.cancelContainerRemoveCustomId,
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
                  componentIds.confirmContainerRemoveCustomId,
                  componentIds.cancelContainerRemoveCustomId,
                ]);

                await interaction.update({
                  components: [loadingContainer],
                });

                await GuildContainer.destroy({
                  where: {
                    guildId: interaction.guild!.id,
                    name,
                  },
                });

                const successContainer = StatusContainer.success(
                  successEmoji,
                  `Successfully deleted container ${inlineCode(name)}!`,
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
            {
              customId: componentIds.cancelContainerRemoveCustomId,
              timeout: 10000,
              onTimeout: async () => {
                ComponentManager.getComponentManager().unregisterMany([
                  componentIds.confirmContainerRemoveCustomId,
                  componentIds.cancelContainerRemoveCustomId,
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
                  componentIds.confirmContainerRemoveCustomId,
                  componentIds.cancelContainerRemoveCustomId,
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

          const containerRemoveConfirmContainer =
            this.containerRemoveConfirmContainer(
              infoEmoji,
              name,
              componentIds,
              timeCreate,
            );

          await message.edit({
            components: [containerRemoveConfirmContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          await interaction.followUp({
            components: [previewText, ...containers],
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          });

          break;
        }

        case 'preview': {
          const name = interaction.options.getString('name', true);

          const guildContainer = await GuildContainer.findOne({
            where: {
              guildId: interaction.guild.id,
              name,
            },
          });

          if (!guildContainer) {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              `This server has no container named ${inlineCode(name)}!`,
            );

            await message.edit({
              components: [errorContainer],
            });

            setTimeout(async () => {
              await message.delete().catch(() => null);
            });

            return;
          }

          const timeCreate = Math.round(Date.now() / 1000);

          const deleteAfterText = new TextDisplayBuilder().setContent(
            subtext(
              `${infoEmoji} This request will automatically expire after ${time(timeCreate + 60, TimestampStyles.RelativeTime)}`,
            ),
          );

          const containers = ComponentParser.parse(guildContainer.json, {
            user: interaction.user,
            guild: interaction.guild,
          });

          await message.edit({
            components: [...containers, deleteAfterText],
            flags: [MessageFlags.IsComponentsV2],
          });

          setTimeout(async () => {
            await message.delete().catch(() => null);
          }, 60000);

          break;
        }

        case 'list': {
          const containers = await GuildContainer.findAll({
            where: {
              guildId: interaction.guild.id,
            },
          });

          if (containers.length === 0) {
            const errorContainer = StatusContainer.failed(
              failedEmoji,
              'This server has no container templates!',
            );

            await message.edit({
              components: [errorContainer],
            });

            setTimeout(async () => {
              await message.delete().catch(() => null);
            }, 5000);

            return;
          }

          const containerNames = containers
            .map((c, index) => `${index + 1}. ${inlineCode(c.name)}`)
            .join('\n');

          const listContainer = new ContainerBuilder()
            .setAccentColor(EmbedColors.blue())
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                `## ${infoEmoji} Container Templates\n` +
                  `This server has ${bold(containers.length.toString())} container(s):\n\n` +
                  containerNames,
              ),
            );

          await message.edit({
            components: [listContainer],
            flags: [MessageFlags.IsComponentsV2],
          });

          break;
        }
      }
      return;
    }

    switch (subCommand) {
      case 'prefix': {
        const prefixManager = PrefixManager.getInstance();

        const oldPrefix = await prefixManager.getPrefix(interaction.guild.id);
        const newPrefix = interaction.options.getString('prefix', true);

        if (oldPrefix === newPrefix) {
          const errorContainer = StatusContainer.failed(
            failedEmoji,
            'Old and new prefixes cannot be the same!',
          );

          await message.edit({
            components: [errorContainer],
          });

          setTimeout(async () => {
            await message.delete().catch(() => null);
          }, 5000);

          return;
        }

        const componentIds = {
          confirmPrefixCustomId: `confirmPrefix_${interaction.id}`,
          cancelPrefixCustomId: `cancelPrefix_${interaction.id}`,
        };

        const timeCreate = Math.round(Date.now() / 1000);

        const prefixConfirmContainer = this.prefixConfirmContainer(
          infoEmoji,
          oldPrefix,
          newPrefix,
          componentIds,
          timeCreate,
        );

        ComponentManager.getComponentManager().register([
          {
            customId: componentIds.confirmPrefixCustomId,
            timeout: 10000,
            onTimeout: async () => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
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
            },
            handler: async (interaction: ButtonInteraction) => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
              ]);

              await interaction.update({
                components: [loadingContainer],
              });

              await prefixManager.setPrefix(interaction.guild!.id, newPrefix);

              const successContainer = StatusContainer.success(
                successEmoji,
                `Set bot prefix to ${inlineCode(newPrefix)}`,
              );

              await interaction.editReply({
                components: [successContainer],
              });

              setTimeout(async () => {
                await message.delete().catch(() => null);
              }, 5000);
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
          {
            customId: componentIds.cancelPrefixCustomId,
            timeout: 10000,
            onTimeout: async () => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
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
            },
            handler: async (interaction: ButtonInteraction) => {
              ComponentManager.getComponentManager().unregisterMany([
                componentIds.confirmPrefixCustomId,
                componentIds.cancelPrefixCustomId,
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
            },
            type: ComponentEnum.BUTTON,
            userCheck: [interaction.user.id],
          },
        ]);

        await message.edit({
          components: [prefixConfirmContainer],
        });
        break;
      }
    }
  }

  prefixConfirmContainer(
    infoEmoji: unknown,
    oldPrefix: string,
    newPrefix: string,
    componentIds: {
      confirmPrefixCustomId: string;
      cancelPrefixCustomId: string;
    },
    timeCreate: number,
  ): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Are you sure you want to change the bot prefix?`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('Old prefix:')} ${inlineCode(oldPrefix)}\n` +
            `${bold('New prefix:')} ${inlineCode(newPrefix)}`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Please click this button to confirm'),
            ),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.confirmPrefixCustomId)
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Please click this button to cancel'),
            ),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.cancelPrefixCustomId)
              .setLabel('❌')
              .setStyle(ButtonStyle.Success),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `${infoEmoji} This request will automatically expire after ${time(timeCreate + 10, TimestampStyles.RelativeTime)}`,
          ),
        ),
      );
  }

  containerAddConfirmContainer(
    infoEmoji: unknown,
    containerName: string,
    componentIds: {
      confirmContainerAddCustomId: string;
      cancelContainerAddCustomId: string;
    },
    timeCreate: number,
  ): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Are you sure you want to add container ${inlineCode(containerName)}?`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Please click this button to confirm'),
            ),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.confirmContainerAddCustomId)
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Please click this button to cancel'),
            ),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.cancelContainerAddCustomId)
              .setLabel('❌')
              .setStyle(ButtonStyle.Success),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `${infoEmoji} This request will automatically expire after ${time(timeCreate + 10, TimestampStyles.RelativeTime)}`,
          ),
        ),
      );
  }

  containerRemoveConfirmContainer(
    infoEmoji: unknown,
    containerName: string,
    componentIds: {
      confirmContainerRemoveCustomId: string;
      cancelContainerRemoveCustomId: string;
    },
    timeCreate: number,
  ): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Are you sure you want to remove container ${inlineCode(containerName)}?`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Please click this button to confirm'),
            ),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.confirmContainerRemoveCustomId)
              .setLabel('✅')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(textDisplay =>
            textDisplay.setContent(
              subtext('Please click this button to cancel'),
            ),
          )
          .setButtonAccessory(button =>
            button
              .setCustomId(componentIds.cancelContainerRemoveCustomId)
              .setLabel('❌')
              .setStyle(ButtonStyle.Danger),
          ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            `${infoEmoji} This request will automatically expire after ${time(timeCreate + 10, TimestampStyles.RelativeTime)}`,
          ),
        ),
      );
  }
}
