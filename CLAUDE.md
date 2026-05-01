# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ManagerBot is a modular Discord server management bot built with **discord.js v14**, **TypeScript**, and **SQLite**. It supports slash commands, prefix commands, and context menu interactions.

## Development Commands

```bash
# Development (hot reload with Bun)
bun run dev

# Compile TypeScript to build/
npm run compile

# Production run (after compile)
node build/index.js

# Linting (GTS - Google TypeScript Style)
npm run lint
npm run fix       # Auto-fix lint issues
npm run clean     # Remove compiled output
```

## Architecture

The bot uses a modular singleton-based architecture with these core components:

### Core Classes

- **`ExtendedClient`** (`src/classes/ExtendedClient.ts`) — Custom discord.js client that bootstraps the database, events, login, and command registration. Entry point is `src/index.ts` via `Access.getClient()`.

- **`CommandManager`** (`src/commands/CommandManager.ts`) — Auto-discovers and loads commands from `src/commands/impl/` subdirectories (`slashes/`, `prefixes/`, `menus/`). Commands are auto-registered with Discord API on startup.

- **`EventManager`** (`src/events/EventManager.ts`) — Dynamically loads event handlers from `src/events/impl/`.

- **`ComponentManager`** (`src/component/manager/ComponentManager.ts`) — Registers interactive components (buttons, modals, select menus) with unique IDs, user-lock validation, and timeout handling.

- **`SQLize`** (`src/database/SQLize.ts`) — Sequelize + SQLite singleton that auto-loads all models from `src/database/models/`.

- **`Config`** (`src/config/Config.ts`) — YAML-based configuration (expects `config.yaml` with `bot.token`).

- **`Access`** (`src/instances/Access.ts`) — Singleton provider for `ExtendedClient`. All core singletons are accessed via `getInstance()` or `getClient()` static methods.

### Supporting Singletons

- **`CooldownManager`** (`src/commands/CooldownManager.ts`) — Per-user, per-command cooldown tracking. Set via `command.advancedOptions.cooldown` (milliseconds).

- **`PrefixManager`** (`src/commands/PrefixManager.ts`) — Guild-specific prefix storage with in-memory cache. Default prefix is `!`.

- **`TempBanService`** (`src/services/TempBanService.ts`) — Schedules automatic unbans for duration-based bans. Loads pending unbans from `BanLog` on startup.

### Command Structure

Three command types are supported:

1. **Slash Commands** — Extend `Command` class (`src/commands/Command.ts`), placed in `src/commands/impl/slashes/{category}/`
2. **Prefix Commands** — Extend `PrefixCommand` class (`src/commands/PrefixCommand.ts`), placed in `src/commands/impl/prefixes/{category}/`
3. **Context Menu Commands** — Extend `ContextMenuCommand` class (`src/commands/ContextMenuCommand.ts`), placed in `src/commands/impl/menus/{category}/`

Commands are auto-discovered at runtime—no manual registration needed. The `category` folder name is automatically assigned.

### Component System

Interactive components (buttons, modals, select menus) can be registered in two ways:

**Raw object registration:**
```typescript
ComponentManager.getComponentManager().register([{
  customId: 'uniqueId',
  handler: async (interaction) => { /* ... */ },
  type: ComponentEnum.BUTTON,
  userCheck: [userId],  // Optional: restrict to specific users
  timeout: 10000,       // Optional: auto-unregister after ms
  onTimeout: async () => { /* ... */ }
}]);
```

**Fluent builder (`ComponentBuilder`):**
```typescript
const builder = new SomeComponentBuilder()
  .setCustomId('uniqueId')
  .setType(ComponentEnum.BUTTON)
  .setHandler(async (interaction) => { /* ... */ })
  .setUserCheck([userId])
  .setTimeout(10000)
  .build();
ComponentManager.getComponentManager().register([builder]);
```

### Database Models

Models in `src/database/models/` follow this pattern:

```typescript
class MyModel extends Model<InferAttributes<MyModel>, InferCreationAttributes<MyModel>> {
  declare id: string;
}

export function initMyModel(sequelize: Sequelize): void {
  MyModel.init({ /* fields */ }, { sequelize, tableName: 'MyModel', timestamps: false });
}

export default MyModel;
```

Models are auto-loaded by `SQLize.loadModels()` which finds exported functions starting with `init`.

### Container Template System

Server event messages (welcome, goodbye, boost) use customizable JSON container templates uploaded via `/setup container add`. The `ComponentParser` (`src/util/ComponentParser.ts`) validates and substitutes template tokens using `VariableRegistry` (`src/util/VariableRegistry.ts`).

Supported tokens: `${user.tag}`, `${user.id}`, `${user.mention}`, `${user.displayName}`, `${user.avatar}`, `${user.createdAt}`, `${server.name}`, `${server.id}`, `${server.icon}`, `${server.memberCount}`, `${server.boostCount}`, `${server.boostLevel}`.

## Key Files

- `src/index.ts` — Entry point, gets client singleton and initializes
- `src/instances/Access.ts` — Singleton provider for ExtendedClient
- `src/interfaces/` — TypeScript interfaces for commands, components, etc.
- `src/util/` — Utilities including `StatusContainer` (UI helpers), `EmbedColors`, `ParseDuration`, `HumanizeDuration`

## Discord Components V2

The bot uses Discord's Components V2 system (Containers, TextDisplay, Section, etc.) rather than traditional embeds. All Components V2 replies must include the flag:

```typescript
await interaction.reply({
  components: [container],
  flags: [MessageFlags.IsComponentsV2],
});
```

See `BanCommand.ts` for examples of `ContainerBuilder` usage with separators, media galleries, and section accessories.

## Application Emoji API

Custom emoji responses use `client.api.emojiAPI.getEmojiByName(name)` which fetches from the Discord Application Emoji API. This is typically awaited at the start of a command run to resolve emojis before constructing UI containers.

## Configuration

Create `config.yaml` in project root:

```yaml
bot:
  token: "YOUR_BOT_TOKEN_HERE"
```

If missing, the bot creates an example file and throws an error.

## Code Style

- **GTS (Google TypeScript Style)** with 2-space indentation
- **Prettier** config extends from GTS
- Trailing commas, semicolons required
- Line width: 80 characters
