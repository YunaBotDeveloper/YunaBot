import * as fs from 'fs';
import * as path from 'path';
import {parse} from 'yaml';
import Log4TS from '../logger/Log4TS';

export interface BotConfig {
  bot?: {
    token: string;
    prefix: string;
  };
  logChannel?: {
    nuke?: string;
  };
}

class Config {
  private static instance: Config;
  private config: BotConfig;
  private logging = Log4TS.getLogger();

  private constructor() {
    const configPath = path.join(__dirname, '..', '..', 'config.yaml');

    if (!fs.existsSync(configPath)) {
      const exampleConfigPath = path.join(__dirname, '..', '..', 'config.yaml');
      const exampleConfig = `bot:
  token: "YOUR_BOT_TOKEN_HERE"
  prefix: "!"

logChannel:
  nuke: "CHANNEL_ID_HERE"  # Optional
`;
      fs.writeFileSync(exampleConfigPath, exampleConfig, 'utf8');
      this.logging.error(
        'config.yaml not found! An config has been created at config.yaml. Please fill it out before running the bot again.',
      );
      throw new Error('config.yaml not found');
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    this.config = parse(fileContents) as BotConfig;

    if (!this.config.bot) {
      const exampleConfigPath = path.join(
        __dirname,
        '..',
        '..',
        'config.example.yaml',
      );
      const exampleConfig = `bot:
  token: "YOUR_BOT_TOKEN_HERE"
  prefix: "!"

logChannel:
  nuke: "CHANNEL_ID_HERE"  # Optional
`;
      fs.writeFileSync(exampleConfigPath, exampleConfig, 'utf8');
      this.logging.error(
        'Bot configuration is missing in config.yaml. An example config has been created at config.example.yaml',
      );
      throw new Error('Bot configuration is missing in config.yaml');
    }

    if (!this.config.bot.token) {
      throw new Error('Bot token is required in config.yaml');
    }

    if (!this.config.bot.prefix) {
      throw new Error('Bot prefix is required in config.yaml');
    }
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get token(): string {
    return this.config.bot!.token;
  }

  public get prefix(): string {
    return this.config.bot!.prefix;
  }

  public get nukeLogChannel(): string | undefined {
    return this.config?.logChannel?.nuke ?? undefined;
  }

  public getConfig(): BotConfig {
    return this.config;
  }
}

export default Config;
