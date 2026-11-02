import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildSettings extends Model<
  InferAttributes<GuildSettings>,
  InferCreationAttributes<GuildSettings>
> {
  declare guildId: string;
  declare botName: string | null;
  declare botBio: string | null;
  declare botAvatar: string | null;
  declare botBanner: string | null;
  declare banLogEnabled: CreationOptional<boolean>;
  declare banLogChannelId: string | null;
}

export function initGuildSettingsModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;

  GuildSettings.init(
    {
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      botName: {
        type: DataTypes.STRING,
      },
      botBio: {
        type: DataTypes.STRING,
      },
      botAvatar: {
        type: DataTypes.STRING,
      },
      botBanner: {
        type: DataTypes.STRING,
      },
      banLogEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      banLogChannelId: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      tableName: 'GuildSettings',
      timestamps: false,
    },
  );
}

export default GuildSettings;
