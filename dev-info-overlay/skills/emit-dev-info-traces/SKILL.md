---
name: emit-dev-info-traces
description: Emit structured logs, steps, tool calls, and metrics to the local Dev Info Overlay so a human can watch agent/app activity during development. Use when instrumenting a TypeScript/React app that mounts DevInfoOverlay, or when a user asks to show AI tool calls, pipeline steps, token usage, or latency on-page.
---

# Emit Dev Info Traces

## When to use

The host app mounts `<DevInfoOverlay enabled={...} />` from `dev-info-overlay` for **local development only**. Your job is to push useful runtime context so the human can see what happened without leaving the page.

If the overlay is not installed yet, follow **`install-and-use-dev-info-overlay`** (or repo-root **`INSTALL_FOR_AGENTS.md`**) — default is copy source from public GitHub raw URLs into `vendor/dev-info-overlay/`.

Do **not** invent production telemetry. Only emit when the overlay is enabled.

## API

```ts
import { devInfo } from "dev-info-overlay";

devInfo.log(message, { level?, detail?, source? });
devInfo.step({ stepId, title, status, detail?, source? });
devInfo.toolCall({ name, args?, result?, durationMs?, status?, error?, source? });
devInfo.status({ label, value, tone?, source? });
devInfo.metric({ name, value, unit?, label?, source? });
devInfo.clear();
```

`status` for steps/tool calls: `pending` | `running` | `ok` | `fail`  
`tone` for status rows: `idle` | `ok` | `fail`  
`unit` for metrics: prefer `ms`, `tokens`, `usd`, or `count`

## What to emit

Be selective. Prefer a short timeline a human can scan:

1. **Pipeline steps** — start/finish of meaningful phases (`running` → `ok`/`fail`)
2. **Tool calls** — name, trimmed args, duration, success/failure (truncate large payloads)
3. **Metrics** — token totals, latency, estimated cost when known
4. **Status** — provider name, model id, mode (mock/live)
5. **Logs** — only high-signal messages; use `warn`/`error` for failures

Always set `source` to a stable label (route, agent name, or feature) so filters stay useful.

## Patterns

### Wrap a tool call

```ts
const started = performance.now();
devInfo.toolCall({
  name: "searchDocs",
  args: { query },
  status: "running",
  source: "agent"
});
try {
  const result = await searchDocs(query);
  devInfo.toolCall({
    name: "searchDocs",
    args: { query },
    result: summarize(result),
    durationMs: Math.round(performance.now() - started),
    status: "ok",
    source: "agent"
  });
  return result;
} catch (error) {
  devInfo.toolCall({
    name: "searchDocs",
    args: { query },
    durationMs: Math.round(performance.now() - started),
    status: "fail",
    error: error instanceof Error ? error.message : String(error),
    source: "agent"
  });
  throw error;
}
```

### Token / latency metrics

```ts
devInfo.metric({ name: "prompt_tokens", value: usage.prompt, unit: "tokens", source: "llm" });
devInfo.metric({ name: "completion_tokens", value: usage.completion, unit: "tokens", source: "llm" });
devInfo.metric({ name: "ttft", value: ttftMs, unit: "ms", label: "time to first token", source: "llm" });
```

### Multi-step flow

```ts
devInfo.step({ stepId: "plan", title: "Plan changes", status: "running", source: "agent" });
// ...
devInfo.step({ stepId: "plan", title: "Plan changes", status: "ok", source: "agent" });
devInfo.step({ stepId: "edit", title: "Apply edits", status: "running", source: "agent" });
```

## Safety

- Never put secrets, API keys, cookies, or PII into args/results/details.
- Truncate large strings (aim &lt; 2KB per field).
- The overlay is human-view only; do not rely on it for agent-to-agent sync.
- Respect the host gate (`DEV_INFO_OVERLAY=1`, development only). If `enabled` is false, skip emissions or no-op.

## Verification

After wiring:

1. Confirm the badge appears in the corner when the gate is on.
2. Emit a test `devInfo.log("overlay wired", { source: "smoke" })`.
3. Open the panel and confirm the event shows under the log filter.
