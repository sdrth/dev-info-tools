export type DevInfoTone = "idle" | "ok" | "fail";

export type DevInfoLogLevel = "debug" | "info" | "warn" | "error";

export type DevInfoStepStatus = "pending" | "running" | "ok" | "fail";

export type DevInfoMetricUnit = "ms" | "tokens" | "usd" | "count" | (string & {});

type DevInfoBase = {
  readonly id: string;
  readonly ts: number;
  readonly source?: string;
  readonly sessionId?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type DevInfoLogEvent = DevInfoBase & {
  readonly kind: "log";
  readonly level?: DevInfoLogLevel;
  readonly message: string;
  readonly detail?: string;
};

export type DevInfoStepEvent = DevInfoBase & {
  readonly kind: "step";
  readonly stepId: string;
  readonly title: string;
  readonly status: DevInfoStepStatus;
  readonly detail?: string;
};

export type DevInfoToolCallEvent = DevInfoBase & {
  readonly kind: "tool_call";
  readonly name: string;
  readonly status?: DevInfoStepStatus;
  readonly args?: unknown;
  readonly result?: unknown;
  readonly durationMs?: number;
  readonly error?: string;
};

export type DevInfoStatusEvent = DevInfoBase & {
  readonly kind: "status";
  readonly label: string;
  readonly value: string;
  readonly tone?: DevInfoTone;
};

export type DevInfoMetricEvent = DevInfoBase & {
  readonly kind: "metric";
  readonly name: string;
  readonly value: number;
  readonly unit?: DevInfoMetricUnit;
  readonly label?: string;
};

export type DevInfoEvent =
  | DevInfoLogEvent
  | DevInfoStepEvent
  | DevInfoToolCallEvent
  | DevInfoStatusEvent
  | DevInfoMetricEvent;

export type DevInfoEventInput =
  | Omit<DevInfoLogEvent, "id" | "ts"> & { readonly id?: string; readonly ts?: number }
  | Omit<DevInfoStepEvent, "id" | "ts"> & { readonly id?: string; readonly ts?: number }
  | Omit<DevInfoToolCallEvent, "id" | "ts"> & { readonly id?: string; readonly ts?: number }
  | Omit<DevInfoStatusEvent, "id" | "ts"> & { readonly id?: string; readonly ts?: number }
  | Omit<DevInfoMetricEvent, "id" | "ts"> & { readonly id?: string; readonly ts?: number };

export type DevInfoOverlayCorner =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export type DevInfoSnapshot = {
  readonly events: readonly DevInfoEvent[];
  readonly version: number;
};
