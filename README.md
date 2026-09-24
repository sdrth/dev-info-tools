# Dev Info Overlay

Local-only React overlay for **logs**, **steps**, **AI tool calls**, and **metrics** during development.

![Dev Info Overlay demo — timeline panel open with the DI badge](./media/demo-overlay.png)

**GitHub:** [sdrth/dev-info-tools](https://github.com/sdrth/dev-info-tools)

## Why

Coding agents and AI features often leave you guessing what happened in the UI. This overlay sits on your app locally so you can watch the timeline without leaving the page.

Interaction and packaging cues draw from [Agentation](https://www.agentation.com/) and [Next.js Dev Tools](https://nextjs.org/docs/app/api-reference/config/next-config-js/devIndicators); the product itself is a local timeline for logs, steps, tool calls, and metrics.

## Quick start

**Copy from GitHub (no clone of this monorepo, no npm required):**  
[`INSTALL_FOR_AGENTS.md`](./INSTALL_FOR_AGENTS.md)

**Or clone this repo and run the demo:**

```bash
pnpm install
pnpm demo
```

Open http://localhost:5173 → **Run fake agent turn** → open the **DI** badge.

## Package

| Path | Role |
|---|---|
| [`dev-info-overlay/`](./dev-info-overlay) | Library source, build, skills |
| [`examples/vite-react/`](./examples/vite-react) | Demo app |
| [`INSTALL_FOR_AGENTS.md`](./INSTALL_FOR_AGENTS.md) | Public agent / vendor instructions |
| [`agent-dropins/`](./agent-dropins) | Pointers for dropping skills into host repos |

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Requirements

- React 18+
- Desktop browser (mobile is not a v0 goal)

## License

[MIT](./LICENSE)
