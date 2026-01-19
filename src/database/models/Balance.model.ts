import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class Balance extends Model<
  InferAttributes<Balance>,
  InferCreationAttributes<Balance>
> {
  declare userId: string;
  declare balance: number;
  declare creditScore?: number;
}

export function initBalanceModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  Balance.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      balance: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 1000,
      },
      creditScore: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 500,
      },
    },
    {
      sequelize,
      tableName: 'Balance',
      timestamps: false,
    },
  );
}

export default Balance;
