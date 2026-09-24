---
name: install-and-use-dev-info-overlay
description: Install and wire Dev Info Overlay by copying source from the public GitHub repo (raw URLs — no clone, no npm, no GitHub Packages required), or optionally from a published npm package later. Use when adding a local logs/steps/tool-call overlay, vendoring from GitHub, or setting up agent instructions for on-page AI traces.
---

# Install and use Dev Info Overlay

You are setting up **dev-info-overlay**: a local-only React corner overlay for logs, steps, tool calls, and metrics during development. Humans watch; agents push events.

**Default path: copy implementation from the public GitHub repo.** Do not require cloning the full monorepo. Do not require npm registry or GitHub Packages. Fetch individual source files over HTTPS and implement locally.

## Resolve the GitHub base URL

**Default for this project** (use unless the user pointed at a fork/mirror):

```text
RAW=https://raw.githubusercontent.com/sdrth/dev-info-tools/main
```

If the user pasted a different GitHub link, rebuild `RAW` from that URL’s owner/repo/ref (`main` if the ref is unclear). Do **not** invent an owner/repo. Ask once if unknown.

Canonical instruction pages on GitHub (read these first if browsing the repo):

- `INSTALL_FOR_AGENTS.md` (repo root)
- `dev-info-overlay/skills/install-and-use-dev-info-overlay/SKILL.md` (this file)
- `dev-info-overlay/skills/emit-dev-info-traces/SKILL.md`

Raw form of this skill:

```text
https://raw.githubusercontent.com/sdrth/dev-info-tools/main/dev-info-overlay/skills/install-and-use-dev-info-overlay/SKILL.md
```

---

## Mode GITHUB (default) — copy & implement locally

### 1. Create the vendor tree

```bash
mkdir -p vendor/dev-info-overlay
mkdir -p .agents/skills/emit-dev-info-traces
mkdir -p .agents/skills/install-and-use-dev-info-overlay
```

(Use `.cursor/skills/` or `.claude/skills/` instead of `.agents/skills/` if that matches the host.)

### 2. Download source files (exact list)

Fetch each URL into the matching local path. Prefer `curl -fsSL` (or the environment’s HTTP fetch). **Do not** regenerate or “approximate” these modules.

| Remote (under `$RAW/`) | Local path |
|---|---|
| `dev-info-overlay/src/copy.ts` | `vendor/dev-info-overlay/copy.ts` |
| `dev-info-overlay/src/gate.ts` | `vendor/dev-info-overlay/gate.ts` |
| `dev-info-overlay/src/store.ts` | `vendor/dev-info-overlay/store.ts` |
| `dev-info-overlay/src/types.ts` | `vendor/dev-info-overlay/types.ts` |
| `dev-info-overlay/src/useDevInfo.ts` | `vendor/dev-info-overlay/useDevInfo.ts` |
| `dev-info-overlay/src/DevInfoOverlay.tsx` | `vendor/dev-info-overlay/DevInfoOverlay.tsx` |
| `dev-info-overlay/src/index.ts` | `vendor/dev-info-overlay/index.ts` |
| `dev-info-overlay/src/server.ts` | `vendor/dev-info-overlay/server.ts` |
| `dev-info-overlay/src/styles.css` | `vendor/dev-info-overlay/styles.css` |
| `dev-info-overlay/skills/emit-dev-info-traces/SKILL.md` | `.agents/skills/emit-dev-info-traces/SKILL.md` |
| `dev-info-overlay/skills/install-and-use-dev-info-overlay/SKILL.md` | `.agents/skills/install-and-use-dev-info-overlay/SKILL.md` |

Shell sketch:

```bash
RAW="https://raw.githubusercontent.com/sdrth/dev-info-tools/main"
BASE="$RAW/dev-info-overlay"
for f in copy.ts gate.ts store.ts types.ts useDevInfo.ts DevInfoOverlay.tsx index.ts server.ts styles.css; do
  curl -fsSL "$BASE/src/$f" -o "vendor/dev-info-overlay/$f"
done
curl -fsSL "$BASE/skills/emit-dev-info-traces/SKILL.md" \
  -o ".agents/skills/emit-dev-info-traces/SKILL.md"
curl -fsSL "$BASE/skills/install-and-use-dev-info-overlay/SKILL.md" \
  -o ".agents/skills/install-and-use-dev-info-overlay/SKILL.md"
```

If a download fails (404), stop and fix `RAW` (branch/tag or fork). Never invent replacement source.

### 3. Alias imports (keep the `"dev-info-overlay"` specifier)

**Vite** (`vite.config.ts`):

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.resolve(root, "vendor/dev-info-overlay");

