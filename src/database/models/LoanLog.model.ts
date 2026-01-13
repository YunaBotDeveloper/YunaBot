import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class LoanLog extends Model<
  InferAttributes<LoanLog>,
  InferCreationAttributes<LoanLog>
> {
  declare loanId: string;
  declare userId: string;
  declare amount: number;
  declare interestRate: number;
  declare totalOwed: number;
  declare takenAt: number;
  declare dueDate: number;
  declare repaidAt: number | null;
  declare isPaid: boolean;
}

export function initLoanLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  LoanLog.init(
    {
      loanId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.NUMBER,
        allowNull: false,
      },
      interestRate: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      totalOwed: {
        type: DataTypes.NUMBER,
        allowNull: false,
      },
      takenAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      dueDate: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      repaidAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        defaultValue: null,
      },
      isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      tableName: 'LoanLog',
      timestamps: false,
    },
  );
}

export default LoanLog;
