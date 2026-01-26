import {ContainerBuilder} from 'discord.js';
import {EmbedColors} from './EmbedColors';

export class StatusContainer {
  static async success(
    emoji: unknown,
    message: string,
  ): Promise<ContainerBuilder> {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.green())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${emoji} ${message}`),
      );
  }

  static async failed(
    emoji: unknown,
    message: string,
  ): Promise<ContainerBuilder> {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.red())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${emoji} ${message}`),
      );
  }

  static async loading(emoji: unknown): Promise<ContainerBuilder> {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${emoji} Đang xử lý...`),
      );
  }
}
