import {ContainerBuilder, Guild, User} from 'discord.js';
import {getTemplateTokens} from './VariableRegistry';

export interface ParseContext {
  user: User;
  guild: Guild;
}

export class ComponentParser {
  static parse(json: string, context: ParseContext): ContainerBuilder[] {
    const tokens = getTemplateTokens(context);

    let substituted = json;

    for (const [token, value] of Object.entries(tokens)) {
      const safe = JSON.stringify(value).slice(1, -1);
      substituted = substituted.split(token).join(safe);
    }

    const parsed: unknown = JSON.parse(substituted);

    if (!Array.isArray(parsed)) {
      throw Error;
    }

    return parsed.map(item => new ContainerBuilder(item as object));
  }
}
