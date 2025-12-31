# ManagerBot — Advanced Developer Guide

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)

ManagerBot is a production-oriented Discord framework written in TypeScript and built on discord.js v14. This README targets maintainers and integrators who need to extend, debug, and deploy ManagerBot in production environments.

## Purpose & audience
- **Audience:** library integrators, bot maintainers, contributors.
- **Goal:** provide a compact, actionable developer reference for extending commands, components, events, and persistence with best-practice guidance.

## Quick facts
- Language: TypeScript
- Runtime: Node.js v18+
- Core libs: `discord.js`, `sequelize`, `yaml`

---

## Requirements
- Node.js v18 or newer
- Yarn (1.x) or npm
- SQLite (development) or a Sequelize-compatible DB in production

---

## Installation (developer flow)
Clone, install, build and run in watch mode:

```bash
git clone https://github.com/ngcongtunglam209/ManagerBot.git
cd ManagerBot
yarn install
yarn compile
yarn start      # watch mode (tsx)
```

For a single-run development process use `yarn dev` if configured.

---

## Configuration
Copy or create `config.yaml` at the repository root. Minimal example:

```yaml
bot:
  token: "YOUR_BOT_TOKEN"
  prefix: "!"            # optional

database:
  dialect: "sqlite"
  storage: "./data/database.sqlite"

logChannel:
  nuke: "CHANNEL_ID"     # optional
```

Security: never commit `config.yaml` or secrets; use environment variables or secret managers for production.

---

## Project layout (what to extend)
- `src/index.ts` — application bootstrap (registers commands, events, components)
- `src/classes/ExtendedClient.ts` — extended Discord client and helper utilities
- `src/commands/` — command base classes and managers
  - `impl/slashes` — slash command implementations
  - `impl/prefixes` — prefix command implementations
- `src/component/` — builders and centralized `ComponentManager`
- `src/events/` — event base and implementations
- `src/database/` — `SQLize.ts` + `models/`
- `src/config/Config.ts` — YAML loader and config validation

Extend points:
- Commands: extend `Command` (slash) or `PrefixCommand` and register via `CommandManager`.
- Components: register interactive components with `ComponentManager` (supports user checks and timeouts).
- Events: implement `Event` and let `EventManager` auto-register.

---

## Advanced usage & examples

Slash command (extend `Command`)

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import Command from '../Command';

export default class EchoCommand extends Command {
  constructor() {
    super(new SlashCommandBuilder().setName('echo').setDescription('Echo text').toJSON());
    this.advancedOptions.cooldown = 2000; // ms
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'pong', ephemeral: false });
  }
}
```

Prefix command (extend `PrefixCommand`)

```ts
import { Message } from 'discord.js';
import PrefixCommand from '../PrefixCommand';

export default class PingCommand extends PrefixCommand {
  constructor() {
    super('ping', ['p'], 3000);
  }

  async run(args: string[], { message }) {
    await message.reply('pong');
  }
}
```

Register interactive components with a timeout and user-check:

```ts
import ComponentManager from '../component/manager/ComponentManager';
import { ComponentEnum } from '../enum/ComponentEnum';

ComponentManager.getComponentManager().register({
  customId: 'confirm-123',
  type: ComponentEnum.BUTTON,
  userCheck: ['allowed-user-id'],
  timeout: 30_000,
  handler: async (interaction) => { await interaction.reply('confirmed'); },
  onTimeout: async () => { /* cleanup */ },
});
```

---

## Database & migrations
- Uses Sequelize. Models live under `src/database/models` and `SQLize.ts` handles connection.
- For production use Postgres/MySQL; configure via `config.yaml` or environment variables.
- Add migrations using your preferred migration workflow (not included). Keep models backward-compatible during deployments and perform rolling updates when needed.

---

## Runtime & deployment notes
- Build with `yarn compile` (TypeScript -> `build/src`), run the compiled build with Node.js for production.
- Use process managers (systemd, PM2, or Docker) for reliable restarts and logging.
- When deploying multiple instances, centralize stateful features (DB, caches) and avoid local-only storage for critical data.

Docker example (minimal):

```Dockerfile
FROM node:18
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY . .
RUN yarn compile
CMD ["node", "build/src/index.js"]
```

---

## Scripts (from package.json)
- `yarn start` — watch-run (tsx)
- `yarn compile` — `tsc` build
- `yarn lint` / `yarn fix` — gts linting and fixes
- `yarn clean` — remove build artifacts

---

## Debugging & testing
- Use the `ExtendedClient` logging and `Log4TS` to emit structured logs.
- Attach the Node inspector (`node --inspect`) when running compiled code for breakpoint debugging.
- Add unit tests around pure utilities; integration tests should run against a controlled DB instance.

---

## Contributing & maintenance
- Follow Conventional Commits and open PRs against `develop` or `main` depending on your workflow.
- Keep changes small and add tests for logic changes.
- For any breaking API change, update `CHANGELOG.md` and bump version according to SemVer.

---

## Security & best practices
- Rotate bot tokens and never store them in repo.
- Use environment-based config per deployment environment.
- Validate user inputs for components and commands; do not trust client-side IDs.

---

## Contact & support
For internal support, reach out to the development team listed in your organization. For external usage examples and integration questions, consult the code under `src/`.

---

**ManagerBot — maintainers guide**

Developed with ❤️ by **NStore**

</div>