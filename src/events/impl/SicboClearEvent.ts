import Event from '../Event';
import {Events} from 'discord.js';
import SicboSession from '../../database/models/SicboSession.model';

export default class SicboClearEvent extends Event {
  constructor() {
    super(Events.ClientReady, true);
  }

  async run() {
    try {
      const runningSessions = await SicboSession.findAll({
        where: {
          isRunning: true,
        },
      });

      if (runningSessions.length > 0) {
        await SicboSession.destroy({
          where: {
            isRunning: true,
          },
        });
      }
    } catch {
      //
    }
  }
}
