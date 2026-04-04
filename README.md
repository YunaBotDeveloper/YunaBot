# ManagerBot (YunaBot v3.0)

A feature-rich Discord server management bot built with **discord.js v14**, **TypeScript**, and **SQLite** — supporting slash commands, prefix commands, and context menu interactions with a fully modular architecture.

---

## Features

- **Slash Commands** — Modern Discord interactions with full validation and per-command cooldowns
- **Prefix Commands** — Traditional text-based commands with per-guild custom prefix support
- **Context Menu Commands** — Right-click user actions for quick moderation
- **Component Interaction Manager** — Button/modal/select menu handling with timeout and user-lock support
- **Discord Components V2** — Uses the latest Discord UI container system
- **Welcome / Goodbye / Boost Events** — Fully customizable JSON-driven container messages for server events
- **Moderation Logging** — Webhook-based ban logs sent to a configurable channel
- **SQLite Database** — Lightweight persistent storage via Sequelize ORM
- **Cooldown System** — Per-user, per-command configurable cooldowns
- **Custom Emoji API** — Application emoji integration for rich status responses

---

## Commands

### Slash Commands

| Command | Category | Description |
|---------|----------|-------------|
| `/ban` | Admin | Ban a user with reason, duration, proof, optional DM notification, and confirmation prompt |
| `/nuke` | Admin | Delete and recreate a channel (nuke) |
| `/setup prefix` | Admin | Set a custom prefix for the server |
| `/setup container add` | Admin | Upload a JSON container template for server events |
| `/avatar` | Util | Display a user's avatar |
| `/banner` | Util | Display a user's banner |

### Prefix Commands

| Command | Aliases | Category | Description |
|---------|---------|----------|-------------|
| `ban` | — | Admin | Ban a user |
| `nuke` | — | Admin | Nuke a channel |
| `avatar` | — | Util | Display a user's avatar |
| `banner` | — | Util | Display a user's banner |
| `help` | `h` | Info | List all available commands |

### Context Menu Commands

| Command | Category | Description |
|---------|----------|-------------|
| Ban | Admin | Right-click a user to ban them |
| Avatar | Util | Right-click to view a user's avatar |
| Banner | Util | Right-click to view a user's banner |

---

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

---

## Requirements

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (for compiled output)
- A Discord bot token with the following intents: `Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`

---

## Setup

**1. Clone the repository**

```bash
git clone https://github.com/your-username/ManagerBot.git
cd ManagerBot
```

**2. Install dependencies**

```bash
bun install
```

**3. Configure the bot**

Create a `config.yaml` at the project root:

```yaml
bot:
  token: "YOUR_BOT_TOKEN_HERE"
```

**4. Run the bot**

```bash
# Development (hot reload)
bun run dev

# Production (compile then run)
npm run compile
node build/index.js
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start in watch mode with hot reload |
| `npm run compile` | Compile TypeScript to `build/` |
| `npm run lint` | Run GTS linter |
| `npm run fix` | Auto-fix lint issues |
| `npm run clean` | Remove compiled output |

---

## Project Structure

```
src/
├── index.ts                        # Entry point
├── classes/
│   └── ExtendedClient.ts           # Custom Discord client (singleton)
├── commands/
│   ├── Command.ts                  # Base slash command class
│   ├── PrefixCommand.ts            # Base prefix command class
│   ├── ContextMenuCommand.ts       # Base context menu command class
│   ├── CommandManager.ts           # Auto-discovery & registry
│   ├── CooldownManager.ts          # Per-user, per-command cooldowns
│   ├── PrefixManager.ts            # Per-guild prefix overrides (DB-backed)
│   └── impl/
│       ├── slashes/                # Slash command implementations
│       ├── prefixes/               # Prefix command implementations
│       └── menus/                  # Context menu implementations
├── component/
│   ├── api/ComponentBuilder.ts     # Component factory
│   ├── builders/                   # Button / Modal / SelectMenu builders
│   └── manager/ComponentManager.ts # Interaction registry with timeout & user-lock
├── events/
│   ├── EventManager.ts             # Dynamic event handler loader
│   └── impl/
│       ├── SlashCommandHandler.ts  # Slash + component dispatch
│       ├── PrefixCommandHandler.ts # Prefix command dispatch
│       ├── WelcomeEvent.ts         # Member join → container message
│       ├── GoodbyeEvent.ts         # Member leave → container message
│       ├── BoostEvent.ts           # Server boost → container message
│       ├── ReadyEvent.ts
│       ├── BotAddedEvent.ts
│       └── BotRemovedEvent.ts
├── database/
│   ├── SQLize.ts                   # Sequelize/SQLite singleton
│   └── models/
│       ├── GuildPrefix.model.ts    # Per-guild prefix overrides
│       ├── GuildEvent.model.ts     # Welcome/goodbye/boost channel config
│       ├── GuildContainer.ts       # JSON container templates
│       ├── GuildLog.model.ts       # Log channel configuration
│       ├── BanLog.model.ts         # Ban audit log
│       └── NukeLog.model.ts        # Nuke audit log
├── api/
│   └── discord/ApplicationEmoji.ts # Custom emoji fetcher
├── config/Config.ts                # YAML config loader (singleton)
├── logger/Log4TS.ts                # Logger (info/error/debug/warning/success)
└── util/
    ├── StatusContainer.ts          # Pre-built success/failed/loading containers
    ├── ComponentParser.ts          # JSON → ContainerBuilder with token substitution
    ├── VariableRegistry.ts         # Template token definitions
    ├── EmbedColors.ts              # Predefined hex colors + random()
    ├── HumanizeDuration.ts         # Duration formatting
    ├── ParseDuration.ts            # Duration string parser
    ├── NumberFormat.ts             # Number formatting
    ├── Sleep.ts                    # Async delay helper
    └── ASCIIColors.ts              # Terminal color codes
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [discord.js](https://discord.js.org) v14 | Discord API wrapper |
| TypeScript 5 | Type-safe development |
| Bun | Fast runtime & package manager |
| Sequelize + SQLite | Database ORM |
| Axios | HTTP client (JSON template fetching) |
| sharp | Image processing |
| nanoid / uuid | Unique ID generation |
| YAML | Bot configuration |
| GTS | Google TypeScript Style linting |

---

## License

This project is private and not licensed for public distribution.
