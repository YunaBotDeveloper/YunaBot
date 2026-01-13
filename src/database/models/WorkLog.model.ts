import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class WorkLog extends Model<
  InferAttributes<WorkLog>,
  InferCreationAttributes<WorkLog>
> {
  declare userId: string;
  declare jobName: string;
  declare jobEmoji: string;
  declare earnings: number;
  declare tax: number;
  declare netEarnings: number;
  declare failureFee: number;
  declare isSuccess: boolean;
  declare workedAt: number;
}

export function initWorkLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  WorkLog.init(
    {
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jobName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jobEmoji: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      earnings: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 0,
      },
      tax: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 0,
      },
      netEarnings: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 0,
      },
      failureFee: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 0,
      },
      isSuccess: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      workedAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'WorkLog',
      timestamps: false,
    },
  );
}

export default WorkLog;
