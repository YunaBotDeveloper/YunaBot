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

const INTERACTIVE_TYPES = new Set([2, 3, 5, 6, 7, 8]);
const LINK_BUTTON_STYLE = 5;
const SECTION_TYPE = 9;
const CONTAINER_TYPE = 17;

function isAttachmentUrl(url: unknown): boolean {
  return typeof url === 'string' && url.startsWith('attachment://');
}

function patchComponent(component: unknown): RawComponent | null {
  if (typeof component !== 'object' || component === null) return null;

  const c = component as RawComponent;

  // Link buttons need no handler, so they stay.
  const isLinkButton = c.type === 2 && c.style === LINK_BUTTON_STYLE;
  if (INTERACTIVE_TYPES.has(c.type ?? -1) && !isLinkButton) return null;

  if (c.type === 13) {
    const file = c.file as {url?: unknown} | undefined;
    if (isAttachmentUrl(file?.url)) return null;
  }

  const result: RawComponent = {...c};

  if (Array.isArray(c.components)) {
    result.components = c.components.flatMap(child => {
      const patched = patchComponent(child);
      if (!patched) return [];
      // A section is invalid without its accessory: keep only its text.
      if (patched.type === SECTION_TYPE && !patched.accessory) {
        return patched.components ?? [];
      }
      return [patched];
    });

    if (c.type === 1 && result.components.length === 0) return null;
  }

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
  static patch(json: string): string {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON file, please check the format');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('JSON file must be an array');
    }

    const patched = (parsed as RawComponent[])
      .map(patchComponent)
      .filter((c): c is RawComponent => c !== null);

    if (patched.length === 0) {
      throw new Error('JSON file has no valid components after filtering');
    }

    // parse() builds every top-level item as a ContainerBuilder.
    if (patched.some(c => c.type !== CONTAINER_TYPE)) {
      throw new Error('Every top-level component must be a container');
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
