import {ContainerBuilder} from 'discord.js';
import {EmbedColors} from './EmbedColors';
import {t} from '../locale';

export class StatusContainer {
  static success(emoji: string | undefined, message: string): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.green())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${emoji ?? '✅'} ${message}`),
      );
  }

  static failed(emoji: string | undefined, message: string): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.red())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${emoji ?? '❌'} ${message}`),
      );
  }

  static loading(locale: string, emoji?: string | undefined): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(EmbedColors.yellow())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${emoji ?? '⏳'} ${t('container.loading', locale)}`,
        ),
      );
  }
}
