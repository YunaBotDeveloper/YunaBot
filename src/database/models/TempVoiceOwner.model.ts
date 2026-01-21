import {
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class TempVoiceOwner extends Model<
  InferAttributes<TempVoiceOwner>,
  InferCreationAttributes<TempVoiceOwner>
> {
  declare channelId: string;
  declare userId: string;
}

export function initTempVoiceOwner(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  TempVoiceOwner.init(
    {
      channelId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'TempVoiceOwner',
      timestamps: false,
    },
  );
}

export default TempVoiceOwner;
