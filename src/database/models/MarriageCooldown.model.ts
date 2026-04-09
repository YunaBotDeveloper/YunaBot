import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

class MarriageCooldown extends Model<
  InferAttributes<MarriageCooldown>,
  InferCreationAttributes<MarriageCooldown>
> {
  declare userId: string;
  declare guildId: string;
  declare lastDivorcedAt: Date;
}

export function initMarriageCooldownModel(sequelizeInstance: Sequelize): void {
  MarriageCooldown.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      lastDivorcedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: 'MarriageCooldown',
      timestamps: false,
    },
  );
}

export default MarriageCooldown;
