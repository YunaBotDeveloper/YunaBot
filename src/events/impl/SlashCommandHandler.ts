import {
  ButtonInteraction,
  EmbedBuilder,
  Events,
  Interaction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {ComponentEnum} from '../../enum/ComponentEnum';
import {CooldownManager} from '../../commands/CooldownManager';
import {EmbedColors} from '../../util/EmbedColors';
import Log4TS from '../../logger/Log4TS';

const logging = Log4TS.getLogger();

export default class SlashCommandHandler extends Event {
  constructor() {
    super(Events.InteractionCreate);
  }

  async run(client: ExtendedClient, interaction: Interaction): Promise<void> {
    const cooldownManager = CooldownManager.getCooldownManager();

    if (interaction.isChatInputCommand()) {
      const commandName = interaction.commandName;
      const command = client.commandManager.getSlashCommand(commandName);

      if (!command) return;

      const userId = interaction.user.id;
      const cooldown = command.advancedOptions.cooldown || 0;

      if (cooldownManager.isInCooldown(commandName, userId)) {
        const expirationTimestamp = cooldownManager.getExpirationTimestamp(
          commandName,
          userId,
        );
        if (expirationTimestamp) {
          const errEmbed = new EmbedBuilder()
            .setAuthor({
              name: interaction.user.displayName,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setColor(EmbedColors.red())
            .setTitle('❌ Error ❌')
            .setDescription(
              `Error while excuting command:\nYou must wait <t:${Math.floor(expirationTimestamp / 1000)}:R> to re-execute command!`,
            )
            .setFooter({
              text: 'ManagerBot @ 0.0.1',
            })
            .setTimestamp();
          await interaction.reply({
            embeds: [errEmbed],
            flags: 'Ephemeral',
          });
        }
        return;
      }

      cooldownManager.setCooldown(commandName, userId, cooldown);

      try {
        await command?.run(interaction);
      } catch (e) {
        logging.error(e);
        console.error(e);
      }
    }
    if (
      interaction.isButton() ||
      interaction.isStringSelectMenu() ||
      interaction.isModalSubmit()
    ) {
      const component = client.components.get(interaction.customId);
      if (!component) return;

      if (
        component.userCheck &&
        !component.userCheck.includes('*') &&
        !component.userCheck.includes(interaction.user.id)
      ) {
        const errEmbed = new EmbedBuilder()
          .setAuthor({
            name: interaction.user.displayName,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setColor(EmbedColors.red())
          .setTitle('❌ Error ❌')
          .setDescription(
            "Error while processing your request:\nYou don't have any permission to use this!",
          )
          .setFooter({
            text: 'ManagerBot @ 0.0.1',
          })
          .setTimestamp();
        await interaction.reply({
          embeds: [errEmbed],
          flags: 'Ephemeral',
        });
        return;
      }

      try {
        switch (component.type) {
          case ComponentEnum.BUTTON:
            if (interaction.isButton()) {
              await component.handler(interaction as ButtonInteraction);
            }
            break;
          case ComponentEnum.MENU:
            if (interaction.isStringSelectMenu()) {
              await component.handler(
                interaction as StringSelectMenuInteraction,
              );
            }
            break;
          case ComponentEnum.MODAL:
            if (interaction.isModalSubmit()) {
              await component.handler(interaction as ModalSubmitInteraction);
            }
            break;
          default:
            logging.warning(`Unhandled component type: ${component.type}`);
        }
      } catch (error) {
        logging.error(
          `Error handling component "${interaction.customId}": ` + error,
        );
        if (interaction.replied || interaction.deferred) {
          return;
        }
        const errEmbed = new EmbedBuilder()
          .setAuthor({
            name: interaction.user.displayName,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setColor(EmbedColors.red())
          .setTitle('❌ Error ❌')
          .setDescription('Error while excuting command:\nUnknown error!')
          .setFooter({
            text: 'ManagerBot @ 0.0.1',
          })
          .setTimestamp();
        await interaction.reply({
          embeds: [errEmbed],
          flags: 'Ephemeral',
        });
      }
    }

    if (
      interaction.isUserContextMenuCommand() ||
      interaction.isMessageContextMenuCommand()
    ) {
      const commandName = interaction.commandName;
      const command = client.commandManager.getContextMenuCommand(commandName);

      if (!command) return;

      const userId = interaction.user.id;
      const cooldown = command.advancedOptions.cooldown || 0;

      if (cooldownManager.isInCooldown(commandName, userId)) {
        const expirationTimestamp = cooldownManager.getExpirationTimestamp(
          commandName,
          userId,
        );
        if (expirationTimestamp) {
          const errEmbed = new EmbedBuilder()
            .setAuthor({
              name: interaction.user.displayName,
              iconURL: interaction.user.displayAvatarURL(),
            })
            .setColor(EmbedColors.red())
            .setTitle('❌ Error ❌')
            .setDescription(
              `Error while excuting command:\nYou must wait <t:${Math.floor(expirationTimestamp / 1000)}:R> to re-execute command!`,
            )
            .setFooter({
              text: 'ManagerBot @ 0.0.1',
            })
            .setTimestamp();
          await interaction.reply({
            embeds: [errEmbed],
            flags: 'Ephemeral',
          });
        }
        return;
      }

      cooldownManager.setCooldown(commandName, userId, cooldown);

      try {
        await command.run(
          interaction as
            | UserContextMenuCommandInteraction
            | MessageContextMenuCommandInteraction,
        );
      } catch (e) {
        logging.error(e);
        console.error(e);
      }
    }

    if (interaction.isAutocomplete()) {
      const commandName = interaction.commandName;
      const command = client.commandManager.getSlashCommand(commandName);

      if (!command?.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logging.error(
          `Error during autocomplete for command "${commandName}": ` + error,
        );
      }
    }
  }
}
