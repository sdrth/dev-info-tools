export { isDevInfoOverlayEnabled } from "./gate.ts";
export type { DevInfoEnv } from "./gate.ts";

import { isDevInfoOverlayEnabled as gateEnabled } from "./gate.ts";
import type { DevInfoEnv } from "./gate.ts";

/**
 * Attach a `_dev` payload only when the overlay gate is on.
 * Production / Preview / gated-off local always return the original value.
 */
export function withDevInfoPayload<T extends object, D>(
  value: T,
  payload: D | undefined,
  env: DevInfoEnv = typeof process !== "undefined" ? process.env : {}
): T | (T & { readonly _dev: D }) {
  if (!gateEnabled(env) || payload === undefined) {
    return value;
  }
  return { ...value, _dev: payload };
}

export function readDevInfoPayload<D>(
  value: unknown,
  env: DevInfoEnv = typeof process !== "undefined" ? process.env : {}
): D | null {
  if (!gateEnabled(env)) {
    return null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = (value as { _dev?: D })._dev;
  return candidate === undefined ? null : candidate;
}
