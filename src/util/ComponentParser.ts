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

function patchComponent(component: unknown): RawComponent | null {
  // Guard: skip null / non-object values that may appear in untrusted JSON
  if (typeof component !== 'object' || component === null) return null;

  const c = component as RawComponent;

  if (INTERACTIVE_TYPES.has(c.type ?? -1)) return null;

  // File component (type 13): drop if it references a local attachment
  if (c.type === 13) {
    const file = c.file as {url?: unknown} | undefined;
    if (isAttachmentUrl(file?.url)) return null;
  }

  const result: RawComponent = {...c};

  if (Array.isArray(c.components)) {
    result.components = c.components
      .map(patchComponent)
      .filter((child): child is RawComponent => child !== null);

    // Drop empty action rows after stripping
    if (c.type === 1 && result.components.length === 0) return null;
  }

  // Media gallery (type 12): filter out items with attachment:// URLs
  if (c.type === 12) {
    const items = c.items as Array<{media?: {url?: unknown}}> | undefined;
    if (Array.isArray(items)) {
      result.items = items.filter(item => !isAttachmentUrl(item?.media?.url));
      if ((result.items as unknown[]).length === 0) return null;
    }
  }

  if (c.accessory) {
    result.accessory = patchComponent(c.accessory) ?? undefined;
  }

  return result;
}

export class ComponentParser {
  /**
   * Strips interactive components (buttons, select menus), file components
   * with attachment:// URLs, and empty media galleries from raw JSON.
   * Returns the patched JSON string ready for storage.
   */
  static patch(json: string): string {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Tệp JSON không hợp lệ, vui lòng kiểm tra lại định dạng');
    }

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
