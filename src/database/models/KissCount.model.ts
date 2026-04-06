import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class KissCount extends Model<
  InferAttributes<KissCount>,
  InferCreationAttributes<KissCount>
> {
  declare userId: string;
  declare guildId: string;
  declare kissCount: number;
}

export function initKissCountModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  KissCount.init(
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
      kissCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: 'KissCount',
      timestamps: false,
    },
  );
}

export default KissCount;
