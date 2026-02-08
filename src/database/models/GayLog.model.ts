import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
  CreationOptional,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GayLog extends Model<
  InferAttributes<GayLog>,
  InferCreationAttributes<GayLog>
> {
  declare id: CreationOptional<number>;
  declare userId: string;
  declare percentage: number;
  declare guildId: string;
  declare createdAt: CreationOptional<Date>;
}

export function initGayLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GayLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {sequelize, tableName: 'GayLog', timestamps: false},
  );
}

export default GayLog;
