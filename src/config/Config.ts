import * as fs from 'fs';
import * as path from 'path';
import {parse} from 'yaml';

export interface BotConfig {
  bot?: {
    token?: string;
    prefix?: string;
  };
  logChannel?: {
    nuke?: string;
  };
}

class Config {
  private static instance: Config;
  private config: BotConfig;

  private constructor() {
    const configPath = path.join(__dirname, '..', '..', 'config.yaml');

    if (!fs.existsSync(configPath)) {
      throw new Error(
        'config.yaml not found! Please create one based on config.example.yaml',
      );
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    this.config = parse(fileContents) as BotConfig;
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get token(): string | undefined {
    return this.config?.bot?.token ?? undefined;
  }

  public get prefix(): string | undefined {
    return this.config?.bot?.prefix ?? undefined;
  }

  public get nukeLogChannel(): string | undefined {
    return this.config?.logChannel?.nuke ?? undefined;
  }

  public getConfig(): BotConfig {
    return this.config;
  }
}

export default Config;
