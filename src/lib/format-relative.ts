export function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const ms = now - date.getTime();
  const sec = Math.round(ms / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return `hace ${sec}s`;
  if (min < 60) return `hace ${min} min`;
  if (hr < 24) return `hace ${hr} h`;
  if (day < 30) return `hace ${day} d`;
  return date.toLocaleDateString("es-CO");
}
