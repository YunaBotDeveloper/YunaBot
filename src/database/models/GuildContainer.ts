import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildContainer extends Model<
  InferAttributes<GuildContainer>,
  InferCreationAttributes<GuildContainer>
> {
  declare guildId: string;
  declare name: string;
  declare json: string;
}

export function initGuildContainerModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GuildContainer.init(
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
      tableName: 'GuildContainer',
      timestamps: false,
    },
  );
}

export default GuildContainer;
