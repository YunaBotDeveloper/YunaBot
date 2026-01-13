import {
  Sequelize,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class SicboBalance extends Model<
  InferAttributes<SicboBalance>,
  InferCreationAttributes<SicboBalance>
> {
  declare userId: string;
  declare balance: number;
}

export function initSicboBalanceModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  SicboBalance.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      balance: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: 'SicboBalance',
      timestamps: false,
    },
  );
}

export default SicboBalance;
