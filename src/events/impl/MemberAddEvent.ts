import {ContainerBuilder, Events, GuildMember, TextChannel} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {MemberSyncService} from '../../services/MemberSyncService';
import {AltDetector, AltDetectorCategory} from 'discord-alt-detector';
import GuildLog from '../../database/models/GuildLog.model';
import {EmbedColors} from '../../util/EmbedColors';

export default class MemberAddEvent extends Event {
  constructor() {
    super(Events.GuildMemberAdd);
  }

  async run(client: ExtendedClient, member: GuildMember): Promise<void> {
    await MemberSyncService.getInstance().upsertMember(member);

    if (member.user.bot) return;

    const altDetector = new AltDetector();
    const result = altDetector.check(member);
    const category = altDetector.getCategory(result);

    const guildLog = await GuildLog.findOne({
      where: {
        guildId: member.guild.id,
      },
    });

    if (!guildLog || !guildLog.altLogChannelId) return;

    const altLogChannel = await client.channels
      .fetch(guildLog.altLogChannelId)
      .catch(() => null);

    if (!altLogChannel) {
      guildLog.altLogChannelId = null;

      await guildLog.save();

      return;
    }

    const altDetectorContainer = this.buildAltDetectorContainer(
      member,
      category,
    );

    await (altLogChannel as TextChannel).send({
      components: [altDetectorContainer],
    });
  }

  buildAltDetectorContainer(
    member: GuildMember,
    category: AltDetectorCategory,
  ): ContainerBuilder {
    const altDetectorContainer = new ContainerBuilder();

    switch (category) {
      case 'mega-suspicious':
      case 'highly-suspicious':
      case 'suspicious': {
        altDetectorContainer.setAccentColor(EmbedColors.red());
        break;
      }

      case 'newbie': {
        altDetectorContainer.setAccentColor(EmbedColors.orange());
      }
    }

    return altDetectorContainer;
  }
}
