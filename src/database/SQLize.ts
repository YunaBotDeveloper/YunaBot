import {Sequelize} from 'sequelize';
import Log4TS from '../logger/Log4TS';

export class SQLize {
  private static instance: SQLize | null = null;
  private path: string;
  private logging: boolean;
  private sequelize: Sequelize;
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

  public static getInstance(path: string): SQLize {
    if (!SQLize.instance) {
      SQLize.instance = new SQLize(path);
    }

    return SQLize.instance;
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  public async getSync(): Promise<void> {
    await this.sequelize
      .authenticate()
      .then(() => this.logger.success('Authenticated database'));
    await this.sequelize
      .sync()
      .then(() => this.logger.success('Synchronized database'));
  }

  public async close(): Promise<void> {
    await this.sequelize
      .close()
      .then(() => this.logger.success('Closed database'));
  }
}
