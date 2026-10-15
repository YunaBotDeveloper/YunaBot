import {
  AnySelectMenuInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Events,
  Interaction,
  MessageContextMenuCommandInteraction,
  MessageFlags,
  ModalSubmitInteraction,
  RepliableInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {ComponentEnum} from '../../enum/ComponentEnum';
import {CooldownManager} from '../../commands/CooldownManager';
import Log4TS from '../../logger/Log4TS';
import {StatusContainer} from '../../util/StatusContainer';

const logging = Log4TS.getLogger();

type CommandInteraction =
  | ChatInputCommandInteraction
  | UserContextMenuCommandInteraction
  | MessageContextMenuCommandInteraction;

type ComponentInteraction =
  ButtonInteraction | AnySelectMenuInteraction | ModalSubmitInteraction;

export default class SlashCommandHandler extends Event {
  constructor() {
    super(Events.InteractionCreate);
  }

  async run(client: ExtendedClient, interaction: Interaction): Promise<void> {
    if (interaction.user.bot) return;

    if (interaction.isAutocomplete()) {
      const command = client.commandManager.getSlashCommand(
        interaction.commandName,
      );
      try {
        await command?.autocomplete(interaction);
      } catch (error) {
        logging.error(
          `Error during autocomplete for "${interaction.commandName}": ${error}`,
        );
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commandManager.getSlashCommand(
        interaction.commandName,
      );
      if (command) {
        await this.execute(client, interaction, command.advancedOptions, () =>
          command.run(interaction),
        );
      }
      return;
    }

    if (
      interaction.isUserContextMenuCommand() ||
      interaction.isMessageContextMenuCommand()
    ) {
      const command = client.commandManager.getContextMenuCommand(
        interaction.commandName,
      );
      if (command) {
        await this.execute(client, interaction, command.advancedOptions, () =>
          command.run(interaction),
        );
      }
      return;
    }

    if (
      interaction.isButton() ||
      interaction.isAnySelectMenu() ||
      interaction.isModalSubmit()
    ) {
      await this.handleComponent(client, interaction);
    }
  }

  private async execute(
    client: ExtendedClient,
    interaction: CommandInteraction,
    options: {cooldown?: number},
    run: () => Promise<void>,
  ): Promise<void> {
    const cooldowns = CooldownManager.getCooldownManager();
    const {commandName, user} = interaction;

    if (cooldowns.isInCooldown(commandName, user.id)) {
      const expiresAt =
        cooldowns.getExpirationTimestamp(commandName, user.id) ?? Date.now();
      await this.fail(
        client,
        interaction,
        `You need to wait <t:${Math.floor(expiresAt / 1000)}:R> more to use this command!`,
      );
      return;
    }

    if (options.cooldown) {
      cooldowns.setCooldown(commandName, user.id, options.cooldown);
    }

    try {
      await run();
    } catch (error) {
      logging.error(`Error running command "${commandName}": ${error}`);
      console.error(error);
      await this.fail(client, interaction, 'Something went wrong.');
    }
  }

  private async handleComponent(
    client: ExtendedClient,
    interaction: ComponentInteraction,
  ): Promise<void> {
    const component = client.components.get(interaction.customId);
    if (!component) return;

    const typeMatches = {
      [ComponentEnum.BUTTON]: interaction.isButton(),
      [ComponentEnum.MENU]: interaction.isAnySelectMenu(),
      [ComponentEnum.MODAL]: interaction.isModalSubmit(),
    }[component.type];
    if (!typeMatches) return;

    const {userCheck} = component;
    if (
      userCheck &&
      !userCheck.includes('*') &&
      !userCheck.includes(interaction.user.id)
    ) {
      await this.fail(
        client,
        interaction,
        "You don't have permission to use this feature.",
      );
      return;
    }

    try {
      await component.handler(interaction);
    } catch (error) {
      logging.error(
        `Error handling component "${interaction.customId}": ${error}`,
      );
      console.error(error);
      await this.fail(client, interaction, 'Something went wrong.');
    }
  }

  private async fail(
    client: ExtendedClient,
    interaction: RepliableInteraction,
    message: string,
  ): Promise<void> {
    if (interaction.replied || interaction.deferred) return;

    const emoji = await client.api.emojiAPI.getEmojiByName('ui_error');
    await interaction.reply({
      components: [StatusContainer.failed(emoji, message)],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  }
}
