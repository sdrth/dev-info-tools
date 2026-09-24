# AGENTS.md

## Layout

- Repo: https://github.com/sdrth/dev-info-tools
- Library: `dev-info-overlay/`
- Demo: `examples/vite-react/`
- Public agent entry: `INSTALL_FOR_AGENTS.md`
- Skills: `dev-info-overlay/skills/install-and-use-dev-info-overlay`, `emit-dev-info-traces`

## Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm demo
```

## Rules

- Prefer pnpm; pin exact dependency versions.
- Zero runtime dependencies; React / ReactDOM are peers only.
- Keep the overlay local-only (`DEV_INFO_OVERLAY=1`, development, no Vercel) outside demos.
- External agents: follow `INSTALL_FOR_AGENTS.md` (copy from raw GitHub; full clone optional).
- Transient notes belong in gitignored `plans/` / `.scratch/` / `docs/` (not published).
