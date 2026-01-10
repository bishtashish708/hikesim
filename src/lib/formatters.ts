export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function formatMiles(value: number): string {
  const rounded = value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${trimTrailingZeros(rounded)} mi`;
}

export function formatElevation(value: number): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString()} ft`;
}

export function formatFeet(value: number): string {
  return formatElevation(value);
}

export function formatIncline(value: number): string {
  const rounded = roundToStep(value, 0.5);
  return `${trimTrailingZeros(rounded.toFixed(1))}%`;
}

export function formatSpeed(value: number): string {
  const rounded = roundToStep(value, 0.1);
  return `${rounded.toFixed(1)} mph`;
}

export function formatMinutes(value: number): string {
  const rounded = roundToStep(value, 0.5);
  return trimTrailingZeros(rounded.toFixed(1));
}

function trimTrailingZeros(value: string): string {
  return value.replace(/\.?0+$/g, "");
}
