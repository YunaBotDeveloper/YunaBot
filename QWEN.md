# ManagerBot (YunaBot v3.0) - Project Context

## Project Overview

ManagerBot is a feature-rich Discord server management bot built with **discord.js v14**, **TypeScript**, and **SQLite**. It supports slash commands, prefix commands, and context menu interactions with a fully modular architecture. The project uses **Bun** as the preferred runtime for development and **Node.js** for production.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **discord.js v14** | Discord API wrapper |
| **TypeScript 5** | Type-safe development |
| **Bun** | Fast runtime & package manager (dev) |
| **Node.js** | Production runtime (compiled output) |
| **Sequelize + SQLite** | Database ORM |
| **Axios** | HTTP client (JSON template fetching) |
| **sharp** | Image processing |
| **nanoid / uuid** | Unique ID generation |
| **YAML** | Bot configuration |
| **GTS** | Google TypeScript Style linting |

## Commands

### Development & Build

```bash
# Development (hot reload via Bun watch mode)
bun run dev

# Compile TypeScript to build/
npm run compile

# Production run (after compile)
node build/index.js

# Lint
npm run lint

# Auto-fix lint issues
npm run fix

# Clean build artifacts
npm run clean
```

### Configuration

A `config.yaml` file is required at the project root:

```yaml
bot:
  token: "YOUR_BOT_TOKEN_HERE"
```

Required bot intents: `Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`.

## Architecture

### Entry Point

`src/index.ts` → `Access.getClient()` → `ExtendedClient.initialize()`

### Initialization Order

1. Sequelize/SQLite models sync (`SQLize`)
2. Event handlers loaded (`EventManager`)
3. Discord login
4. Commands registered to Discord API + loaded locally (`CommandManager`)

### Core Singletons

- `Access.getClient()` — the `ExtendedClient` instance
- `Config.getInstance()` — parsed `config.yaml`
- `Log4TS.getLogger()` — logger with `info/error/debug/warning/success` methods
- `ComponentManager.getInstance()` — component registry
- `SQLize.getInstance()` — Sequelize instance

## Project Structure

```
src/
├── index.ts                          # Entry point
├── classes/
│   └── ExtendedClient.ts             # Custom Discord client (singleton)
├── commands/
│   ├── Command.ts                    # Base slash command class
│   ├── PrefixCommand.ts              # Base prefix command class
│   ├── ContextMenuCommand.ts         # Base context menu command class
│   ├── CommandManager.ts             # Auto-discovery & registry
│   ├── CooldownManager.ts            # Per-user, per-command cooldowns
│   ├── PrefixManager.ts              # Per-guild prefix overrides (DB-backed)
│   └── impl/
│       ├── slashes/                  # Slash command implementations
│       ├── prefixes/                 # Prefix command implementations
│       └── menus/                    # Context menu implementations
├── component/
│   ├── api/ComponentBuilder.ts       # Component factory
│   ├── builders/                     # Button / Modal / SelectMenu builders
│   └── manager/ComponentManager.ts   # Interaction registry with timeout & user-lock
├── events/
│   ├── Event.ts                      # Base event class
│   ├── EventManager.ts               # Dynamic event handler loader
│   └── impl/
│       ├── SlashCommandHandler.ts    # Slash + component dispatch
│       ├── PrefixCommandHandler.ts   # Prefix command dispatch
│       ├── WelcomeEvent.ts           # Member join → container message
│       ├── GoodbyeEvent.ts           # Member leave → container message
│       ├── BoostEvent.ts             # Server boost → container message
│       ├── ReadyEvent.ts
│       ├── BotAddedEvent.ts
│       └── BotRemovedEvent.ts
├── database/
│   ├── SQLize.ts                     # Sequelize/SQLite singleton
│   └── models/
│       ├── GuildPrefix.model.ts      # Per-guild prefix overrides
│       ├── GuildEvent.model.ts       # Welcome/goodbye/boost channel config
│       ├── GuildContainer.model.ts   # JSON container templates
│       ├── GuildEmbed.model.ts       # Embed configuration
│       ├── GuildLog.model.ts         # Log channel configuration
│       ├── GuildMember.model.ts      # Guild member tracking
│       ├── BanLog.model.ts           # Ban audit log
│       ├── NukeLog.model.ts          # Nuke audit log
│       ├── HugCount.model.ts         # Hug command counter
│       ├── KissCount.model.ts        # Kiss command counter
│       └── PatCount.model.ts         # Pat command counter
├── api/
│   └── discord/ApplicationEmoji.ts   # Custom emoji fetcher
├── config/Config.ts                  # YAML config loader (singleton)
├── logger/Log4TS.ts                  # Logger (info/error/debug/warning/success)
├── data/                             # Static data assets
├── enum/                             # TypeScript enum definitions
├── instances/                        # Singleton instances (Access)
├── interfaces/                       # TypeScript interface definitions
├── services/                         # Business logic services
└── util/
    ├── StatusContainer.ts            # Pre-built success/failed/loading containers
    ├── ComponentParser.ts            # JSON → ContainerBuilder with token substitution
    ├── VariableRegistry.ts           # Template token definitions
    ├── EmbedColors.ts                # Predefined hex colors + random()
    ├── HumanizeDuration.ts           # Duration formatting
    ├── ParseDuration.ts              # Duration string parser
    ├── NumberFormat.ts               # Number formatting
    ├── Sleep.ts                      # Async delay helper
    └── ASCIIColors.ts                # Terminal color codes
```

