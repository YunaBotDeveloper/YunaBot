import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Sequelize,
  DataTypes,
} from 'sequelize';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let sequelize: Sequelize | null = null;

class UserChatHistory extends Model<
  InferAttributes<UserChatHistory>,
  InferCreationAttributes<UserChatHistory>
> {
  declare id: CreationOptional<number>;
  declare userId: string;
  declare role: 'user' | 'assistant';
  declare content: string;
  declare readonly createdAt: CreationOptional<Date>;
}

export function initUserChatHistoryModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  UserChatHistory.init(
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
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: 'UserChatHistory',
      timestamps: true,
      updatedAt: false,
      indexes: [{fields: ['userId']}],
    },
  );
}

export default UserChatHistory;
