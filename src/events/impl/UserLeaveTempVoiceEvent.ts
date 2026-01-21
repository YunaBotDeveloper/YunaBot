import Log4TS from '../../logger/Log4TS';
import Event from '../Event';
import {Events, VoiceState} from 'discord.js';
import TempVoiceOwner from '../../database/models/TempVoiceOwner.model';
import ExtendedClient from '../../classes/ExtendedClient';

const logger = Log4TS.getLogger();

export default class UserLeaveTempVoiceEvent extends Event {
  constructor() {
    super(Events.VoiceStateUpdate, false);
  }

  async run(
    client: ExtendedClient,
    oldState: VoiceState,
    newState: VoiceState,
  ) {
    try {
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const oldChannel = oldState.channel;
        const guild = oldState.guild;

        if (!oldChannel || !guild) {
          return;
        }

        const tempVoiceOwner = await TempVoiceOwner.findOne({
          where: {channelId: oldChannel.id},
        });

        if (!tempVoiceOwner) {
          return;
        }

        if (oldChannel.isVoiceBased() && oldChannel.members.size === 0) {
          try {
            await oldChannel.delete();
            await tempVoiceOwner.destroy();
          } catch (error) {
            logger.error(
              `Failed to delete channel ${oldChannel.name}: ${error}`,
            );
          }
        }
      }
    } catch (error) {
      logger.error(`Error in UserLeaveTempVoiceEvent: ${error}`);
    }
  }
}
