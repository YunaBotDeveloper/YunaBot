import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class NukeLog extends Model<
  InferAttributes<NukeLog>,
  InferCreationAttributes<NukeLog>
> {
  declare guildId: string;
  declare id: string;
  declare channelId: string;
  declare userId: string;
  declare reason: string;
  declare time: number;
}

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
