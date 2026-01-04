export class ASCII_Colors {
  static red(message: string) {
    return '\x1b[91m' + message + '\x1b[0m';
  }

  static blue(message: string) {
    return '\x1b[96m' + message + '\x1b[0m';
  }

  static purple(message: string) {
    return '\x1b[35m' + message + '\x1b[0m';
  }

  static yellow(message: string) {
    return '\x1b[93m' + message + '\x1b[0m';
  }

  static green(message: string) {
    return '\x1b[92m' + message + '\x1b[0m';
  }
}
