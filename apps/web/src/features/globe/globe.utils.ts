export function getSizeByMagnitude(mag: number): number {
  return Math.pow(1.5, mag) * 0.3;
}

export function getAltByMagnitude(mag: number): number {
  return Math.max(0.01, mag / 30);
}
