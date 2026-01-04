export class EmbedColors {
  static red() {
    return 0xff0000;
  }

  static blue() {
    return 0x1fbdd2;
  }

  static purple() {
    return 0xbdb5d5;
  }

  static yellow() {
    return 0xffdf00;
  }

  static green() {
    return 0x5bb450;
  }

  static pink() {
    return 0xffc0cb;
  }

  static random() {
    return parseInt(
      (((1 << 24) * Math.random()) | 0).toString(16).padStart(6, '0'),
      16,
    );
  }
}
