import {Events, Message, EmbedBuilder} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {CooldownManager} from '../../commands/CooldownManager';
import Config from '../../config/Config';
import Log4TS from '../../logger/Log4TS';
import {EmbedColors} from '../../util/EmbedColors';

const logging = Log4TS.getLogger();

export default class PrefixCommandHandler extends Event {
  constructor() {
    super(Events.MessageCreate);
  }
  async run(client: ExtendedClient, message: Message): Promise<void> {
    const prefix = Config.getInstance().prefix;
    if (!prefix || message.author.bot || !message.content.startsWith(prefix))
      return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;
    const command = client.commandManager.getPrefixCommand(commandName);
    if (!command) return;

    const cooldownManager = CooldownManager.getCooldownManager();
    const cooldown = command.cooldown || 0;
    const userId = message.author.id;

    if (cooldownManager.isInCooldown(commandName, userId)) {
      const expirationTimestamp = cooldownManager.getExpirationTimestamp(
        commandName,
        userId,
      );
      if (expirationTimestamp) {
        const discordTimestamp = Math.floor(expirationTimestamp / 1000);
        const errEmbed = new EmbedBuilder()
          .setAuthor({
            name: message.author.displayName,
            iconURL: message.author.displayAvatarURL(),
          })
          .setColor(EmbedColors.red())
          .setTitle('❌ Error ❌')
          .setDescription(
            `Error while excuting command:\nYou must wait <t:${Math.floor(discordTimestamp)}:R> to re-execute command!`,
          )
          .setFooter({
            text: 'ManagerBot @ 0.0.1',
          })
          .setTimestamp();

        const sent = await message.reply({
          embeds: [errEmbed],
        });
        setTimeout(
          () => {
            sent.delete().catch(logging.error);
          },
          cooldownManager.getRemainingTime(commandName, userId),
        );
      }
      return;
    }

    cooldownManager.setCooldown(commandName, userId, cooldown);

    try {
      await command.run(args, {message: message, client: client});
    } catch (err) {
      if (err) {
        throw err;
      }
    }
  }
}
