/**
 * Local-only gate for the overlay.
 *
 * All must hold or the overlay stays off:
 * - NODE_ENV === "development"
 * - DEV_INFO_OVERLAY === "1" (explicit opt-in)
 * - VERCEL unset (blocks Preview/Production on Vercel hosts)
 *
 * Do not drive this with NEXT_PUBLIC_* / VITE_* public env vars.
 */

export type DevInfoEnv = {
  readonly NODE_ENV?: string;
  readonly VERCEL?: string;
  readonly DEV_INFO_OVERLAY?: string;
};

export function isDevInfoOverlayEnabled(
  env: DevInfoEnv = typeof process !== "undefined" ? process.env : {}
): boolean {
  if (env.VERCEL) {
    return false;
  }
  if (env.NODE_ENV !== "development") {
    return false;
  }
  return env.DEV_INFO_OVERLAY === "1";
}
