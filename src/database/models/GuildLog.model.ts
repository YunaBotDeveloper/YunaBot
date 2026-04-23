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
  declare altLogChannelId: string | null;
  declare altLogWebhookURL: string | null;
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
      altLogChannelId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      altLogWebhookURL: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'GuildLog',
      timestamps: false,
    },
  );
}

export default GuildLog;
