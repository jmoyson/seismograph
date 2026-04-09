export function getColorByMagnitude(mag: number): string {
  if (mag < 3) return '#43a047';
  if (mag < 4) return '#fdd835';
  if (mag < 5) return '#fb8c00';
  if (mag < 6) return '#e53935';
  if (mag < 7) return '#b71c1c';
  return '#4a148c';
}

export function getSizeByMagnitude(mag: number): number {
  return Math.pow(1.5, mag) * 0.3;
}

export function getAltByMagnitude(mag: number): number {
  return Math.max(0.01, mag / 30);
}

export function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "a l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  return `il y a ${Math.floor(seconds / 86400)}j`;
}
