import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class HugCount extends Model<
  InferAttributes<HugCount>,
  InferCreationAttributes<HugCount>
> {
  declare userId: string;
  declare guildId: string;
  declare hugCount: number;
}

export function initHugCountModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  HugCount.init(
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
      hugCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: 'HugCount',
      timestamps: false,
    },
  );
}

export default HugCount;
