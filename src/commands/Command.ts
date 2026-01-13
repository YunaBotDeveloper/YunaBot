import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  InteractionContextType,
} from 'discord.js';
import {ICommand} from '../interfaces/ICommand';

export abstract class Command implements ICommand {
  public data: SlashCommandBuilder;
  public advancedOptions: {
    cooldown?: number;
  };
  public category?: string;

  constructor(name: string, description: string) {
    this.data = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setContexts(InteractionContextType.Guild);

    this.advancedOptions = {};
  }

  abstract run(interaction: ChatInputCommandInteraction): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {}
}
