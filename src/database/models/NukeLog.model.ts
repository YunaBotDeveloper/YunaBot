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
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      channelId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      time: {
        type: DataTypes.NUMBER,
        allowNull: false,
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
