import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildPrefix extends Model<
  InferAttributes<GuildPrefix>,
  InferCreationAttributes<GuildPrefix>
> {
  declare guildId: string;
  declare prefix: string;
}

export function initGuildPrefixModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GuildPrefix.init(
    {
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      prefix: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '!',
      },
    },
    {
      sequelize,
      tableName: 'GuildPrefixes',
      timestamps: false,
    },
  );
}

export default GuildPrefix;
