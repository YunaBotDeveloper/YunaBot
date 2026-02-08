import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
  CreationOptional,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class LoveLog extends Model<
  InferAttributes<LoveLog>,
  InferCreationAttributes<LoveLog>
> {
  declare id: CreationOptional<number>;
  declare user1Id: string;
  declare user2Id: string;
  declare percentage: number;
  declare guildId: string;
  declare createdAt: CreationOptional<Date>;
}

export function initLoveLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  LoveLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user1Id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user2Id: {
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
    {sequelize, tableName: 'LoveLog', timestamps: false},
  );
}

export default LoveLog;
