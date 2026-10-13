import ExtendedClient from '../../classes/ExtendedClient';
import Log4TS from '../../logger/Log4TS';
import Event from '../Event';
import {Events} from 'discord.js';

const logger = Log4TS.getLogger();
export default class ReadyEvent extends Event {
  constructor() {
    super(Events.ClientReady, true);
  }
  async run(client: ExtendedClient) {
    logger.success(client.user?.username + ' is now ready');
  }
}
