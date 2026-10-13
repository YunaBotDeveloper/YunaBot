# ManagerBot

<p align="center">
  <img src="https://img.shields.io/badge/discord.js-v14.27-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js">
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Bun-1.0+-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
</p>

<p align="center">
  <b>A modular Discord server management bot with modern UI components</b>
</p>

---

## Features

- **Modern Discord UI** — Built with Discord Components V2 (containers, sections, text displays)
- **Two Command Types** — Slash commands and context menu actions
- **Interactive Components** — Buttons, modals, and select menus with per-user locks and timeouts
- **Persistent Storage** — SQLite database via Sequelize ORM
- **Cooldown System** — Per-user, per-command configurable cooldowns
- **Auto-Discovery** — Commands, events, and models are loaded automatically from the directory structure

---

## Commands

> **This repo is currently just the framework.** All commands and features were removed so they can be rebuilt from scratch.
>
> On startup the bot replaces **all** of its global commands on Discord with whatever is under `src/commands/impl/`, so running it now unregisters every existing command.

### Adding a command

Drop a file into a category folder. Its default export must be a class extending `Command` (slash) or `ContextMenuCommand` (context menu):

```
src/commands/impl/
├── slashes/{category}/MyCommand.ts   # extends Command
└── menus/{category}/MyMenu.ts        # extends ContextMenuCommand
```

```typescript
import {ChatInputCommandInteraction, MessageFlags} from 'discord.js';
import {Command} from '../../../Command';
import {StatusContainer} from '../../../../util/StatusContainer';

export default class PingCommand extends Command {
  constructor() {
    super('ping', 'Check if the bot is alive');
    this.advancedOptions.cooldown = 3000; // ms, optional
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      components: [StatusContainer.success(undefined, 'Pong!')],
      flags: [MessageFlags.IsComponentsV2],
    });
  }
}
```

No manual registration is needed. The folder name becomes the command's category.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (for production builds)
- A Discord bot token. The bot requests **all** gateway intents, so enable the privileged ones (Server Members, Presence, Message Content) in the Developer Portal.

### Installation

```bash
git clone https://github.com/your-username/ManagerBot.git
cd ManagerBot
bun install
```

### Configuration

Create `config.yaml` in the directory you run the bot from:

```yaml
bot:
  token: "YOUR_BOT_TOKEN_HERE"
```

If the file is missing, the bot writes this example and exits.

### Running the Bot

```bash
# Development (hot reload)
bun run dev

# Production
npm run clean && npm run compile
node build/src/index.js
```

> Development and production use different SQLite files: `src/database/database.sqlite` and `build/src/database/database.sqlite`.

---

## Development

```bash
npm run lint      # Run linter
npm run fix       # Auto-fix lint issues
npm run clean     # Clean build directory
npm run compile   # Compile TypeScript
```

---

## Architecture

```
src/
├── api/               # Discord application emoji API
├── classes/           # ExtendedClient (bootstrap)
├── commands/          # Command base classes, manager, cooldowns
│   └── impl/          # Command implementations (menus/, slashes/)
├── component/         # Interactive component system
├── config/            # config.yaml loader
├── database/          # Sequelize setup and models
├── events/            # Event base class and handlers (impl/)
├── interfaces/        # TypeScript interfaces
├── logger/            # Log4TS logger
└── util/              # Helpers (StatusContainer, ParseDuration, …)
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `ExtendedClient` | Custom discord.js client with bootstrap logic |
| `CommandManager` | Auto-discovers commands and registers them with Discord |
| `EventManager` | Dynamically loads event handlers |
| `ComponentManager` | Manages interactive components with user locks and timeouts |
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
