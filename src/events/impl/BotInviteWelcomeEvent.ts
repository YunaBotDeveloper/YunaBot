import ExtendedClient from '../../classes/ExtendedClient';
import Log4TS from '../../logger/Log4TS';
import {EmbedColors} from '../../util/EmbedColors';
import Event from '../Event';
import {
  AuditLogEvent,
  EmbedBuilder,
  Events,
  Guild,
  RESTJSONErrorCodes,
} from 'discord.js';

export default class BotInviteWelcomeEvent extends Event {
  constructor() {
    super(Events.GuildCreate);
  }

  async run(client: ExtendedClient, guild: Guild) {
    const logging = Log4TS.getLogger();
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
        `${client.user?.displayName} đã được thêm vào server thành công!`,
      )
      .setDescription(
        `Cảm ơn bạn đã thêm ${client.user?.displayName} vào ${guild.name}.\nChúc bạn sử dụng bot vui vẻ!\n\nĐể sử dụng được bot, bạn vui lòng bấm vào [đây](https://docs.nstore.lol) để xem HDSD.`,
      )
      .setFooter({text: 'From Yuna With ❤️'})
      .setTimestamp()
      .setColor(EmbedColors.random());
    try {
      await member.send({embeds: [welcomeEmbed]});
    } catch (error) {
      if (error === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
        return;
      } else {
        logging.error(error);
        console.error(error);
      }
    }
    return;
  }
}
