import {
  Sequelize,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GameBalance extends Model<
  InferAttributes<GameBalance>,
  InferCreationAttributes<GameBalance>
> {
  declare userId: string;
  declare balance: number;
}

export function initGameBalanceModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GameBalance.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      balance: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: 'GameBalance',
      timestamps: false,
    },
  );
}

export default GameBalance;
