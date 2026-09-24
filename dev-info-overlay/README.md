# dev-info-overlay

Local-only React overlay for **logs, steps, tool calls, and metrics** during development.

![Dev Info Overlay demo](../media/demo-overlay.png)

Inspired by:

- [Agentation](https://www.agentation.com/) — drop-in React toolbar, peers-only runtime, agent-friendly local tooling
- [Next.js Dev Tools](https://nextjs.org/docs/app/api-reference/config/next-config-js/devIndicators) — corner indicator, expand-on-activate interaction

This package is for **runtime observability** (logs / steps / tool calls / metrics), not UI annotation.

## Install

**Recommended:** copy source from the public GitHub repo (no full monorepo clone, no npm required). See [`INSTALL_FOR_AGENTS.md`](../INSTALL_FOR_AGENTS.md).

```bash
# Only after the package is published on npm:
pnpm add -D dev-info-overlay@1.0.0
```

## Usage

Pass `enabled` from a **trusted host signal**. The component defaults to **off**.

### Next.js App Router

```tsx
// Server Component
import { isDevInfoOverlayEnabled } from "dev-info-overlay/server";
import { DevInfoOverlayClient } from "./DevInfoOverlayClient";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <DevInfoOverlayClient enabled={isDevInfoOverlayEnabled()} />
      </body>
    </html>
  );
}
```

```tsx
// DevInfoOverlayClient.tsx
"use client";

import { DevInfoOverlay, devInfo } from "dev-info-overlay";
import "dev-info-overlay/styles.css";

export function DevInfoOverlayClient({ enabled }: { enabled: boolean }) {
  return <DevInfoOverlay enabled={enabled} appName="YourApp" />;
}

// Client instrumentation:
devInfo.log("predict started", { source: "quiz" });
```

### Vite / SPA

Compute `enabled` in a place that can read non-public env (or force `true` only in a local demo). Do **not** turn the overlay on with `VITE_*` / `NEXT_PUBLIC_*` alone in real apps.

```tsx
import { DevInfoOverlay, devInfo } from "dev-info-overlay";
import "dev-info-overlay/styles.css";

<DevInfoOverlay enabled={enabled} appName="Checkout" />

devInfo.toolCall({
  name: "search",
  args: { q: "overlay" },
  durationMs: 42,
  status: "ok",
  source: "agent"
});
```

### Hard gate

All should be true before you pass `enabled={true}`:

1. `NODE_ENV === "development"` (or equivalent)
2. `VERCEL` unset
3. `DEV_INFO_OVERLAY=1` explicit opt-in

`isDevInfoOverlayEnabled()` from **`dev-info-overlay/server`** encodes that check for Node/server runtimes.

## Agent skills

| Skill | Purpose |
|---|---|
| `skills/install-and-use-dev-info-overlay` | Copy from GitHub raw URLs (default) or npm when published |
| `skills/emit-dev-info-traces` | What to push onto the timeline |

## API

| Export | Role |
|---|---|
| `DevInfoOverlay` | Corner badge + timeline panel |
| `devInfo` | Shared client store |
| `DevInfoStore` | Create an isolated store |
| `useDevInfo` | React subscription |
| `isDevInfoOverlayEnabled` | Gate helper (also on `/server`) |
| `formatDevInfoMarkdown` | Copy-friendly timeline |
| `withDevInfoPayload` / `readDevInfoPayload` | Server `_dev` helpers (`dev-info-overlay/server`) |

`devInfo` is **in-memory on the client**. Server-only emissions need an explicit bridge to the browser.

## Requirements

- React 18+
- Node 20.19+ for package scripts / tests
- Desktop browser (mobile is not a v0 goal)

## License

[MIT](./LICENSE)
