/**
 * A flat key-value map of translation strings.
 * Keys use dot-notation: `command.section.key`
 * Values may contain placeholders like `{user}`, `{timestamp}`, etc.
 */
export type LocaleMap = Record<string, string>;
