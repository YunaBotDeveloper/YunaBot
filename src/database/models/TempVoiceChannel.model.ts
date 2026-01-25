import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class TempVoiceChannel extends Model<
  InferAttributes<TempVoiceChannel>,
  InferCreationAttributes<TempVoiceChannel>
> {
  declare guildId: string;
  declare channelId: string;
}

export function initTempVoiceChannel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  TempVoiceChannel.init(
    {
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      channelId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'TempVoiceChannel',
      timestamps: false,
    },
  );
}

export default TempVoiceChannel;
