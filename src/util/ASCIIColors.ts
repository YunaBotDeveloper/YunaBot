/**
 * ASCII_Colors - Utility class for terminal/console colored output
 * Provides static methods to wrap messages with ANSI color codes
 */
export class ASCII_Colors {
  /**
   * Wrap message in red ANSI color
   * @param message - The message to colorize
   * @returns Message wrapped with red ANSI codes
   */
  static red(message: string) {
    return '\x1b[91m' + message + '\x1b[0m';
  }

  /**
   * Wrap message in blue ANSI color
   * @param message - The message to colorize
   * @returns Message wrapped with blue ANSI codes
   */
  static blue(message: string) {
    return '\x1b[96m' + message + '\x1b[0m';
  }

  /**
   * Wrap message in purple ANSI color
   * @param message - The message to colorize
   * @returns Message wrapped with purple ANSI codes
   */
  static purple(message: string) {
    return '\x1b[35m' + message + '\x1b[0m';
  }

  /**
   * Wrap message in yellow ANSI color
   * @param message - The message to colorize
   * @returns Message wrapped with yellow ANSI codes
   */
  static yellow(message: string) {
    return '\x1b[93m' + message + '\x1b[0m';
  }

  /**
   * Wrap message in green ANSI color
   * @param message - The message to colorize
   * @returns Message wrapped with green ANSI codes
   */
  static green(message: string) {
    return '\x1b[92m' + message + '\x1b[0m';
  }
}