export default defineConfig({
  resolve: {
    alias: {
      "dev-info-overlay/styles.css": path.join(vendor, "styles.css"),
      "dev-info-overlay/server": path.join(vendor, "server.ts"),
      "dev-info-overlay": path.join(vendor, "index.ts"),
      react: path.resolve(root, "node_modules/react"),
      "react-dom": path.resolve(root, "node_modules/react-dom")
    },
    dedupe: ["react", "react-dom"]
  }
});
```

**TypeScript** paths (host `tsconfig`):

```json
{
  "compilerOptions": {
    "paths": {
      "dev-info-overlay": ["./vendor/dev-info-overlay/index.ts"],
      "dev-info-overlay/server": ["./vendor/dev-info-overlay/server.ts"],
      "dev-info-overlay/styles.css": ["./vendor/dev-info-overlay/styles.css"]
    }
  }
}
```

Vendored sources use `.ts` / `.tsx` in relative imports. For Vite this is fine. If host `tsc` errors with TS5097, set `"allowImportingTsExtensions": true` and `"noEmit": true` (or project references that already allow it). Do **not** rewrite the vendored API.

**Next.js:** transpile `vendor/dev-info-overlay` (or the alias target). Mount UI from a Client Component; compute `enabled` on the server (see Wire).

### 4. Peers

Host must already have `react` and `react-dom` ≥18. Add **no** overlay runtime dependencies.

---

## Mode NPM (optional, only if published)

Only if `npm view dev-info-overlay version` succeeds (or the user confirms a published version):

```bash
pnpm add -D dev-info-overlay@<pinned-version>
```

Until then, **use Mode GITHUB**. Do not install an empty/parked npm name.

Still copy the two skills from `$RAW/.../skills/...` into the host so agents keep the workflow without depending on the package tarball for instructions.

---

## Wire

### Gate

All must hold or do not show the overlay:

1. Development (`NODE_ENV === "development"` / Vite `mode === "development"`)
2. `VERCEL` unset
3. Explicit `DEV_INFO_OVERLAY=1`

Never enable via public `NEXT_PUBLIC_*` / `VITE_*` alone.

Pass `enabled` as a **boolean prop** from a trusted place:

**Next.js App Router** — gate on the server, UI on the client:

```tsx
// Server Component
import { isDevInfoOverlayEnabled } from "dev-info-overlay/server";
import { DevInfoOverlayClient } from "./DevInfoOverlayClient";

export default function RootLayout({ children }) {
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
import { DevInfoOverlay } from "dev-info-overlay";
import "dev-info-overlay/styles.css";

export function DevInfoOverlayClient({ enabled }: { enabled: boolean }) {
  return <DevInfoOverlay enabled={enabled} appName="YourApp" />;
}
```

**Vite** — compute in config and inject, or pass `enabled={import.meta.env.DEV && hostFlag}` only when the flag is intentionally available to the client. Prefer a small server/proxy gate when possible.

Always pass `enabled={...}` explicitly. The component defaults to **`enabled={false}`**.

### Mount & emit

```ts
import { DevInfoOverlay, devInfo } from "dev-info-overlay";
import "dev-info-overlay/styles.css";

// mount once near root with enabled={...}

devInfo.log(message, { level?, detail?, source? });
devInfo.step({ stepId, title, status, detail?, source? });
devInfo.toolCall({ name, args?, result?, durationMs?, status?, error?, source? });
devInfo.status({ label, value, tone?, source? });
devInfo.metric({ name, value, unit?, label?, source? });
```

For what to emit, follow **`emit-dev-info-traces`** (also fetched in Mode GITHUB).

**Note:** `devInfo` is an in-memory client store. Events from **server-only** code do not appear until you forward them to the client (e.g. attach a `_dev` payload on the server with `withDevInfoPayload` from `dev-info-overlay/server`, then push into `devInfo` on the client). Prefer emitting from client-visible agent/tool wrappers when possible.

---

## Safety

- Local development only.
- No secrets / PII in payloads; truncate large blobs (&lt; ~2KB/field).
- Human view only — not an agent sync bus.

---

## Verify

1. `DEV_INFO_OVERLAY=1` + development → badge visible.
2. `devInfo.log("overlay wired", { source: "smoke" })` → visible in panel.
3. Production / Preview / gate off → no badge.
4. Skills present under the host’s agent skills folder.

---

## Drop-in for host `AGENTS.md`

```md
### Dev Info Overlay
Copy implementation from the public GitHub repo (raw URLs → `vendor/dev-info-overlay/`).
No clone or npm required. Skills: install-and-use-dev-info-overlay, emit-dev-info-traces.
Mount `<DevInfoOverlay enabled={…} />`; gate with development + `DEV_INFO_OVERLAY=1` + no Vercel.
Push via `devInfo.*` on the client. See INSTALL_FOR_AGENTS.md on the upstream repo.
```
