import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDevInfoMarkdown } from "./copy.ts";
import { DevInfoStore } from "./store.ts";

describe("DevInfoStore", () => {
  it("pushes typed events and notifies subscribers", () => {
    const store = new DevInfoStore({ maxEvents: 10 });
    let versions: number[] = [];
    store.subscribe((snapshot) => {
      versions.push(snapshot.version);
    });

    store.log("hello", { source: "test" });
    store.step({
      stepId: "1",
      title: "Fetch",
      status: "running"
    });
    store.toolCall({
      name: "search",
      args: { q: "overlay" },
      durationMs: 12,
      status: "ok"
    });
    store.metric({ name: "tokens", value: 1200, unit: "tokens" });
    store.status({ label: "provider", value: "mock", tone: "ok" });

    const snapshot = store.getSnapshot();
    assert.equal(snapshot.events.length, 5);
    assert.equal(snapshot.events[0]?.kind, "log");
    assert.equal(versions.at(-1), 5);
  });

  it("caps the ring buffer", () => {
    const store = new DevInfoStore({ maxEvents: 3 });
    store.log("a");
    store.log("b");
    store.log("c");
    store.log("d");
    const messages = store
      .getSnapshot()
      .events.filter((event) => event.kind === "log")
      .map((event) => (event.kind === "log" ? event.message : ""));
    assert.deepEqual(messages, ["b", "c", "d"]);
  });

  it("keeps getSnapshot referentially stable until mutations", () => {
    const store = new DevInfoStore();
    const first = store.getSnapshot();
    const second = store.getSnapshot();
    assert.equal(first, second);
    store.log("changed");
    const third = store.getSnapshot();
    assert.notEqual(first, third);
    assert.equal(third, store.getSnapshot());
  });
});

describe("formatDevInfoMarkdown", () => {
  it("renders a readable timeline", () => {
    const store = new DevInfoStore();
    store.toolCall({
      name: "grep",
      args: { pattern: "DevInfo" },
      durationMs: 4,
      status: "ok"
    });
    const md = formatDevInfoMarkdown(store.getSnapshot(), {
      appName: "demo"
    });
    assert.match(md, /# Dev info · demo/);
    assert.match(md, /tool_call · grep/);
    assert.match(md, /duration:\*\* 4ms/);
  });
});
