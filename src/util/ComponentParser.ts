import {ContainerBuilder, Guild, User} from 'discord.js';
import {getTemplateTokens} from './VariableRegistry';

export interface ParseContext {
  user: User;
  guild: Guild;
}

type RawComponent = {
  type?: number;
  style?: number;
  components?: RawComponent[];
  accessory?: RawComponent;
  [key: string]: unknown;
};

// Button (2), String Select (3), User Select (5), Role Select (6),
// Mentionable Select (7), Channel Select (8)
const INTERACTIVE_TYPES = new Set([2, 3, 5, 6, 7, 8]);

function isAttachmentUrl(url: unknown): boolean {
  return typeof url === 'string' && url.startsWith('attachment://');
}

function patchComponent(component: RawComponent): RawComponent | null {
  if (INTERACTIVE_TYPES.has(component.type ?? -1)) return null;

  // File component (type 13): drop if it references a local attachment
  if (component.type === 13) {
    const file = component.file as {url?: unknown} | undefined;
    if (isAttachmentUrl(file?.url)) return null;
  }

  const result: RawComponent = {...component};

  if (Array.isArray(component.components)) {
    result.components = component.components
      .map(patchComponent)
      .filter((c): c is RawComponent => c !== null);

    // Drop empty action rows after stripping
    if (component.type === 1 && result.components.length === 0) return null;
  }

  // Media gallery (type 12): filter out items with attachment:// URLs
  if (component.type === 12) {
    const items = component.items as
      | Array<{media?: {url?: unknown}}>
      | undefined;
    if (Array.isArray(items)) {
      result.items = items.filter(item => !isAttachmentUrl(item?.media?.url));
      if ((result.items as unknown[]).length === 0) return null;
    }
  }

  if (component.accessory) {
    result.accessory = patchComponent(component.accessory) ?? undefined;
  }

  return result;
}

export class ComponentParser {
  /**
   * Strips interactive components (buttons, select menus) from raw parsed JSON.
   * Only top-level Container (type 17) items are kept.
   * Returns the patched JSON string.
   */
  static patch(json: string): string {
    const parsed: unknown = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      throw new Error('Tệp JSON phải là một mảng');
    }

    const patched = (parsed as RawComponent[])
      .map(patchComponent)
      .filter((c): c is RawComponent => c !== null);

    if (patched.length === 0) {
      throw new Error('Tệp JSON không có component hợp lệ sau khi lọc');
    }

    return JSON.stringify(patched);
  }

  static parse(json: string, context: ParseContext): ContainerBuilder[] {
    const tokens = getTemplateTokens(context);

    let substituted = json;

    for (const [token, value] of Object.entries(tokens)) {
      const safe = JSON.stringify(value).slice(1, -1);
      substituted = substituted.split(token).join(safe);
    }

    const parsed: unknown = JSON.parse(substituted);

    if (!Array.isArray(parsed)) {
      throw new Error('Expected an array of components');
    }

    return (parsed as object[]).map(item => new ContainerBuilder(item));
  }
}
