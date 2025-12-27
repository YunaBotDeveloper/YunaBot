import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

export interface ICommand {
  data: SlashCommandBuilder;
  advancedOptions: {
    cooldown?: number;
  };

  run(interaction: ChatInputCommandInteraction): Promise<void>;
  autocomplete(interaction: AutocompleteInteraction): Promise<void>;
}
