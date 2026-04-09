import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

class Couple extends Model<
  InferAttributes<Couple>,
  InferCreationAttributes<Couple>
> {
  declare user1Id: string;
  declare user2Id: string;
  declare guildId: string;
  declare marriedAt: Date;
  declare exp: number;
  declare level: number;
}

export function initCoupleModel(sequelizeInstance: Sequelize): void {
  Couple.init(
    {
      user1Id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      user2Id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      marriedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      exp: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize: sequelizeInstance,
      tableName: 'Couple',
      timestamps: false,
    },
  );
}

export default Couple;
