# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot reload via tsx watch)
bun run dev

# Lint
npm run lint

# Fix lint issues
npm run fix

# Compile TypeScript to build/
npm run compile

# Production run (after compile)
node build/index.js

# Clean build artifacts
npm run clean
```

**Runtime:** Bun is preferred for development; compiled output runs under Node.js.

**Config required:** A `config.yaml` at the project root with:
```yaml
bot:
  token: "YOUR_BOT_TOKEN_HERE"
```

## Architecture

**Entry point:** `src/index.ts` → `Access.getClient()` → `ExtendedClient.initialize()`

On init, `ExtendedClient` (singleton, extends `discord.js Client`) bootstraps in order:
1. Sequelize/SQLite models sync (`SQLize`)
2. Event handlers loaded (`EventManager`)
3. Discord login
4. Commands registered to Discord API + loaded locally (`CommandManager`)

### Command System

Three command types, each with a base class and a separate manager:

| Type | Base Class | Location |
|------|-----------|----------|
| Slash | `Command` | `src/commands/impl/slashes/{category}/` |
| Prefix | `PrefixCommand` | `src/commands/impl/prefixes/{category}/` |
| Context Menu | `ContextMenuCommand` | `src/commands/impl/menus/{category}/` |

`CommandManager` auto-discovers and loads all command files from these directories. Slash and context menu commands are registered with the Discord REST API on startup.

Cooldowns are tracked per-user, per-command via `CooldownManager`. Guild-specific prefix overrides are managed by `PrefixManager` (backed by the `GuildPrefix` database model; default prefix: `!`).

### Component System

Interactive Discord components (buttons, modals, select menus) are registered through `ComponentManager` (singleton). Each component gets a unique ID (nanoid), optional user permission check (`userCheck` array), and an optional timeout with automatic cleanup.

Builders: `ButtonComponentBuilder`, `ModalComponentBuilder`, `SelectMenuComponentBuilder` — all accessible via `ComponentBuilder` factory.

### Event System

`EventManager` dynamically loads event handlers from `src/events/impl/`. Key handlers:
- `SlashCommandHandler` — dispatches slash commands and all component interactions (button/modal/select), enforces cooldowns
- `PrefixCommandHandler` — dispatches prefix commands with per-guild prefix support
- `ReadyEvent`, `BotAddedEvent`, `BotRemovedEvent`

### Database

Sequelize + SQLite via `SQLize` singleton (`src/database/SQLize.ts`). Models live in `src/database/models/` and are auto-loaded. Current models: `GuildPrefix`, `GuildLog`, `BanLog`, `NukeLog`.

### Key Singletons

- `Access.getClient()` — the `ExtendedClient` instance
- `Config.getInstance()` — parsed `config.yaml`
- `Log4TS.getLogger()` — logger with `info/error/debug/warning/success` methods
- `ComponentManager.getInstance()` — component registry
- `SQLize.getInstance()` — Sequelize instance

### Utilities

- `StatusContainer` — pre-built `success()`, `failed()`, `loading()` Discord container responses
- `EmbedColors` — predefined hex colors + `random()`
- `TimeParser` — parses time strings
- `Sleep` — async delay helper
- `ApplicationEmoji` — fetches bot's custom emojis by name from Discord API

## Notes

- The bot uses **Discord Components V2** (flag enabled on messages).
- Some UI strings are in Vietnamese.
- Linting uses **gts** (Google TypeScript Style) — run `npm run fix` before committing.
