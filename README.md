# ManagerBot

<p align="center">
  <img src="https://img.shields.io/badge/discord.js-v14.26.2-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js">
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Bun-1.0+-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
</p>

<p align="center">
  <b>A powerful, modular Discord server management bot with modern UI components</b>
</p>

---

## Features

- **Modern Discord UI** — Built with Discord Components V2 (containers, sections, text displays)
- **Three Command Types** — Slash commands, prefix commands, and context menu actions
- **Interactive Components** — Buttons, modals, and select menus with timeout handling
- **Server Automation** — Welcome/goodbye/boost messages with customizable JSON templates
- **Moderation Tools** — Ban, kick, timeout with confirmation dialogs and logging
- **Persistent Storage** — SQLite database via Sequelize ORM
- **Cooldown System** — Per-user, per-command configurable cooldowns
- **Auto-Discovery** — Commands and events loaded automatically from directory structure

---

## Commands

### Admin Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `/ban` | Ban a user with reason, duration, proof attachment, and DM notification | BanMembers |
| `/kick` | Kick a user from the server | KickMembers |
| `/timeout` | Temporarily timeout a user | ModerateMembers |
| `/nuke` | Clear all messages in a channel with confirmation | ManageChannels |
| `/purge` | Delete a specified number of messages | ManageMessages |
| `/setup prefix` | Change the bot's command prefix | ManageGuild |
| `/setup container` | Manage welcome/goodbye/boost message templates | ManageGuild |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/avatar` | Display a user's avatar in full resolution |
| `/banner` | Display a user's profile banner |
| `/userinfo` | Show detailed user information |
| `/serverinfo` | Display server statistics |

### Fun Commands

| Command | Description |
|---------|-------------|
| `/hug` | Hug another member |
| `/kiss` | Kiss another member |
| `/pat` | Pat another member |

### Context Menu Commands

Right-click on any user to access:
- **Ban** — Quick ban action
- **Avatar** — View full-size avatar
- **Banner** — View profile banner

---

## Container Template System

Server event messages (welcome, goodbye, boost) use customizable JSON container templates. Upload templates via `/setup container add`.

### Supported Tokens

| Token | Replacement |
|-------|-------------|
| `${user.tag}` | Username |
| `${user.id}` | User ID |
| `${user.mention}` | User mention |
| `${user.displayName}` | Display name |
| `${user.avatar}` | Avatar URL |
| `${user.createdAt}` | Account creation date |
| `${server.name}` | Server name |
| `${server.id}` | Server ID |
| `${server.icon}` | Server icon URL |
| `${server.memberCount}` | Total members |
| `${server.boostCount}` | Boost count |
| `${server.boostLevel}` | Boost tier |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (for production builds)
- Discord bot token with intents: `Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ManagerBot.git
cd ManagerBot

# Install dependencies
bun install

# Configure the bot
cp config.example.yaml config.yaml
# Edit config.yaml and add your bot token
```

### Configuration

Create `config.yaml` in the project root:

```yaml
bot:
  token: "YOUR_BOT_TOKEN_HERE"
```

### Running the Bot

```bash
# Development (hot reload)
bun run dev

# Production
npm run compile
node build/index.js
```

---

## Development

```bash
# Run linter
npm run lint

# Auto-fix lint issues
npm run fix

# Clean build directory
npm run clean

# Compile TypeScript
npm run compile
```

---

## Architecture

```
src/
├── classes/           # Core client class
├── commands/          # Command system
│   ├── impl/          # Command implementations
│   │   ├── menus/     # Context menu commands
│   │   ├── prefixes/  # Prefix commands
│   │   └── slashes/   # Slash commands
├── component/         # Interactive component system
├── config/            # Configuration loader
├── database/          # Sequelize models
├── events/            # Event handlers
├── interfaces/        # TypeScript interfaces
├── logger/            # Logging utility
├── services/          # Business logic services
└── util/              # Helper utilities
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `ExtendedClient` | Custom discord.js client with bootstrap logic |
| `CommandManager` | Auto-discovers and registers commands |
| `EventManager` | Dynamically loads event handlers |
| `ComponentManager` | Manages interactive components with timeouts |
| `SQLize` | Database singleton with model auto-loading |

---

## Tech Stack

- **[discord.js](https://discord.js.org)** v14 — Discord API wrapper
- **[TypeScript](https://www.typescriptlang.org)** 5 — Type-safe development
- **[Bun](https://bun.sh)** — Fast runtime & package manager
- **[Sequelize](https://sequelize.org)** + SQLite — Database ORM
- **[GTS](https://github.com/google/gts)** — Google TypeScript Style

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Made with love for Discord communities
</p>
