# ManagerBot

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)

A robust, enterprise-grade Discord bot built with TypeScript and Discord.js v14. ManagerBot features a scalable modular architecture with comprehensive support for modern Discord interactions, and database-backed functionality.

---

## 🎯 Core Features

### Command Systems
- **Slash Commands** - Native Discord application command integration
- **Prefix Commands** - Legacy command support with custom prefixes
- **Command Cooldowns** - Intelligent rate limiting and spam protection

### Component Management
- **Interactive Components** - Button, modal, and select menu builders
- **Component Manager** - Centralized handler for Discord UI components
- **Event-Driven Architecture** - Modular event system with automatic registration

### Database & Persistence
- **Sequelize ORM** - Type-safe database operations
- **SQLite Integration** - Lightweight embedded database
- **Model Management** - Structured data models with migrations

### Utilities
- **Professional Logging** - Log4TS-powered structured logging
- **Time Parsing** - Advanced duration and timestamp parsing

---

## 📋 System Requirements

| Requirement | Version |
|------------|---------|
| **Node.js** | v18.x or higher |
| **Package Manager** | Yarn 1.x |
| **Database** | SQLite3 |
| **Operating System** | Windows, macOS, Linux |

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/ngcongtunglam209/ManagerBot.git
cd ManagerBot

# Install dependencies
yarn install

# Build the project
yarn compile
```

### 2. Configuration

Create a `config.yaml` file in the project root:

```yaml
# Discord Bot Configuration
bot:
  # Your Discord bot token from https://discord.com/developers/applications
  token: "your_discord_bot_token"
  
  # Command prefix for prefix-based commands (default: ",")
  prefix: ","
```

> **Note:** Never commit your `config.yaml` to version control. It's already in `.gitignore`.

### 3. Deployment

#### Development Mode
```bash
# Hot reload development
yarn start

# Single run development
yarn dev
```

#### Production Mode
```bash
# Build and start
yarn compile
node build/src/index.js

# Or use PM2 (recommended)
pm2 start ecosystem.config.json
```

---

## 📁 Architecture Overview

```
ManagerBot/
├── src/
│   ├── index.ts                    # Application entry point
│   │
│   ├── api/                        # External API integrations
│   │   ├── discord/                # Discord-specific APIs
│   │   │   └── ApplicationEmoji.ts # Emoji management
│   │   └── external/               # Third-party services
│   │       └── VPNChecker.ts       # VPN detection service
│   │
│   ├── classes/
│   │   └── ExtendedClient.ts       # Enhanced Discord client
│   │
│   ├── commands/                   # Command system
│   │   ├── Command.ts              # Slash command base
│   │   ├── PrefixCommand.ts        # Prefix command base
│   │   ├── CommandManager.ts       # Command registration
│   │   ├── CooldownManager.ts      # Cooldown handler
│   │   └── impl/
│   │       ├── prefixes/           # Prefix command implementations
│   │       └── slashes/            # Slash command implementations
│   │
│   ├── component/                  # UI Component system
│   │   ├── api/
│   │   │   └── ComponentBuilder.ts # Component interface
│   │   ├── builders/               # Component builders
│   │   │   ├── ButtonComponentBuilder.ts
│   │   │   ├── ModalComponentBuilder.ts
│   │   │   └── SelectMenuComponentBuilder.ts
│   │   └── manager/
│   │       └── ComponentManager.ts # Component handler
│   │
│   ├── database/                   # Data persistence
│   │   ├── SQLize.ts               # Database connection
│   │   └── models/                 # Sequelize models
│   │
│   ├── enum/
│   │   └── ComponentEnum.ts        # Component type definitions
│   │
│   ├── events/                     # Event system
│   │   ├── Event.ts                # Event base class
│   │   ├── EventManager.ts         # Event registration
│   │   └── impl/                   # Event implementations
│   │
│   ├── html/                       # Web verification UI
│   │   ├── error.html
│   │   ├── success.html
│   │   ├── verify-all.html
│   │   └── stylesheet.css
│   │
│   ├── instances/
│   │   └── Access.ts               # Singleton client access
│   │
│   ├── interfaces/                 # TypeScript contracts
│   │   ├── IClient.ts
│   │   ├── ICommand.ts
│   │   ├── IComponent.ts
│   │   ├── IEvent.ts
│   │   └── IPrefixCommand.ts
│   │
│   ├── logger/
│   │   └── Log4TS.ts               # Structured logging utility
│   │
│   ├── server/                     # Web server
│   │   └── VerifyServer.ts         # OAuth2 verification server
│   │
│   └── util/                       # Utilities
│       ├── ArrayUtils.ts           # Array manipulation
│       ├── ASCIIColors.ts          # Terminal colors
│       ├── EmbedColors.ts          # Discord embed colors
│       ├── IdGenerator.ts          # ID generation
│       ├── TimeParser.ts           # Duration parsing
│       └── ValidateEnv.ts          # Environment validation
│
├── build/                          # Compiled output
├── deploy/                         # Deployment configurations
├── ecosystem.config.json           # PM2 configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Development Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Run bot in development mode (single execution) |
| `yarn start` | Run with file watching and auto-restart |
| `yarn compile` | Build TypeScript to JavaScript |
| `yarn lint` | Check code style with ESLint |
| `yarn fix` | Auto-fix ESLint issues |
| `yarn clean` | Remove build artifacts |

