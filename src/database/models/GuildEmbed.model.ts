import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildEmbed extends Model<
  InferAttributes<GuildEmbed>,
  InferCreationAttributes<GuildEmbed>
> {
  declare guildId: string;
  declare name: string;
  declare json: string;
}

export function initGuildEmbedModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GuildEmbed.init(
    {
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      json: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'GuildEmbed',
      timestamps: false,
    },
  );
}

export default GuildEmbed;
