import {ChannelType, ChatInputCommandInteraction} from 'discord.js';
import {Command} from '../../Command';

export default class SetupCommand extends Command {
  constructor() {
    super('setup', 'Setup the bot!');

    this.data.addSubcommandGroup(group =>
      group
        .setName('log')
        .setDescription('Setup log channel.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('nuke')
            .setDescription('Set default nuke log')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('Log channel')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
            ),
        ),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);
    switch (subcommandGroup) {
      case 'log': {
        switch (subcommand) {
          case 'nuke': {
            await interaction.reply(
              'ok you successfully executed 2 subcommand!!!!',
            );
          }
        }
      }
    }
  }
}
