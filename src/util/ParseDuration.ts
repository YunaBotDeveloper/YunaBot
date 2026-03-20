export function parseDuration(duration: string | null): number | null {
  if (!duration) return null;

  const regex = /^(\d+)([mhd])$/;
  const match = duration.match(regex);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  if (value <= 0) return null;

  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return null;
  }
}
