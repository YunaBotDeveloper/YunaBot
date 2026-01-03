import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
} from 'sequelize';
import ExtendedClient from '../../classes/ExtendedClient';

const client = new ExtendedClient();
const sequelize = client.database.getSequelize();

class NukeLog extends Model<
  InferAttributes<NukeLog>,
  InferCreationAttributes<NukeLog>
> {
  declare guildId: string;
  declare id: string;
  declare channelId: string;
  declare userId: string;
  declare reason: string;
  declare time: Date;
}

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
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName: 'NukeLog',
    timestamps: false,
  },
);

export default NukeLog;
