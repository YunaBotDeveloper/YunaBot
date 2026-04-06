import {Events, GuildMember, PartialGuildMember} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {MemberSyncService} from '../../services/MemberSyncService';

export default class MemberRemoveEvent extends Event {
  constructor() {
    super(Events.GuildMemberRemove);
  }

  async run(
    client: ExtendedClient,
    member: GuildMember | PartialGuildMember,
  ): Promise<void> {
    await MemberSyncService.getInstance().removeMember(
      member.user!.id,
      member.guild.id,
    );
  }
}
