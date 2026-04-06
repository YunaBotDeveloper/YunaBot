import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildMember extends Model<
  InferAttributes<GuildMember>,
  InferCreationAttributes<GuildMember>
> {
  declare userId: string;
  declare guildId: string;
  declare username: string;
  declare displayName: string;
  declare roles: string; // JSON-serialized string[]
  declare joinedAt: string | null;
  declare isBot: boolean;
}

export function initGuildMemberModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GuildMember.init(
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
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      roles: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
      },
      joinedAt: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      isBot: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      tableName: 'GuildMembers',
      timestamps: false,
    },
  );
}

export default GuildMember;
