/* eslint-disable @typescript-eslint/no-explicit-any */
import {ASCII_Colors} from '../util/ASCIIColors';

export default class Log4TS {
  private static instance: Log4TS;

  static getLogger(): Log4TS {
    if (!Log4TS.instance) {
      Log4TS.instance = new Log4TS();
    }
    return Log4TS.instance;
  }

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
        '[Yuna] ' +
        `[${colorFunc(logLevel.toUpperCase())}] - ${message}`,
    );
  }

  info(message: any) {
    this.log('info', message);
  }

  error(message: any) {
    this.log('error', message);
  }

  debug(message: any) {
    this.log('debug', message);
  }

  warning(message: any) {
    this.log('warning', message);
  }

  success(message: any) {
    this.log('success', message);
  }
}
