import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildLog extends Model<
  InferAttributes<GuildLog>,
  InferCreationAttributes<GuildLog>
> {
  declare guildId: string;
  declare nukeLogId: string;
}

export function initGuildLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GuildLog.init(
    {
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      nukeLogId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
    },
    {sequelize, tableName: 'GuildLog', timestamps: false},
  );
}

export default GuildLog;
