import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildEvent extends Model<
  InferAttributes<GuildEvent>,
  InferCreationAttributes<GuildEvent>
> {
  declare guildId: string;
  declare welcomeChannelId: string | null;
  declare welcomeChannelContainer: string | null;
  declare goodbyeChannelId: string | null;
  declare goodbyeChannelContainer: string | null;
  declare boostChannelId: string | null;
  declare boostChannelContainer: string | null;
}

export function initGuildEvent(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GuildEvent.init(
    {
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      welcomeChannelId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      welcomeChannelContainer: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      goodbyeChannelId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      goodbyeChannelContainer: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      boostChannelId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      boostChannelContainer: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      tableName: 'GuildEvent',
      timestamps: false,
    },
  );
}

export default GuildEvent;
