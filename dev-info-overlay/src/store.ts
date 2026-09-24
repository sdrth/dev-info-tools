import type {
  DevInfoEvent,
  DevInfoEventInput,
  DevInfoLogLevel,
  DevInfoMetricUnit,
  DevInfoSnapshot,
  DevInfoStepStatus,
  DevInfoTone
} from "./types.ts";

export type DevInfoStoreOptions = {
  readonly maxEvents?: number;
};

type Listener = (snapshot: DevInfoSnapshot) => void;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dio_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalize(input: DevInfoEventInput): DevInfoEvent {
  return {
    ...input,
    id: input.id ?? createId(),
    ts: input.ts ?? Date.now()
  } as DevInfoEvent;
}

export class DevInfoStore {
  private events: DevInfoEvent[] = [];
  private version = 0;
  /** Stable snapshot reference for useSyncExternalStore (Object.is). */
  private snapshot: DevInfoSnapshot = {
    events: this.events,
    version: this.version
  };
  private readonly listeners = new Set<Listener>();
  private readonly maxEvents: number;

  constructor(options: DevInfoStoreOptions = {}) {
    this.maxEvents = options.maxEvents ?? 200;
  }

  getSnapshot = (): DevInfoSnapshot => {
    return this.snapshot;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  push = (input: DevInfoEventInput): DevInfoEvent => {
    const event = normalize(input);
    const next = [...this.events, event];
    this.events =
      next.length > this.maxEvents
        ? next.slice(next.length - this.maxEvents)
        : next;
    this.version += 1;
    this.snapshot = {
      events: this.events,
      version: this.version
    };
    this.emit();
    return event;
  };

  clear = (): void => {
    if (this.events.length === 0) {
      return;
    }
    this.events = [];
    this.version += 1;
    this.snapshot = {
      events: this.events,
      version: this.version
    };
    this.emit();
  };

  log = (
    message: string,
    options: {
      readonly level?: DevInfoLogLevel;
      readonly detail?: string;
      readonly source?: string;
      readonly sessionId?: string;
      readonly meta?: Readonly<Record<string, unknown>>;
    } = {}
  ): DevInfoEvent => {
    return this.push({
      kind: "log",
      message,
      level: options.level ?? "info",
      detail: options.detail,
      source: options.source,
      sessionId: options.sessionId,
      meta: options.meta
    });
  };

  step = (input: {
    readonly stepId: string;
    readonly title: string;
    readonly status: DevInfoStepStatus;
    readonly detail?: string;
    readonly source?: string;
    readonly sessionId?: string;
    readonly meta?: Readonly<Record<string, unknown>>;
  }): DevInfoEvent => {
    return this.push({
      kind: "step",
      ...input
    });
  };

  toolCall = (input: {
    readonly name: string;
    readonly status?: DevInfoStepStatus;
    readonly args?: unknown;
    readonly result?: unknown;
    readonly durationMs?: number;
    readonly error?: string;
    readonly source?: string;
    readonly sessionId?: string;
    readonly meta?: Readonly<Record<string, unknown>>;
  }): DevInfoEvent => {
    return this.push({
      kind: "tool_call",
      ...input,
      status: input.status ?? "ok"
    });
  };

  status = (input: {
    readonly label: string;
    readonly value: string;
    readonly tone?: DevInfoTone;
    readonly source?: string;
    readonly sessionId?: string;
    readonly meta?: Readonly<Record<string, unknown>>;
  }): DevInfoEvent => {
    return this.push({
      kind: "status",
      ...input
    });
  };

  metric = (input: {
    readonly name: string;
    readonly value: number;
    readonly unit?: DevInfoMetricUnit;
    readonly label?: string;
    readonly source?: string;
    readonly sessionId?: string;
    readonly meta?: Readonly<Record<string, unknown>>;
  }): DevInfoEvent => {
    return this.push({
      kind: "metric",
      ...input
    });
  };

  private emit(): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

/** Shared process-local store for imperative instrumentation. */
export const devInfo = new DevInfoStore();
