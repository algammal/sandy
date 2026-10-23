/**
 * A small, replaceable demo-persistence adapter backed by `localStorage`.
 *
 * Scope and limits (read before relying on this for anything beyond the
 * current demo phase): `localStorage` is per-origin. The client portal and
 * internal dashboard are two separate Next.js apps on two separate origins
 * (different ports in local dev, different domains once deployed), so data
 * saved by one app is invisible to the other through this adapter — it only
 * makes an app's own state survive a reload. Cross-app visibility is handled
 * explicitly elsewhere via the submission-bundle export/import bridge. A real
 * backend should replace this adapter with actual API persistence; every
 * caller goes through this module so that swap touches one place.
 */
export interface StorageAdapter {
  read<T>(key: string): T | undefined;
  write<T>(key: string, value: T): void;
  remove(key: string): void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createLocalStorageAdapter(namespace: string): StorageAdapter {
  const prefixed = (key: string) => `${namespace}:${key}`;

  return {
    read<T>(key: string): T | undefined {
      if (!isBrowser()) return undefined;
      try {
        const raw = window.localStorage.getItem(prefixed(key));
        if (raw === null) return undefined;
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },
    write<T>(key: string, value: T): void {
      if (!isBrowser()) return;
      try {
        window.localStorage.setItem(prefixed(key), JSON.stringify(value));
      } catch {
        // Storage can throw in private browsing or when the quota is exceeded.
        // Demo persistence is best-effort — failing silently is acceptable here.
      }
    },
    remove(key: string): void {
      if (!isBrowser()) return;
      try {
        window.localStorage.removeItem(prefixed(key));
      } catch {
        // See write() above.
      }
    },
  };
}
