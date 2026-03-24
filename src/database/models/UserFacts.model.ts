import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class UserFacts extends Model<
  InferAttributes<UserFacts>,
  InferCreationAttributes<UserFacts>
> {
  declare userId: string;
  declare key: string;
  declare value: string;
}

export function initUserFactsModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  UserFacts.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'UserFacts',
      timestamps: false,
    },
  );
}

export default UserFacts;
