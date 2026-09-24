# Contributing

Thanks for helping with Dev Info Overlay.

## Setup

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm demo
```

Prefer **pnpm**. Pin exact dependency versions.

## Scope

- Library code: `dev-info-overlay/`
- Demo: `examples/vite-react/`
- Agent instructions: `INSTALL_FOR_AGENTS.md` and `dev-info-overlay/skills/`

Keep the overlay **local-dev only**. Do not add production telemetry, accounts, or hosted sync in v0.

## Pull requests

1. Keep changes focused.
2. Add/adjust tests for store/gate behavior when you touch those paths.
3. Run `pnpm test && pnpm typecheck && pnpm build` before opening a PR.
4. Update `dev-info-overlay/CHANGELOG.md` for user-facing changes.

## Security

Do not commit secrets. See [SECURITY.md](./SECURITY.md).
