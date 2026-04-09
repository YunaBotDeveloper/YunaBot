import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

class CoupleActivity extends Model<
  InferAttributes<CoupleActivity>,
  InferCreationAttributes<CoupleActivity>
> {
  declare userId: string;
  declare guildId: string;
  declare kissCount: number;
  declare hugCount: number;
  declare patCount: number;
  declare lastKissAt: Date | null;
  declare lastHugAt: Date | null;
  declare lastPatAt: Date | null;
  declare lastResetDate: string;
}

export function initCoupleActivityModel(sequelizeInstance: Sequelize): void {
  CoupleActivity.init(
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
      kissCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      hugCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      patCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastKissAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastHugAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastPatAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastResetDate: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: 'CoupleActivity',
      timestamps: false,
    },
  );
}

export default CoupleActivity;
