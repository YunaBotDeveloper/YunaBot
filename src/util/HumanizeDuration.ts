export function humanizeDuration(ms: number): string {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days} ngày`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}
