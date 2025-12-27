import {ChatInputCommandInteraction} from 'discord.js';
import {Command} from '../../Command';
import {EmbedBuilder} from 'discord.js';
import {EmbedColors} from '../../../util/EmbedColors';

export default class HelpCommand extends Command {
  constructor() {
    super('help', 'Hiển thị toàn bộ lệnh');

    this.advancedOptions.cooldown = 5000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const commands = await interaction.client.application?.commands.fetch();
    const embed: EmbedBuilder = new EmbedBuilder()
      .setTitle('Available Commands:')
      .setFooter({
        text: 'Executed by: ' + interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      });
    const commandArray: string[] = [];

    commands.forEach(async command => {
      const commandText = '`/' + command.name + '`: ' + command.description;
      commandArray.push(commandText);

      return commandArray;
    });

    const formattedArray = commandArray.join('\n');
    embed.setDescription(formattedArray);
    embed.setColor(EmbedColors.green());
    await interaction.editReply({
      embeds: [embed],
    });
  }
}
