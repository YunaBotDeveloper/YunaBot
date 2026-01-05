import {
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js';

export interface IContextMenuCommand {
  data: ContextMenuCommandBuilder;
  advancedOptions: {
    cooldown?: number;
  };

  run(
    interaction:
      | UserContextMenuCommandInteraction
      | MessageContextMenuCommandInteraction,
  ): Promise<void>;
}
