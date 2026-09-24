"use client";

import { useCallback, useSyncExternalStore } from "react";

import { type DevInfoStore, devInfo } from "./store.ts";
import type { DevInfoSnapshot } from "./types.ts";

const emptySnapshot: DevInfoSnapshot = {
  events: [],
  version: 0
};

/** Subscribe to a store (defaults to the shared `devInfo` singleton). */
export function useDevInfo(store: DevInfoStore = devInfo): DevInfoSnapshot {
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(onStoreChange),
    [store]
  );

  return useSyncExternalStore(subscribe, store.getSnapshot, () => emptySnapshot);
}
