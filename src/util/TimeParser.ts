/**
 * Parse a duration string into milliseconds
 * Supports formats: Xm (minutes), Xh (hours), Xd (days)
 * @param duration - Duration string (e.g., "5m", "2h", "1d")
 * @returns Duration in milliseconds, or null if invalid format
 * @example
 * parseDuration("5m")  // returns 300000 (5 minutes)
 * parseDuration("2h")  // returns 7200000 (2 hours)
 * parseDuration("1d")  // returns 86400000 (1 day)
 */
export function parseDuration(duration: string): number | null {
  const regex = /^(\d+)([mhd])$/;
  const match = duration.match(regex);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}
