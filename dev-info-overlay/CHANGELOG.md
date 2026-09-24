# Changelog

## 1.0.0

Initial public release ([sdrth/dev-info-tools](https://github.com/sdrth/dev-info-tools)).

- Corner overlay UI: filters, copy markdown, clear, resize, snap-to-corner
- Imperative store: `log` / `step` / `toolCall` / `status` / `metric`
- Local-only gate helpers (`DEV_INFO_OVERLAY=1`, development, no Vercel)
- Client entry + `dev-info-overlay/server` entry
- Agent skills for GitHub raw-URL vendoring and trace emission
- Agent docs use concrete `sdrth/dev-info-tools` raw URLs (no `OWNER/REPO/REF` placeholders)
- Example playground: `examples/vite-react` (`pnpm demo`)
- `enabled` defaults to `false`
