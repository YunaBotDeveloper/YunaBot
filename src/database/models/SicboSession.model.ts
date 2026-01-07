import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class SicboSession extends Model<
  InferAttributes<SicboSession>,
  InferCreationAttributes<SicboSession>
> {
  declare sessionId: string;
  declare guildId: string;
  declare channelId: string;
  declare messageId: string;
  declare hostId: string;
  declare hostTag: string;
  declare players: string; // JSON string of players map
  declare startTime: number;
  declare duration: number;
  declare isRunning: boolean;
  declare seed: string;
  declare hash: string;
  declare dice1: number | null;
  declare dice2: number | null;
  declare dice3: number | null;
  declare result: string | null; // 'tai' | 'xiu' | 'triple'
}

export function initSicboSessionModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  SicboSession.init(
    {
      sessionId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      channelId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      messageId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hostId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hostTag: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      players: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '{}',
      },
      startTime: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      isRunning: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      seed: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dice1: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dice2: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dice3: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      result: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'SicboSession',
      timestamps: true,
    },
  );
}

export default SicboSession;