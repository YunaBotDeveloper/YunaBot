import {Events, GuildMember} from 'discord.js';
import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';

export default class WelcomeEvent extends Event {
  constructor() {
    super(Events.GuildMemberAdd);
  }

  async run(client: ExtendedClient, member: GuildMember) {
    if (member.user.bot) return;

    // try {

    // } catch {

    // }
  }
}
