/**
 * SQLize - SQLite database wrapper using Sequelize ORM
 *
 * Uses Singleton pattern to ensure only one database connection exists.
 * Provides methods to authenticate, sync models, and close the connection.
 *
 * Usage:
 * - SQLize.getInstance(path) - Get or create the database instance
 * - instance.getSequelize() - Get the Sequelize instance for model operations
 * - instance.getSync() - Authenticate and sync all models
 * - instance.close() - Close the database connection
 */
import {Sequelize} from 'sequelize';
import Log4TS from '../logger/Log4TS';

export class SQLize {
  private static instance: SQLize | null = null;
  /** Path to the SQLite database file */
  private path: string;
  /** Whether to log SQL queries */
  private logging: boolean;
  /** Sequelize instance */
  private sequelize: Sequelize;
  /** Logger instance */
  private logger: Log4TS;

  constructor(path: string, logging = false) {
    this.path = path;
    this.logging = logging;
    this.logger = Log4TS.getLogger();

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: this.path,
      logging: this.logging,
      host: 'localhost',
    });
  }

  /**
   * Get the singleton instance of SQLize
   * @param path - Path to the SQLite database file
   */
  public static getInstance(path: string): SQLize {
    if (!SQLize.instance) {
      SQLize.instance = new SQLize(path);
    }

    return SQLize.instance;
  }

  /**
   * Get the Sequelize instance for direct database operations
   */
  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  /**
   * Authenticate and synchronize all models with the database
   */
  public async getSync(): Promise<void> {
    await this.sequelize
      .authenticate()
      .then(() => this.logger.success('Authenticated database'));
    await this.sequelize
      .sync()
      .then(() => this.logger.success('Synchronized database'));
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    await this.sequelize
      .close()
      .then(() => this.logger.success('Closed database'));
  }
}
