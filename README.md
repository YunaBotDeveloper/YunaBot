# ManagerBot

A modular Discord server management bot built with **discord.js v14**, **TypeScript**, and **SQLite**. Supports slash commands, prefix commands, and context menu interactions with a fully extensible architecture.

---

## Features

- **Slash Commands** — Modern Discord interactions with input validation and per-command cooldowns
- **Prefix Commands** — Traditional text-based commands with per-guild custom prefix support
- **Context Menu Commands** — Right-click user actions for quick moderation
- **Interactive Components** — Button, modal, and select menu handling with timeout and user-lock support
- **Discord Components V2** — Built with the latest Discord UI container system
- **Welcome / Goodbye / Boost Messages** — Fully customizable JSON-driven container templates for server events
- **Moderation Logging** — Webhook-based ban and channel nuke logs sent to configurable channels
- **SQLite Database** — Lightweight persistent storage via Sequelize ORM
- **Cooldown System** — Per-user, per-command configurable cooldowns
- **Custom Emoji API** — Application emoji integration for rich status responses
- **Fun Commands** — Hug, kiss, and pat commands with counters and embedded media

---

## Commands

### Slash Commands

| Command | Category | Description |
|---------|----------|-------------|
| `/ban` | Admin | Ban a user with reason, duration, proof, optional DM notification, and confirmation prompt |
| `/setup` | Admin | Configure prefix, container templates, and other server settings |
| `/avatar` | Util | Display a user's avatar |
| `/banner` | Util | Display a user's banner |
| `/hug` | Fun | Hug a user |
| `/kiss` | Fun | Kiss a user |
| `/pat` | Fun | Pat a user |

### Prefix Commands

| Command | Aliases | Category | Description |
|---------|---------|----------|-------------|
| `ban` | — | Admin | Ban a user |
| `help` | `h` | Info | List all available commands |
| `avatar` | — | Util | Display a user's avatar |
| `banner` | — | Util | Display a user's banner |
| `hug` | — | Fun | Hug a user |
| `kiss` | — | Fun | Kiss a user |
| `pat` | — | Fun | Pat a user |

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

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (for compiled production output)
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

Create a `config.yaml` file at the project root:

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

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start in watch mode with hot reload |
| `npm run compile` | Compile TypeScript to `build/` |
| `npm run lint` | Run GTS linter |
| `npm run fix` | Auto-fix lint issues |
| `npm run clean` | Remove compiled output |

---

## Architecture

The bot uses a modular singleton-based architecture:

- **`ExtendedClient`** — Custom discord.js client that bootstraps the database, events, login, and command registration
- **`CommandManager`** — Auto-discovers and loads all command files from `src/commands/impl/`
- **`EventManager`** — Dynamically loads event handlers from `src/events/impl/`
- **`ComponentManager`** — Registers interactive components (buttons, modals, select menus) with unique IDs, user-lock, and timeouts
- **`SQLize`** — Sequelize + SQLite singleton that auto-loads all database models

See the [full project structure](QWEN.md) for a detailed breakdown.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [discord.js](https://discord.js.org) v14 | Discord API wrapper |
| TypeScript 5 | Type-safe development |
| Bun | Fast runtime & package manager |
| Sequelize + SQLite | Database ORM |
| Axios | HTTP client |
| sharp | Image processing |
| nanoid / uuid | Unique ID generation |
| YAML | Bot configuration |
| GTS | Google TypeScript Style linting |

---

## License

This project is open source and available under the [MIT License](LICENSE).
