# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YunaBot (called "ManagerBot" in older docs and error embeds) is a modular Discord server management bot built with **discord.js v14**, **TypeScript**, and **SQLite** (Sequelize). It supports slash commands and context menu commands, and uses Discord Components V2 for its UI.

## Development Commands

```bash
bun run dev                 # Run src/index.ts directly with Bun, hot reload
npm run compile             # tsc -> build/ (rootDir is ".", so output is build/src/...)
node build/src/index.js     # Production run after compile
npm run lint                # gts lint (ESLint + Prettier, Google TS style)
npm run fix                 # Auto-fix lint issues
npm run clean               # Remove build output
```

There is no test suite: `package.json` has `pretest`/`posttest` hooks but no `test` script, and `test/` does not exist yet.

`config.yaml` (with `bot.token`) is read from the **current working directory**. If it is missing, `Config` writes an example file and throws.

## Architecture

### Startup flow

`src/index.ts` → `Access.getClient()` (the `ExtendedClient` singleton) → `ExtendedClient.initialize()`:

1. `SQLize.loadModels()` + `sequelize.sync()`. Every `*.model.ts` in `src/database/models/` is `require`d and its first exported `init*` function is called. There are no migrations; schema changes go through `sync()`.
2. `EventManager.loadEvents()` registers every file in `src/events/impl/`. The default export must extend `Event(name, once)`.
3. `login()`, then in parallel: `CommandManager.loadCommands()` and `emojiAPI.warmCache()`.

The repo is currently just the framework: there are no commands, no models, and the only events are `ReadyEvent` and `SlashCommandHandler`. Features are being rebuilt from scratch.

### Dynamic loading: things to watch for

- Commands, events and models are found with `fs.readdirSync(__dirname/...)` + `require()`, and both `.ts` and `.js` files match. The same code therefore runs under Bun (from `src/`) and under Node (from `build/src/`). Nothing is registered by hand.
- `CommandManager` walks `src/commands/impl/{slashes,menus}/{category}/`. The category folder name becomes `command.category` (slash commands only). A file's default export must be a class extending `Command` or `ContextMenuCommand`, and it is instantiated with no arguments. `impl/slashes/`, `impl/menus/` and `database/models/` contain a `.gitkeep`. Don't delete it: the loaders call `readdirSync` on those folders and crash if they are missing.
- `tsc` never deletes old output, so after removing or renaming a command, run `npm run clean` before `compile`. Otherwise the stale `.js` in `build/` is still loaded and registered.
- Commands are registered **globally** with a single `PUT Routes.applicationCommands(...)`. That call replaces everything, so if a command file fails to load, the command is removed from Discord.
- The SQLite path is `path.join(__dirname, '..', 'database', 'database.sqlite')`. A dev run uses `src/database/database.sqlite` and a compiled run uses `build/src/database/database.sqlite`, which are **two different databases**. `tsc` does not copy the file across.

### Interaction routing

`src/events/impl/SlashCommandHandler.ts` (on `InteractionCreate`) handles every interaction type: slash commands, context menus, autocomplete, and components. It applies `CooldownManager` cooldowns (`command.advancedOptions.cooldown`, in ms) before calling `command.run()`.

### Components (buttons / select menus / modals)

Components are not tied to a specific message. A component is registered in `client.components` (a `Map` keyed by `customId`) through `ComponentManager.getComponentManager().register([...])`, either as a plain `IComponent` object or as a built `ComponentBuilder` (`src/component/builders/`). Options:

- `userCheck: string[]` restricts the component to the listed user IDs; `'*'` allows anyone.
- `timeout` + `onTimeout` auto-unregister the component and run cleanup.
- The `client.components` map is global, so make each customId unique per invocation (for example `` `confirm_${interaction.id}` ``) and unregister it when the flow ends.

## Conventions

- **Components V2** are used for UI instead of embeds. Replies need `flags: [MessageFlags.IsComponentsV2]`. `StatusContainer.success/failed(emoji, text)` and `.loading(emoji)` (`src/util/StatusContainer.ts`) builds the standard status replies.
- **Application emojis**: `await client.api.emojiAPI.getEmojiByName(name)` resolves custom emojis (cached at startup). Commands usually resolve them at the start of `run()`.
- **Singletons** everywhere: `Access.getClient()`, `Config.getInstance()`, `ComponentManager.getComponentManager()`, `CooldownManager.getCooldownManager()`, `Log4TS.getLogger()`.
- Log through `Log4TS` (`info` / `success` / `warning` / `error`), not `console.log`.
- GTS style: 2-space indent, single quotes, semicolons, trailing commas, 80-column lines. Run `npm run fix` before finishing.
