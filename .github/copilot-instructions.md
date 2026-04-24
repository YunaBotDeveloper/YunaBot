# Copilot Instructions for YunaBot

## Build, lint, and test commands

- Development (hot reload): `bun run dev`
- Compile TypeScript: `npm run compile`
- Lint (GTS): `npm run lint`
- Auto-fix lint issues: `npm run fix`
- Clean build artifacts: `npm run clean`
- Run compiled bot: `node build/index.js` (after `npm run compile`)

This repository currently does not define a dedicated test script in `package.json`, so there is no project-specific single-test command yet.

## High-level architecture

- Entry point is `src/index.ts`, which gets a singleton client from `Access.getClient()` and calls `initialize()`.
- `ExtendedClient` (`src/classes/ExtendedClient.ts`) orchestrates startup in this order: load Sequelize models, sync/auth DB, load events, log in to Discord, load/register commands, then load pending temp bans.
- Commands are managed by `CommandManager`, which dynamically loads classes from `src/commands/impl` and registers slash/context-menu commands with the Discord API at startup.
- Events are managed by `EventManager`, which dynamically loads all event classes from `src/events/impl` and wires them to `client.on`/`client.once`.
- Interactive UI flows are handled by `ComponentManager` and the in-memory `client.components` map; handlers are dispatched in `SlashCommandHandler` for button/select/modal interactions.
- Persistence uses Sequelize + SQLite (`SQLize`), auto-loading model initializers from `src/database/models/*.model.ts`.
- Server message templates (welcome/goodbye/boost) are stored as JSON containers and rendered through `ComponentParser` + `VariableRegistry` token substitution.

## Key repository conventions

- Command type is class-based and inheritance-driven:
  - Slash commands extend `Command`
  - Prefix commands extend `PrefixCommand`
  - Context menu commands extend `ContextMenuCommand`
- Slash command category is inferred from the folder name under `src/commands/impl/slashes/<category>/` (set by `CommandManager` at load time).
- Cooldowns are in milliseconds and configured as:
  - `this.advancedOptions.cooldown` for slash/context-menu commands
  - `this.cooldown` for prefix commands
  - Enforcement is centralized in `SlashCommandHandler` and `PrefixCommandHandler` via `CooldownManager`.
- This codebase uses Discord Components V2 heavily (`ContainerBuilder`, `TextDisplay`, etc.). For container responses, include `MessageFlags.IsComponentsV2`.
- Reusable status UI is built with `StatusContainer.success/failed/loading` rather than ad-hoc container construction.
- Stateful interactive components must be registered through `ComponentManager.getComponentManager().register(...)` with unique `customId`, `type`, and typically `userCheck` + `timeout`.
- Configuration is loaded from `config.yaml` via `Config.getInstance()`. If missing, an example file is generated and startup fails until `bot.token` is provided.
- Database models are expected to export an `init*` function (for `SQLize.loadModels()` reflection) and use `*.model.ts` naming.

## MCP servers to configure for this repo

- **GitHub MCP**: useful for issue/PR triage, PR review context, and workflow run inspection while working on bot changes.
- **Context7 docs MCP**: useful for up-to-date API usage while editing `discord.js`, Sequelize, Bun, and TypeScript integrations.
- **Playwright MCP**: optional; only useful if you add or maintain a web dashboard/admin panel for this bot.
