"use client";

import { useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./index";

/**
 * Follows Redux Toolkit's recommended Next.js App Router pattern: the store
 * is created once per component instance via useRef, so a fresh store is
 * created for every request on the server and reused for the lifetime of the
 * page on the client. Never shared as a module-level singleton.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
