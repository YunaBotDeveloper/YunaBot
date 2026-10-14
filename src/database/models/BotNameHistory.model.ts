import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

class BotNameHistory extends Model<
  InferAttributes<BotNameHistory>,
  InferCreationAttributes<BotNameHistory>
> {
  declare guildId: string;
  declare name: string;
  declare usedAt: Date;
}

export function initBotNameHistoryModel(sequelize: Sequelize): void {
  BotNameHistory.init(
    {
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'BotNameHistory',
      timestamps: false,
    },
  );
}

export default BotNameHistory;
