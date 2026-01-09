import ExtendedClient from '../../classes/ExtendedClient';
import Log4TS from '../../logger/Log4TS';
import Event from '../Event';
import {Events} from 'discord.js';
import SicboSession from '../../database/models/SicboSession.model';

const logger = Log4TS.getLogger();

export default class SicboClearEvent extends Event {
  constructor() {
    super(Events.ClientReady, true);
  }

  async run(client: ExtendedClient) {
    try {
      const runningSessions = await SicboSession.findAll({
        where: {
          isRunning: true,
        },
      });

      if (runningSessions.length > 0) {
        logger.info(
          `Found ${runningSessions.length} running Sicbo session(s). Cleaning up...`,
        );

        await SicboSession.destroy({
          where: {
            isRunning: true,
          },
        });

        logger.success(
          `Successfully destroyed ${runningSessions.length} running Sicbo session(s).`,
        );
      } else {
        logger.info('No running Sicbo sessions found to clean up.');
      }
    } catch (error) {
      logger.error('Error cleaning up Sicbo sessions:' + error);
    }
  }
}
