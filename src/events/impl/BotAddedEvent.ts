import ExtendedClient from '../../classes/ExtendedClient';
import GuildLog from '../../database/models/GuildLog.model';
import Log4TS from '../../logger/Log4TS';
import {MemberSyncService} from '../../services/MemberSyncService';
import {EmbedColors} from '../../util/EmbedColors';
import Event from '../Event';
import {
  AuditLogEvent,
  DiscordAPIError,
  EmbedBuilder,
  Events,
  Guild,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from 'discord.js';

const logger = Log4TS.getLogger();

export default class BotAddedEvent extends Event {
  constructor() {
    super(Events.GuildCreate);
  }

  async run(client: ExtendedClient, guild: Guild) {
    // Row may survive a kick that happened while the bot was offline.
    await GuildLog.findOrCreate({
      where: {guildId: guild.id},
      defaults: {guildId: guild.id, nukeLogId: ''},
    });

    MemberSyncService.getInstance()
      .syncGuild(guild)
      .catch(err =>
        logger.error(`[MemberSync] Failed to sync new guild: ${err}`),
      );

    const bot = await guild.members.fetchMe();

    if (!bot.permissions.has(PermissionFlagsBits.Administrator)) {
      await guild.leave();
      return;
    }

    const fetchedLog = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.BotAdd,
    });

    const auditLog = fetchedLog.entries.first();
    const executor = auditLog?.executor;
    if (!auditLog || !executor) return;

    const member = await guild.members.fetch(executor.id);
    const welcomeEmbed = new EmbedBuilder()
      .setAuthor({
        name: member.user.username,
        iconURL: member.user.avatarURL() || undefined,
      })
      .setThumbnail(guild.iconURL())
      .setTitle(
        `${client.user?.displayName} has been successfully added to the server!`,
      )
      .setDescription(
        `Thank you for adding ${client.user?.displayName} to ${guild.name}.\nEnjoy using the bot!\n\nTo get started, click [here](https://docs.nstore.lol) to view the user guide.`,
      )
      .setFooter({text: 'From Yuna With ❤️'})
      .setTimestamp()
      .setColor(EmbedColors.random());
    try {
      await member.send({embeds: [welcomeEmbed]});
    } catch (error) {
      if (
        error instanceof DiscordAPIError &&
        error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser
      ) {
        return;
      } else {
        logger.error(error);
        console.error(error);
      }
    }
    return;
  }
}