## Command System

Three command types, each with a base class and separate manager:

| Type | Base Class | Location |
|------|-----------|----------|
| Slash | `Command` | `src/commands/impl/slashes/{category}/` |
| Prefix | `PrefixCommand` | `src/commands/impl/prefixes/{category}/` |
| Context Menu | `ContextMenuCommand` | `src/commands/impl/menus/{category}/` |

`CommandManager` auto-discovers and loads all command files from these directories. Slash and context menu commands are registered with the Discord REST API on startup.

Cooldowns are tracked per-user, per-command via `CooldownManager`. Guild-specific prefix overrides are managed by `PrefixManager` (backed by the `GuildPrefix` database model; default prefix: `!`).

## Component System

Interactive Discord components (buttons, modals, select menus) are registered through `ComponentManager` (singleton). Each component gets a unique ID (nanoid), optional user permission check (`userCheck` array), and an optional timeout with automatic cleanup.

Builders: `ButtonComponentBuilder`, `ModalComponentBuilder`, `SelectMenuComponentBuilder` — all accessible via `ComponentBuilder` factory.

## Event System

`EventManager` dynamically loads event handlers from `src/events/impl/`. Key handlers:
- `SlashCommandHandler` — dispatches slash commands and all component interactions (button/modal/select), enforces cooldowns
- `PrefixCommandHandler` — dispatches prefix commands with per-guild prefix support
- `ReadyEvent`, `BotAddedEvent`, `BotRemovedEvent`

## Database

Sequelize + SQLite via `SQLize` singleton (`src/database/SQLize.ts`). Models live in `src/database/models/` and are auto-loaded.

## Container Template System

Server event messages (welcome, goodbye, boost) are driven by JSON container templates uploaded via `/setup container add`. Templates support the following dynamic tokens:

| Token | Description |
|-------|-------------|
| `${user.tag}` | Username |
| `${user.id}` | User ID |
| `${user.mention}` | User mention (`<@id>`) |
| `${user.displayName}` | Display name |
| `${user.avatar}` | Avatar URL |
| `${user.createdAt}` | Account creation date (relative) |
| `${server.name}` | Server name |
| `${server.id}` | Server ID |
| `${server.icon}` | Server icon URL |
| `${server.memberCount}` | Total member count |
| `${server.boostCount}` | Server boost count |
| `${server.boostLevel}` | Server boost tier |

## Development Conventions

- **Linting**: Uses **gts** (Google TypeScript Style) — run `npm run fix` before committing
- **TypeScript**: Strict typing, uses `tsconfig.json` extending GTS's Google config
- **Runtime**: Bun is preferred for development; compiled output runs under Node.js
- **Discord Components V2**: The bot uses the latest Discord UI container system (flag enabled on messages)
- **UI strings**: Some UI strings are in Vietnamese
- **License**: Private project, not licensed for public distribution
