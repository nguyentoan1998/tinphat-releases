/**
 * Converts work hours to "Công" units.
 * 1 công = 9 hours.
 * Rounds to 1 decimal place as per requirement.
 */
export function calculateCong(hours: number): number {
  if (!hours || hours <= 0) return 0.0;
  const cong = hours / 9;
  return Math.round(cong * 10) / 10;
}
