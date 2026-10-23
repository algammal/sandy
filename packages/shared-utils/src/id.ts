/** Generates a reasonably unique, URL-safe id for demo/mock data. Not cryptographically secure. */
export function generateId(prefix?: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36).slice(-6);
  const value = `${time}${random}`;
  return prefix ? `${prefix}_${value}` : value;
}
