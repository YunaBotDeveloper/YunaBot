import * as fs from 'fs';
import * as path from 'path';
import {parse} from 'yaml';
import Log4TS from '../logger/Log4TS';

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface BotConfig {
  bot: {
    token: string;
  };
  ai: AIConfig;
}

class Config {
  private static instance: Config;
  private config!: BotConfig;
  private logging = Log4TS.getLogger();

  private constructor() {
    // Resolve config.yaml from the project root (CWD)
    const configPath = path.join(process.cwd(), 'config.yaml');

    if (!fs.existsSync(configPath)) {
      this.createExampleConfig(configPath);
      this.logging.error(
        'config.yaml not found! An example config has been created at config.yaml. Please fill it out.',
      );
      throw new Error('config.yaml not found');
    }

    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      this.config = parse(fileContents) as BotConfig;
      this.validateConfig();
    } catch (error) {
      this.logging.error(`Failed to load configuration: ${error}`);
      throw error;
    }
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get token(): string {
    return this.config.bot.token;
  }

  public get ai(): AIConfig {
    return this.config.ai;
  }

  public getConfig(): BotConfig {
    return this.config;
  }

  private validateConfig(): void {
    if (!this.config.bot) {
      throw new Error('Missing "bot" section in config.yaml');
    }
    if (!this.config.bot.token) {
      throw new Error('Missing "bot.token" in config.yaml');
    }
    if (!this.config.ai) {
      throw new Error('Missing "ai" section in config.yaml');
    }
    if (!this.config.ai.apiKey) {
      throw new Error('Missing "ai.apiKey" in config.yaml');
    }
  }

  private createExampleConfig(targetPath: string): void {
    const exampleConfig = `bot:
  token: "YOUR_BOT_TOKEN_HERE"

ai:
  apiKey: "YOUR_DASHSCOPE_API_KEY_HERE"
  baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
  model: "qwen-plus"
`;
    // If config.yaml doesn't exist, we might as well write the example directly to it
    // or write to config.example.yaml if preferred.
    // The previous logic wrote to config.yaml if missing, so we keep that behavior.
    fs.writeFileSync(targetPath, exampleConfig, 'utf8');
  }
}

export default Config;
