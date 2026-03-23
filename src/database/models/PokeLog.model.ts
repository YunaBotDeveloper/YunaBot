import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class PokeLog extends Model<
  InferAttributes<PokeLog>,
  InferCreationAttributes<PokeLog>
> {
  declare userIds: string;
  declare pokeLog: string[] | null;
  declare streak: number | null;
  declare messageId: string | null;
}

export function initPokeLogModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  PokeLog.init(
    {
      userIds: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      pokeLog: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      streak: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      messageId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      tableName: 'PokeLog',
      timestamps: false,
    },
  );
}

export default PokeLog;
