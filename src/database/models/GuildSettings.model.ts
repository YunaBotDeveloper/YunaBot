import {
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
    },
    {
      sequelize,
      tableName: 'GuildSettings',
      timestamps: false,
    },
  );
}

export default GuildSettings;
