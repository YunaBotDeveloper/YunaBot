import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  CreationOptional,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class SicboHistory extends Model<
  InferAttributes<SicboHistory>,
  InferCreationAttributes<SicboHistory>
> {
  declare id: CreationOptional<number>;
  declare guildId: string;
  declare sessionId: string;
  declare result: string; // 'tai' | 'xiu' | 'triple'
  declare dice1: number;
  declare dice2: number;
  declare dice3: number;
  declare total: number;
  declare timestamp: number;
}

export function initSicboHistoryModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  SicboHistory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      result: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dice1: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dice2: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dice3: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'SicboHistory',
      timestamps: false,
      indexes: [
        {
          fields: ['guildId'],
        },
        {
          fields: ['guildId', 'timestamp'],
        },
      ],
    },
  );
}

export default SicboHistory;
