import {
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
  ApplicationCommandType,
} from 'discord.js';

export abstract class ContextMenuCommand {
  public data: ContextMenuCommandBuilder;
  public advancedOptions: {
    cooldown?: number;
  };

  constructor(
    name: string,
    type: ApplicationCommandType.User | ApplicationCommandType.Message,
  ) {
    this.data = new ContextMenuCommandBuilder().setName(name).setType(type);
    this.advancedOptions = {};
  }

  abstract run(
    interaction:
      UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction,
  ): Promise<void>;
}
