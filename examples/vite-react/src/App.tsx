import { useCallback, useState } from "react";
import {
  DevInfoOverlay,
  devInfo
} from "dev-info-overlay";
import "dev-info-overlay/styles.css";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function runFakeAgentTurn(): Promise<void> {
  const source = "demo-agent";
  const started = performance.now();

  devInfo.status({
    label: "Mode",
    value: "mock agent turn",
    tone: "ok",
    source
  });
  devInfo.step({
    stepId: "plan",
    title: "Plan response",
    status: "running",
    source
  });
  await sleep(350);
  devInfo.step({
    stepId: "plan",
    title: "Plan response",
    status: "ok",
    detail: "1 tool call · summarize docs",
    source
  });

  const toolStarted = performance.now();
  devInfo.toolCall({
    name: "searchDocs",
    args: { query: "dev info overlay", limit: 3 },
    status: "running",
    source
  });
  await sleep(480);
  devInfo.toolCall({
    name: "searchDocs",
    args: { query: "dev info overlay", limit: 3 },
    result: {
      hits: [
        { path: "README.md", score: 0.91 },
        { path: "skills/emit-dev-info-traces/SKILL.md", score: 0.88 }
      ]
    },
    durationMs: Math.round(performance.now() - toolStarted),
    status: "ok",
    source
  });

  devInfo.metric({
    name: "prompt_tokens",
    value: 842,
    unit: "tokens",
    source: "llm"
  });
  devInfo.metric({
    name: "completion_tokens",
    value: 216,
    unit: "tokens",
    source: "llm"
  });
  devInfo.metric({
    name: "ttft",
    value: 118,
    unit: "ms",
    label: "time to first token",
    source: "llm"
  });
  devInfo.metric({
    name: "turn_latency",
    value: Math.round(performance.now() - started),
    unit: "ms",
    source
  });

  devInfo.log("Agent turn finished", {
    level: "info",
    source,
    detail: "Open the DI badge to inspect the timeline."
  });
}

export function App() {
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState(0);

  const onRun = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await runFakeAgentTurn();
      setRuns((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const onFail = useCallback(() => {
    devInfo.toolCall({
      name: "deployPreview",
      args: { target: "staging" },
      status: "fail",
      error: "Connection refused on port 8787",
      durationMs: 64,
      source: "demo-agent"
    });
    devInfo.log("Deploy failed", {
      level: "error",
      source: "demo-agent"
    });
  }, []);

  const onClear = useCallback(() => {
    devInfo.clear();
    setRuns(0);
  }, []);

  return (
    <>
      <main className="page">
        <p className="eyebrow">examples / vite-react</p>
        <h1>Dev Info Overlay</h1>
        <p className="lede">
          Push sample logs, steps, tool calls, and token metrics into the local
          overlay. Open the badge in the corner to inspect the timeline.
        </p>

        <div className="actions">
          <button type="button" className="primary" disabled={busy} onClick={() => void onRun()}>
            {busy ? "Running…" : "Run fake agent turn"}
          </button>
          <button type="button" onClick={onFail}>
            Emit failure
          </button>
          <button type="button" onClick={onClear}>
            Clear timeline
          </button>
        </div>

        <p className="meta">
          Turns completed: <strong>{runs}</strong>
          <span aria-hidden> · </span>
          Overlay always on in this demo (<code>enabled</code>)
        </p>
      </main>

      <DevInfoOverlay enabled appName="vite-react demo" mark="DI" />
    </>
  );
}
