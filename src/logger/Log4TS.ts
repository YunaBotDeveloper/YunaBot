/**
 * Log4TS - Custom logger with colored console output
 *
 * Uses Singleton pattern to ensure only one logger instance exists.
 * Provides methods for different log levels with colored output.
 *
 * Usage:
 * ```typescript
 * const logger = Log4TS.getLogger();
 * logger.info('Information message');
 * logger.success('Success message');
 * logger.warning('Warning message');
 * logger.error('Error message');
 * logger.debug('Debug message');
 * ```
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {ASCII_Colors} from '../util/ASCIIColors';

export default class Log4TS {
  private static instance: Log4TS;

  /**
   * Get the singleton instance of Log4TS
   * @returns The Log4TS logger instance
   */
  static getLogger(): Log4TS {
    if (!Log4TS.instance) {
      Log4TS.instance = new Log4TS();
    }
    return Log4TS.instance;
  }

  /**
   * Get formatted timestamp for log messages
   * @returns Formatted timestamp string [DD Mon YYYY | HH:MM:SS]
   */
  private getFormattedTimestamp(): string {
    const now = new Date();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const pad = (n: number) => (n < 10 ? '0' : '') + n;

    return (
      `${pad(now.getDate())} ${
        months[now.getMonth()]
      } ${now.getFullYear()} | ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    );
  }

  /**
   * Internal log method with color formatting
   * @param logLevel - The log level (info, error, debug, warning, success)
   * @param message - The message to log
   */
  private log(
    logLevel: 'info' | 'error' | 'debug' | 'warning' | 'success',
    message: string,
  ) {
    const colorFunc = {
      info: ASCII_Colors.blue,
      warning: ASCII_Colors.yellow,
      debug: ASCII_Colors.purple,
      error: ASCII_Colors.red,
      success: ASCII_Colors.green,
    }[logLevel];

    console.log(
      `[${this.getFormattedTimestamp()}] ` +
        '[ManagerBot] ' +
        `[${colorFunc(logLevel.toUpperCase())}] - ${message}`,
    );
  }

  /**
   * Log an info message (blue)
   * @param message - The message to log
   */
  info(message: any) {
    this.log('info', message);
  }

  /**
   * Log an error message (red)
   * @param message - The message to log
   */
  error(message: any) {
    this.log('error', message);
  }

  /**
   * Log a debug message (purple)
   * @param message - The message to log
   */
  debug(message: any) {
    this.log('debug', message);
  }

  /**
   * Log a warning message (yellow)
   * @param message - The message to log
   */
  warning(message: any) {
    this.log('warning', message);
  }

  /**
   * Log a success message (green)
   * @param message - The message to log
   */
  success(message: any) {
    this.log('success', message);
  }
}
