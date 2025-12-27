import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import {ICommand} from '../interfaces/ICommand';

export abstract class Command implements ICommand {
  public data: SlashCommandBuilder;
  public advancedOptions: {
    cooldown?: number;
  };

  constructor(name: string, description: string) {
    this.data = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description);
    this.advancedOptions = {};
  }

  abstract run(interaction: ChatInputCommandInteraction): Promise<void>;
  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {}
}
