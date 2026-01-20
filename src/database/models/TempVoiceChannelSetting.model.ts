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
    },
    {
      sequelize,
      tableName: 'TempVoiceChannelSetting',
      timestamps: false,
    },
  );
}

export default TempVoiceChannelSetting;
