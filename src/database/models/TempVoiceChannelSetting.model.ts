import {
  Model,
  InferCreationAttributes,
  InferAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class TempVoiceChannelSetting extends Model<
  InferAttributes<TempVoiceChannelSetting>,
  InferCreationAttributes<TempVoiceChannelSetting>
> {
  declare userId: string;
  declare channelName: string;
  declare channelLimit: number;
  declare lastJoinTimestamp: number | null;
}

export function initTempVoiceChannelSetting(
  sequelizeInstance: Sequelize,
): void {
  sequelize = sequelizeInstance;
  TempVoiceChannelSetting.init(
    {
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      channelName: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      channelLimit: {
        type: DataTypes.NUMBER,
        allowNull: false,
        defaultValue: 0,
      },
      lastJoinTimestamp: {
        type: DataTypes.BIGINT,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      tableName: 'TempVoiceChannelSetting',
      timestamps: false,
    },
  );
}

export default TempVoiceChannelSetting;
