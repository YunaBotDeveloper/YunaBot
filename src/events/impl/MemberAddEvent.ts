import {Events, GuildMember} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {MemberSyncService} from '../../services/MemberSyncService';

export default class MemberAddEvent extends Event {
  constructor() {
    super(Events.GuildMemberAdd);
  }

  async run(client: ExtendedClient, member: GuildMember): Promise<void> {
    await MemberSyncService.getInstance().upsertMember(member);
  }
}
