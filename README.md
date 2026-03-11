# ManagerBot (YunaBot v3.0)

A feature-rich Discord bot built with **discord.js v14**, **TypeScript**, and **SQLite** — supporting slash commands, prefix commands, and context menu interactions with a modular architecture.

---

## Features

- **Slash Commands** — Modern Discord interactions with full validation and cooldowns
- **Prefix Commands** — Traditional text-based commands with per-guild custom prefix support
- **Context Menu Commands** — Right-click user actions for quick moderation
- **Component Interaction Manager** — Button/component handling with timeout support
- **Discord Components V2** — Uses the latest Discord UI components
- **SQLite Database** — Lightweight persistent storage via Sequelize
- **Cooldown System** — Per-command configurable cooldowns
- **Custom Emoji API** — Application emoji integration for rich responses

---

## Commands

### Slash Commands

| Command | Category | Description |
|---------|----------|-------------|
| `/ban` | Admin | Ban a user from the server with confirmation prompt |
| `/nuke` | Admin | Nuke a channel (delete and recreate) |
| `/prefix` | Admin | Set a custom prefix for the server |
| `/setup` | Admin | Setup bot configuration for the server |
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
| Ban | Admin | Right-click ban a user |
| Avatar | Util | Right-click to view a user's avatar |
| Banner | Util | Right-click to view a user's banner |

---

## Requirements

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (for compilation)
- A Discord bot token

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

Copy the example config and fill in your bot token:

```bash
cp config.yaml.example config.yaml
```

Edit `config.yaml`:

```yaml
bot:
  token: "YOUR_BOT_TOKEN_HERE"
```

**4. Run the bot**

```bash
# Development (with hot reload)
bun run dev

# Production (compile then run)
bun run compile
node build/index.js
```

---

## Project Structure

```
src/
├── index.ts                  # Entry point
├── classes/
│   └── ExtendedClient.ts     # Custom Discord client
├── commands/
│   ├── Command.ts            # Base slash command class
│   ├── PrefixCommand.ts      # Base prefix command class
│   ├── ContextMenuCommand.ts # Base context menu command class
│   ├── CommandManager.ts     # Command loader & registry
│   ├── CooldownManager.ts    # Cooldown handling
│   └── impl/
│       ├── slashes/          # Slash command implementations
│       ├── prefixes/         # Prefix command implementations
│       └── menus/            # Context menu implementations
├── events/
│   ├── EventManager.ts       # Event loader & registry
│   └── impl/                 # Event handlers
├── component/
│   └── manager/
│       └── ComponentManager.ts # Button/component interaction handler
├── database/
│   ├── SQLize.ts             # Sequelize instance
│   └── models/               # Database models
├── api/                      # Discord API helpers (emoji, etc.)
├── config/                   # Config loader
├── util/                     # Shared utilities
└── locale/                   # Localization strings
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [discord.js](https://discord.js.org) v14 | Discord API wrapper |
| TypeScript | Type-safe development |
| Bun | Fast runtime & package manager |
| Sequelize + SQLite | Database ORM |
| sharp | Image processing |
| YAML | Configuration |

---

## License

This project is private and not licensed for public distribution.
