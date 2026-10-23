/** A permissive international-friendly phone check: optional leading +, 7-15 digits, spaces/dashes/parens allowed. */
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{6,17}[0-9]$/;

export function isValidPhoneNumber(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function clampPercentage(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
