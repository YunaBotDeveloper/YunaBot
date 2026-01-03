import {PrefixCommand} from '../../PrefixCommand';
import ExtendedClient from '../../../classes/ExtendedClient';
import {EmbedBuilder, Message} from 'discord.js';
import PrefixManager from '../../PrefixManager';
import {EmbedColors} from '../../../util/EmbedColors';

export default class HelpCommand extends PrefixCommand {
  constructor() {
    super('help', ['h'], 5000);
  }
  async run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ): Promise<void> {
    const commands = context.client.commandManager.getAllPrefixCommand();
    const prefixManager = PrefixManager.getInstance();
    const prefix = context.message.guild
      ? await prefixManager.getPrefix(context.message.guild.id)
      : prefixManager.getDefaultPrefix();

    const embed = new EmbedBuilder().setTitle('Available Command:').setFooter({
      text: 'Executed by: ' + context.message.author.tag,
      iconURL: context.message.author.displayAvatarURL(),
    });
    let commandList = '';
    commands.forEach(cmd => {
      commandList +=
        `\`${prefix}` +
        cmd.name +
        '` - Alias: ' +
        (cmd.aliases.length > 0 ? cmd.aliases.join(' | ') + '\n' : 'none\n');
    });

    embed.setDescription(commandList);
    embed.setColor(EmbedColors.green());
    await context.message.reply({
      embeds: [embed],
    });

    await context.message.delete();
  }
}
