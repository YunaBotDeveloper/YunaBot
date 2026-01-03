/**
 * @fileoverview Sequelize model for logging channel nuke operations.
 * @module database/models/NukeLog
 */
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

/**
 * Sequelize model for storing nuke operation logs per server.
 * Tracks when channels are nuked (deleted and recreated) with metadata.
 *
 * @class NukeLog
 * @extends Model
 */
class NukeLog extends Model<
  InferAttributes<NukeLog>,
  InferCreationAttributes<NukeLog>
> {
  /** Server/Guild ID (primary key) */
  declare guildId: string;
  /** Unique nuke operation ID */
  declare id: string;
  /** ID of the channel that was nuked */
  declare channelId: string;
  /** ID of the user who performed the nuke */
  declare userId: string;
  /** Reason provided for the nuke operation */
  declare reason: string;
  /** Unix timestamp of when the nuke occurred */
  declare time: number;
}

/**
 * Initialize the NukeLog model with Sequelize instance
 * This function is called in ExtendedClient.initialize()
 * @param sequelizeInstance - The connected Sequelize instance
 */
export function initNukeLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  NukeLog.init(
    {
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      id: {
        type: DataTypes.STRING,
      },
      channelId: {
        type: DataTypes.STRING,
      },
      userId: {
        type: DataTypes.STRING,
      },
      reason: {
        type: DataTypes.STRING,
      },
      time: {
        type: DataTypes.NUMBER,
      },
    },
    {
      sequelize,
      tableName: 'NukeLog',
      timestamps: false,
    },
  );
}

export default NukeLog;
