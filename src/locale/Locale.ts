import {Locale as DiscordLocale} from 'discord.js';
import en from './en';
import vi from './vi';
import {LocaleMap} from './types';

/**
 * Supported locale codes — maps Discord locale strings to our translation files.
 */
const locales: Record<string, LocaleMap> = {
  [DiscordLocale.EnglishUS]: en,
  [DiscordLocale.Vietnamese]: vi,
};

/** Default / fallback locale */
const DEFAULT_LOCALE = DiscordLocale.EnglishUS;

/**
 * Get a translated string for the given key and locale.
 *
 * @param key   Dot-notation key (e.g. `avatar.description`)
 * @param locale Discord locale string (defaults to `en-US`)
 * @param vars  Optional placeholder replacements — `{ user: mention }` replaces `{user}`
 * @returns The translated string, or the key itself if not found.
 *
 * @example
 * ```ts
 * t('avatar.description');                           // "Get user avatar"
 * t('avatar.description', 'vi');                     // "Lấy ảnh đại diện"
 * t('avatar.auto_delete', 'en-US', { emoji: '⏰', timestamp: '<t:1234:R>' });
 * ```
 */
export function t(
  key: string,
  locale: string = DEFAULT_LOCALE,
  vars?: Record<string, string>,
): string {
  const map = locales[locale] ?? locales[DEFAULT_LOCALE];
  let value = map?.[key] ?? locales[DEFAULT_LOCALE]?.[key] ?? key;

  if (vars) {
    for (const [placeholder, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${placeholder}}`, replacement);
    }
  }

  return value;
}

/**
 * Build a Discord `LocalizationMap` for a given key across all registered locales.
 * Useful for `setNameLocalizations()` / `setDescriptionLocalizations()`.
 *
 * @example
 * ```ts
 * this.data
 *   .setDescription(t('avatar.description'))
 *   .setDescriptionLocalizations(tMap('avatar.description'));
 * ```
 */
export function tMap(key: string): Partial<Record<DiscordLocale, string>> {
  const result: Partial<Record<DiscordLocale, string>> = {};

  for (const [locale, map] of Object.entries(locales)) {
    if (map[key]) {
      result[locale as DiscordLocale] = map[key];
    }
  }

  return result;
}

export {DiscordLocale, DEFAULT_LOCALE, locales};