---

## 📚 Creating Commands

### Slash Command Implementation

Create a new file in `src/commands/impl/slashes/`:

```typescript
import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import Command from '../../Command';

export default class ExampleCommand extends Command {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName('example')
        .setDescription('An example command')
        .toJSON(),
    );

    // Configure cooldown (milliseconds)
    this.advancedOptions.cooldown = 5000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Example command executed!',
      ephemeral: true,
    });
  }
}
```

### Prefix Command Implementation

Create a new file in `src/commands/impl/prefixes/`:

```typescript
import {Message} from 'discord.js';
import {PrefixCommand} from '../../PrefixCommand';
import ExtendedClient from '../../../classes/ExtendedClient';

export default class ExamplePrefixCommand extends PrefixCommand {
  constructor() {
    super(
      'example',           // Command name
      ['ex', 'demo'],      // Aliases
      5000,                // Cooldown (ms)
    );
  }

  async run(
    args: string[],
    context: {message: Message; client: ExtendedClient},
  ) {
    await context.message.reply('Example prefix command executed!');
  }
}
```

---

## 🔌 Technology Stack

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **discord.js** | ^14.x | Discord API wrapper |
| **typescript** | ^5.x | Type-safe JavaScript |
| **sequelize** | ^6.x | ORM for database operations |
| **sqlite3** | ^5.x | Embedded database engine |
| **express** | ^4.x | Web server framework |
| **axios** | ^1.x | HTTP client |

### Verification & Security

| Package | Purpose |
|---------|---------|
| **express-session** | Session management |
| **express-rate-limit** | Rate limiting middleware |
| **ejs** | Template rendering |
| **qs** | Query string parsing |

### Utilities

| Package | Purpose |
|---------|---------|  
| **yaml** | YAML configuration parsing |
| **canvas** | Image manipulation |
| **discord-html-transcripts** | Chat log generation |
| **tsx** | TypeScript execution |

---

## 🔐 Security Features

### VPN/Proxy Detection
ManagerBot integrates with [VPNAPI.io](https://vpnapi.io) to detect and block users connecting through:
- VPN services
- Proxy servers
- Tor exit nodes

### CAPTCHA Verification
Cloudflare Turnstile integration provides:
- Bot detection
- Human verification
- Spam prevention

### Rate Limiting
Express-based rate limiting protects against:
- Brute force attacks
- API abuse
- Resource exhaustion

---

## 📝 Configuration Variables

### Required

| Variable | Description |
|----------|-------------|
| `bot.token` | Your Discord bot token from the Developer Portal |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `bot.prefix` | `,` | Command prefix for prefix-based commands |

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes
   ```bash
   git commit -m "feat: add new feature"
   ```
4. **Push** to your branch
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open** a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

---

## 📄 License

This project is proprietary and closed-source.  
**Copyright © 2025 NStore. All rights reserved.**

---

## 🔗 Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Sequelize Documentation](https://sequelize.org/docs/v6/)

---

## 📞 Support

For issues, questions, or support requests, please contact the development team.

---

<div align="center">

**ManagerBot v2**  
*Professional Discord Bot Framework*

Developed with ❤️ by **NStore**

</div>