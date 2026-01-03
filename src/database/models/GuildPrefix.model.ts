/**
 * @fileoverview Sequelize model for cache guild prefix.
 * @module database/models/prefix
 */
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  Sequelize,
} from 'sequelize';

let sequelize: Sequelize | null = null;

/**
 * Sequelize model for storing nuke operation logs per server.
 * Tracks when channels are nuked (deleted and recreated) with metadata.
 *
 * @class GuildPrefix
 * @extends Model
 */

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
