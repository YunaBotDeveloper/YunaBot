import {Sequelize} from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import Log4TS from '../logger/Log4TS';

export class SQLize {
  private static instance: SQLize | null = null;
  private dbPath: string;
  private logging: boolean;
  private sequelize: Sequelize;
  private logger: Log4TS;

  constructor(dbPath: string, logging = false) {
    this.dbPath = dbPath;
    this.logging = logging;
    this.logger = Log4TS.getLogger();

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: this.dbPath,
      logging: this.logging,
    });
  }

  public static getInstance(dbPath: string): SQLize {
    if (!SQLize.instance) {
      SQLize.instance = new SQLize(dbPath);
    }

    return SQLize.instance;
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  public async loadModels(): Promise<void> {
    const modelsDir = path.join(__dirname, 'models');
    const files = fs
      .readdirSync(modelsDir)
      .filter(file => file.endsWith('.model.ts') || file.endsWith('.model.js'));

    for (const file of files) {
      const filePath = path.join(modelsDir, file);
      const imported = require(filePath);

      const initFuncName = Object.keys(imported).find(
        key => key.startsWith('init') && typeof imported[key] === 'function',
      );

      if (initFuncName) {
        imported[initFuncName](this.sequelize);
        const modelName = file
          .replace('.model.ts', '')
          .replace('.model.js', '');
        this.logger.info(`Loaded model: ${modelName}`);
      }
    }
  }

  public async getSync(): Promise<void> {
    await this.sequelize
      .authenticate()
      .then(() => this.logger.success('Authenticated database'));
    await this.sequelize.sync();
    await this.addMissingColumns();
    this.logger.success('Synchronized database');
  }

  // sync() never alters existing tables, so columns added to a model later
  // would be missing from older databases.
  // ponytail: add-only; renames, type changes and drops still need a manual
  // migration.
  private async addMissingColumns(): Promise<void> {
    const queryInterface = this.sequelize.getQueryInterface();
    for (const model of Object.values(this.sequelize.models)) {
      const table = model.getTableName() as string;
      const existing = await queryInterface.describeTable(table);
      for (const [name, attribute] of Object.entries(model.getAttributes())) {
        const column = attribute.field ?? name;
        if (existing[column]) continue;
        await queryInterface.addColumn(table, column, attribute);
        this.logger.info(`Added column ${table}.${column}`);
      }
    }
  }

  public async close(): Promise<void> {
    await this.sequelize
      .close()
      .then(() => this.logger.success('Closed database'));
  }
}
