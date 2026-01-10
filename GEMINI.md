# Gemini Project: ManagerBot

This document provides a comprehensive overview of the ManagerBot project, a Discord bot built with TypeScript and the discord.js library.

## Project Overview

ManagerBot is a feature-rich Discord bot designed to provide a variety of services within a Discord server. Its functionality includes command handling (both slash and prefix commands), event management, and a database integration for persistent data storage.

### Core Technologies

*   **Node.js:** The runtime environment for the bot.
*   **TypeScript:** The primary programming language, providing static typing and modern JavaScript features.
*   **discord.js:** The official Discord API library for Node.js, used for interacting with the Discord platform.
*   **Sequelize:** A modern TypeScript and Node.js ORM for Postgres, MySQL, MariaDB, SQLite and Microsoft SQL Server. It is used here with SQLite for database operations.
*   **Log4TS:** A logging framework for TypeScript.
*   **ESLint and Prettier:** Used for code linting and formatting to maintain a consistent code style.

### Architecture

The bot's architecture is modular and well-organized:

*   **`src/index.ts`:** The main entry point of the application.
*   **`src/classes/ExtendedClient.ts`:** The core of the bot, extending the `discord.js` Client and managing events, commands, and the database connection.
*   **`src/commands`:** Contains the command handling logic, with separate managers for slash and prefix commands.
*   **`src/events`:**  Handles Discord gateway events.
*   **`src/database`:** Manages the database connection and models using Sequelize.
*   **`src/config`:**  Handles the bot's configuration, loaded from a `config.yaml` file.
*   **`src/components`:**  Manages Discord message components like buttons and select menus.

## Building and Running

### Prerequisites

*   Node.js (v16.9.0 or higher)
*   Yarn package manager

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/ManagerBot.git
    cd ManagerBot
    ```
2.  Install the dependencies:
    ```bash
    yarn install
    ```

### Configuration

1.  Create a `config.yaml` file in the root directory of the project.
2.  Add the following content to the file, replacing `"YOUR_BOT_TOKEN_HERE"` with your actual Discord bot token:

    ```yaml
    bot:
      token: "YOUR_BOT_TOKEN_HERE"
    sicbo:
      diceEmojis:
        - "<:dice_1:1020949210915151912>"
        - "<:dice_2:1020949212223815770>"
        - "<:dice_3:1020949213423411240>"
        - "<:dice_4:1020949214463619072>"
        - "<:dice_5:1020949215688380426>"
        - "<:dice_6:1020949216795680768>"
      rollingFrame:
        - "<a:dice_rolling_1:1020949208012668928>"
        - "<a:dice_rolling_2:1020949209342263328>"
      waitTime: 10000
      updateInterval: 1000
      maxHistory: 10
    ```

### Running the Bot

To run the bot, use the following command:

```bash
yarn start
```

This will start the bot in development mode with hot-reloading.

## Development

### Scripts

*   `yarn lint`: Lints the code using `gts`.
*   `yarn clean`: Removes the `build` directory.
*   `yarn compile`: Compiles the TypeScript code to JavaScript.
*   `yarn fix`: Automatically fixes linting errors.

### Code Style

The project uses ESLint and Prettier to enforce a consistent code style. It is recommended to use an editor extension to automatically format the code on save.

### Contribution Guidelines

While there are no formal contribution guidelines at the moment, please ensure that your code adheres to the existing code style and that all tests pass before submitting a pull request.

## TODO

Here are some tasks that you can do to improve the `ManagerBot`:

*   **Add more commands:** The bot currently has a limited number of commands. You can add more commands to expand its functionality.
*   **Implement a more robust logging system:** The current logging system is very basic. You can implement a more robust logging system to make it easier to debug the bot.
*   **Add unit tests:** The project currently does not have any unit tests. You can add unit tests to ensure that the bot is working correctly.
*   **Improve the documentation:** The documentation for the project is very basic. You can improve the documentation to make it easier for other developers to contribute to the project.