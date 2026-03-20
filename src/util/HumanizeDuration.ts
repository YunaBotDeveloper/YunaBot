export function humanizeDuration(ms: number): string {
  const days = Math.floor(ms / 86400);
  const hours = Math.floor((ms % 86400) / 3600);
  const minutes = Math.floor((ms % 3600) / 60);
  if (days > 0) return `${days} ngày`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}
