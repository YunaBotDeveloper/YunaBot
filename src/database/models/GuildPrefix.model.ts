/**
 * GuildPrefix Model
 * Database model for storing custom prefixes per server (guild)
 * - guildId: Server ID (primary key)
 * - prefix: Custom prefix for the server (default is "!")
 */
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

class GuildPrefix extends Model<
  InferAttributes<GuildPrefix>,
  InferCreationAttributes<GuildPrefix>
> {
  /** Server/Guild ID */
  declare guildId: string;
  /** Custom prefix for this server */
  declare prefix: string;
}

/**
 * Initialize the GuildPrefix model with Sequelize instance
 * This function is called in ExtendedClient.initialize()
 * @param sequelizeInstance - The connected Sequelize instance
 */
export function initGuildPrefixModel(sequelizeInstance: Sequelize): void {
  sequelize = sequelizeInstance;
  GuildPrefix.init(
    {
      guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      prefix: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '!',
      },
    },
    {
      sequelize,
      tableName: 'GuildPrefixes',
      timestamps: false,
    },
  );
}

export default GuildPrefix;
