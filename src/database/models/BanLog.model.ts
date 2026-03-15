import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class BanLog extends Model<
  InferAttributes<BanLog>,
  InferCreationAttributes<BanLog>
> {
  declare guildId: string;
  declare banId: string;
  declare userExcuteId: string;
  declare userTargetId: string;
  declare reason: string | null;
  declare duration: number | null;
  declare proofURL: string | null;
  declare purgeMessage: boolean;
  declare time: number;
}

export function initBanLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  BanLog.init(
    {
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      banId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userExcuteId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userTargetId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      duration: {
        type: DataTypes.NUMBER,
        allowNull: true,
        defaultValue: null,
      },
      proofURL: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      purgeMessage: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      time: {
        type: DataTypes.NUMBER,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'BanLog',
      timestamps: false,
    },
  );
}

export default BanLog;
