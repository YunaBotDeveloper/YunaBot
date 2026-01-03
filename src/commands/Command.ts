/**
 * Command - Abstract base class for slash commands
 *
 * All slash commands should extend this class and implement the run() method.
 * Optionally override autocomplete() for commands with autocomplete options.
 *
 * Example:
 * ```typescript
 * export default class PingCommand extends Command {
 *   constructor() {
 *     super('ping', 'Check bot latency');
 *     this.advancedOptions.cooldown = 5000; // 5 second cooldown
 *   }
 *   async run(interaction) {
 *     await interaction.reply('Pong!');
 *   }
 * }
 * ```
 */
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import {ICommand} from '../interfaces/ICommand';

export abstract class Command implements ICommand {
  /** Slash command data (name, description, options) */
  public data: SlashCommandBuilder;
  /** Advanced options like cooldown */
  public advancedOptions: {
    cooldown?: number;
  };

  constructor(name: string, description: string) {
    this.data = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description);
    this.advancedOptions = {};
  }

  /**
   * Execute the slash command
   * @param interaction - The command interaction from Discord
   */
  abstract run(interaction: ChatInputCommandInteraction): Promise<void>;

  /**
   * Handle autocomplete for command options
   * Override this method if your command has autocomplete options
   * @param interaction - The autocomplete interaction from Discord
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {}
}
