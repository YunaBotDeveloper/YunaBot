/**
 * EmbedColors - Utility class for Discord embed colors
 * Provides static methods to get hex color values for embeds
 */
export class EmbedColors {
  /**
   * Get red color for error/warning embeds
   * @returns Hex color value 0xff0000
   */
  static red() {
    return 0xff0000;
  }

  /**
   * Get blue color for info embeds
   * @returns Hex color value 0x1fbdd2
   */
  static blue() {
    return 0x1fbdd2;
  }

  /**
   * Get purple color for special embeds
   * @returns Hex color value 0xbdb5d5
   */
  static purple() {
    return 0xbdb5d5;
  }

  /**
   * Get yellow color for warning embeds
   * @returns Hex color value 0xffdf00
   */
  static yellow() {
    return 0xffdf00;
  }

  /**
   * Get green color for success embeds
   * @returns Hex color value 0x5bb450
   */
  static green() {
    return 0x5bb450;
  }

  /**
   * Get pink color for special embeds
   * @returns Hex color value 0xffc0cb
   */
  static pink() {
    return 0xffc0cb;
  }
}
