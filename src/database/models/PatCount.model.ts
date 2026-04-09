import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class PatCount extends Model<
  InferAttributes<PatCount>,
  InferCreationAttributes<PatCount>
> {
  declare userId: string;
  declare guildId: string;
  declare patCount: number;
}

export function initPatCountModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  PatCount.init(
    {
      userId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      patCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: 'PatCount',
      timestamps: false,
    },
  );
}

export default PatCount;
