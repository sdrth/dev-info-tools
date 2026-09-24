"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

import { formatDevInfoMarkdown } from "./copy.ts";
import { type DevInfoStore, devInfo } from "./store.ts";
import type {
  DevInfoEvent,
  DevInfoOverlayCorner,
  DevInfoTone
} from "./types.ts";
import { useDevInfo } from "./useDevInfo.ts";

const CORNER_KEY = "dev-info-overlay.corner";
const EXPANDED_KEY = "dev-info-overlay.expanded";
const SIZE_KEY = "dev-info-overlay.size";

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 460;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 240;

type MenuSize = {
  readonly width: number;
  readonly height: number;
};

export type DevInfoOverlayProps = {
  /**
   * Host-controlled gate. Prefer `false` unless a trusted server/dev signal
   * opts in. Defaults to `false` so production mounts stay dark by accident.
   */
  readonly enabled?: boolean;
  readonly store?: DevInfoStore;
  /** Short mark shown on the collapsed badge. */
  readonly mark?: string;
  /** Included in copied markdown. */
  readonly appName?: string;
  readonly className?: string;
};

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function toneClass(tone: DevInfoTone | undefined): string {
  if (tone === "ok") {
    return "dio--ok";
  }
  if (tone === "fail") {
    return "dio--fail";
  }
  return "dio--idle";
}

function eventTone(event: DevInfoEvent): DevInfoTone {
  switch (event.kind) {
    case "log":
      if (event.level === "error") {
        return "fail";
      }
      return "idle";
    case "step":
    case "tool_call":
      if (event.status === "fail") {
        return "fail";
      }
      if (event.status === "ok") {
        return "ok";
      }
      return "idle";
    case "status":
      return event.tone ?? "idle";
    case "metric":
      return "idle";
  }
}

function readCorner(): DevInfoOverlayCorner {
  try {
    const value = window.localStorage.getItem(CORNER_KEY);
    if (
      value === "bottom-right" ||
      value === "bottom-left" ||
      value === "top-right" ||
      value === "top-left"
    ) {
      return value;
    }
  } catch {
    // ignore
  }
  return "bottom-right";
}

function writeCorner(corner: DevInfoOverlayCorner): void {
  try {
    window.localStorage.setItem(CORNER_KEY, corner);
  } catch {
    // ignore
  }
}

function readExpanded(): boolean {
  try {
    return window.localStorage.getItem(EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeExpanded(expanded: boolean): void {
  try {
    window.localStorage.setItem(EXPANDED_KEY, expanded ? "1" : "0");
  } catch {
    // ignore
  }
}

function viewportMaxSize(): MenuSize {
  const gap = 24;
  return {
    width: Math.max(MIN_WIDTH, window.innerWidth - gap),
    height: Math.max(MIN_HEIGHT, Math.floor(window.innerHeight * 0.92) - gap)
  };
}

function clampSize(size: MenuSize): MenuSize {
  const max = viewportMaxSize();
  return {
    width: Math.min(max.width, Math.max(MIN_WIDTH, Math.round(size.width))),
    height: Math.min(max.height, Math.max(MIN_HEIGHT, Math.round(size.height)))
  };
}

function readSize(): MenuSize {
  try {
    const raw = window.localStorage.getItem(SIZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { width?: unknown; height?: unknown };
      if (
        typeof parsed.width === "number" &&
        typeof parsed.height === "number" &&
        Number.isFinite(parsed.width) &&
        Number.isFinite(parsed.height)
      ) {
        return clampSize({ width: parsed.width, height: parsed.height });
      }
    }
  } catch {
    // ignore
  }
  return clampSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
}

function writeSize(size: MenuSize): void {
  try {
    window.localStorage.setItem(SIZE_KEY, JSON.stringify(size));
  } catch {
    // ignore
  }
}

function project(initialVelocity: number, decelerationRate = 0.998): number {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function nearestCorner(x: number, y: number): DevInfoOverlayCorner {
  const midX = window.innerWidth / 2;
  const midY = window.innerHeight / 2;
  const bottom = y >= midY;
  const right = x >= midX;
  if (bottom && right) {
    return "bottom-right";
  }
  if (bottom) {
    return "bottom-left";
  }
  if (right) {
    return "top-right";
  }
  return "top-left";
}

function edgesForCorner(corner: DevInfoOverlayCorner): readonly ResizeEdge[] {
  switch (corner) {
    case "bottom-right":
      return ["n", "w", "nw"];
    case "bottom-left":
      return ["n", "e", "ne"];
    case "top-right":
      return ["s", "w", "sw"];
    case "top-left":
      return ["s", "e", "se"];
  }
}

function cursorForEdge(edge: ResizeEdge): string {
  switch (edge) {
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
  }
}

function aggregateTone(events: readonly DevInfoEvent[]): DevInfoTone {
  if (events.some((event) => eventTone(event) === "fail")) {
    return "fail";
  }
  if (events.some((event) => eventTone(event) === "ok")) {
    return "ok";
  }
  return "idle";
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return String(ts);
  }
}

function summarize(event: DevInfoEvent): { title: string; body?: string } {
  switch (event.kind) {
    case "log":
      return {
        title: `${event.level ?? "info"} · ${event.message}`,
        body: event.detail
      };
    case "step":
      return {
        title: `${event.status} · ${event.title}`,
        body: event.detail
      };
    case "tool_call": {
      const duration =
        typeof event.durationMs === "number" ? ` · ${event.durationMs}ms` : "";
      const bodyParts: string[] = [];
      if (event.error) {
        bodyParts.push(event.error);
      }
      if (event.args !== undefined) {
        try {
          bodyParts.push(`args: ${JSON.stringify(event.args)}`);
        } catch {
          bodyParts.push("args: [unserializable]");
        }
      }
      if (event.result !== undefined) {
        try {
          bodyParts.push(`result: ${JSON.stringify(event.result)}`);
        } catch {
          bodyParts.push("result: [unserializable]");
        }
      }
      return {
        title: `${event.status ?? "ok"} · ${event.name}${duration}`,
        body: bodyParts.length > 0 ? bodyParts.join("\n") : undefined
      };
    }
    case "status":
      return { title: `${event.label}: ${event.value}` };
    case "metric": {
      const unit = event.unit ? ` ${event.unit}` : "";
      const label = event.label ? ` · ${event.label}` : "";
      return { title: `${event.name}${label}: ${event.value}${unit}` };
    }
  }
}

function EventRow({ event }: { readonly event: DevInfoEvent }) {
  const summary = summarize(event);
  return (
    <li className={`dio__event ${toneClass(eventTone(event))}`}>
      <div className="dio__event-head">
        <span className="dio__event-kind">{event.kind}</span>
        <span className="dio__event-time">{formatTime(event.ts)}</span>
      </div>
      <p className="dio__event-title">{summary.title}</p>
      {event.source ? (
        <p className="dio__event-source">{event.source}</p>
      ) : null}
      {summary.body ? <pre className="dio__event-body">{summary.body}</pre> : null}
    </li>
  );
}

/** Local-only overlay. Mount when `enabled` is true from a trusted host signal. */
export function DevInfoOverlay({
  enabled = false,
  store = devInfo,
  mark = "DI",
  appName,
  className
}: DevInfoOverlayProps) {
  const menuId = useId();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastT: number;
    vx: number;
    vy: number;
    moved: boolean;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    edge: ResizeEdge;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [corner, setCorner] = useState<DevInfoOverlayCorner>("bottom-right");
  const [size, setSize] = useState<MenuSize>({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT
  });
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | DevInfoEvent["kind"]>("all");

  const snapshot = useDevInfo(store);
  const events = snapshot.events;
  const visibleEvents = useMemo(() => {
    if (filter === "all") {
      return events;
    }
    return events.filter((event) => event.kind === filter);
  }, [events, filter]);

  const tone = aggregateTone(events);
  const failCount = events.filter((event) => eventTone(event) === "fail").length;
  const resizeEdges = edgesForCorner(corner);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setCorner(readCorner());
    setExpanded(readExpanded());
    setSize(readSize());
    setReady(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !ready) {
      return;
    }
    const onResize = () => {
      setSize((prev) => {
        const next = clampSize(prev);
        if (next.width === prev.width && next.height === prev.height) {
          return prev;
        }
        writeSize(next);
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, ready]);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      writeExpanded(next);
      return next;
    });
  }, []);

  const growMenu = useCallback(() => {
    setSize((prev) => {
      const max = viewportMaxSize();
      const next = clampSize({
        width: Math.min(max.width, Math.round(prev.width * 1.28)),
        height: Math.min(max.height, Math.round(prev.height * 1.28))
      });
      writeSize(next);
      return next;
    });
  }, []);

  const shrinkMenu = useCallback(() => {
    setSize((prev) => {
      const next = clampSize({
        width: Math.max(MIN_WIDTH, Math.round(prev.width / 1.28)),
        height: Math.max(MIN_HEIGHT, Math.round(prev.height / 1.28))
      });
      writeSize(next);
      return next;
    });
  }, []);

  const fitMenu = useCallback(() => {
    const next = clampSize({
      width: Math.min(viewportMaxSize().width, Math.floor(window.innerWidth * 0.56)),
      height: Math.min(viewportMaxSize().height, Math.floor(window.innerHeight * 0.78))
    });
    writeSize(next);
    setSize(next);
  }, []);

  const onCopy = useCallback(async () => {
    const markdown = formatDevInfoMarkdown(store.getSnapshot(), { appName });
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore clipboard failures
    }
  }, [appName, store]);

  const onBadgePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        lastT: Date.now(),
        vx: 0,
        vy: 0,
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const onBadgePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      const now = Date.now();
      const dt = Math.max(1, now - drag.lastT);
      drag.vx = ((event.clientX - drag.lastX) / dt) * 1000;
      drag.vy = ((event.clientY - drag.lastY) / dt) * 1000;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.lastT = now;
      if (
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6
      ) {
        drag.moved = true;
      }
    },
    []
  );

  const onBadgePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      if (drag.moved) {
        const projectedX = event.clientX + project(drag.vx);
        const projectedY = event.clientY + project(drag.vy);
        const next = nearestCorner(projectedX, projectedY);
        setCorner(next);
        writeCorner(next);
        return;
      }
      toggleExpanded();
    },
    [toggleExpanded]
  );

  const onBadgeClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      // Keyboard activation fires click without pointer capture; pointer path
      // already toggles on pointerup for mouse/touch.
      if (dragRef.current) {
        return;
      }
      if (event.detail === 0) {
        toggleExpanded();
      }
    },
    [toggleExpanded]
  );

  const onResizePointerDown = useCallback(
    (edge: ResizeEdge) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      resizeRef.current = {
        pointerId: event.pointerId,
        edge,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: size.width,
        startHeight: size.height
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [size.height, size.width]
  );

  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) {
        return;
      }
      const dx = event.clientX - resize.startX;
      const dy = event.clientY - resize.startY;
      let width = resize.startWidth;
      let height = resize.startHeight;

      if (resize.edge.includes("e")) {
        width = resize.startWidth + dx;
      }
      if (resize.edge.includes("w")) {
        width = resize.startWidth - dx;
      }
      if (resize.edge.includes("s")) {
        height = resize.startHeight + dy;
      }
      if (resize.edge.includes("n")) {
        height = resize.startHeight - dy;
      }

      setSize(clampSize({ width, height }));
    },
    []
  );

  const onResizePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) {
        return;
      }
      resizeRef.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      setSize((prev) => {
        const next = clampSize(prev);
        writeSize(next);
        return next;
      });
    },
    []
  );

  if (!enabled || !ready) {
    return null;
  }

  const ariaLabel = expanded
    ? "Close dev info overlay"
    : failCount > 0
      ? `Open dev info overlay, ${failCount} issue${failCount === 1 ? "" : "s"}`
      : "Open dev info overlay";

  const menuStyle = {
    width: `${size.width}px`,
    height: `${size.height}px`,
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "calc(100dvh - 24px)"
  } satisfies CSSProperties;

  const rootClass = [
    "dio",
    `dio--${corner}`,
    toneClass(tone),
    expanded ? "dio--expanded" : "dio--collapsed",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <button
        type="button"
        className="dio__badge"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={menuId}
        aria-label={ariaLabel}
        data-dev-info-overlay-button="true"
        onPointerDown={onBadgePointerDown}
        onPointerMove={onBadgePointerMove}
        onPointerUp={onBadgePointerUp}
        onPointerCancel={onBadgePointerUp}
        onClick={onBadgeClick}
      >
        <span className="dio__mark" aria-hidden>
          {mark}
        </span>
        {failCount > 0 ? (
          <span className="dio__issues" aria-hidden>
            {failCount}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div
          id={menuId}
          className="dio__menu"
          role="dialog"
          aria-label="Dev info overlay"
          style={menuStyle}
        >
          {resizeEdges.map((edge) => (
            <button
              key={edge}
              type="button"
              className={`dio__resize dio__resize--${edge}`}
              aria-label={`Resize ${edge}`}
              style={{ cursor: cursorForEdge(edge) }}
              onPointerDown={onResizePointerDown(edge)}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              onPointerCancel={onResizePointerUp}
              onDoubleClick={() => {
                if (edge.includes("n") || edge.includes("s")) {
                  growMenu();
                } else {
                  fitMenu();
                }
              }}
            />
          ))}

          <div className="dio__menu-head">
            <div>
              <p className="dio__menu-kicker">Dev info · local</p>
              <p className="dio__menu-count">{events.length} events</p>
            </div>
            <div className="dio__menu-actions">
              <button
                type="button"
                className="dio__icon-btn"
                aria-label="Copy markdown"
                onClick={() => {
                  void onCopy();
                }}
              >
                {copied ? "✓" : "⎘"}
              </button>
              <button
                type="button"
                className="dio__icon-btn"
                aria-label="Clear events"
                onClick={() => store.clear()}
              >
                ⌫
              </button>
              <button
                type="button"
                className="dio__icon-btn"
                aria-label="Shrink panel"
                onClick={shrinkMenu}
              >
                −
              </button>
              <button
                type="button"
                className="dio__icon-btn"
                aria-label="Grow panel"
                onClick={growMenu}
              >
                +
              </button>
              <button
                type="button"
                className="dio__icon-btn"
                aria-label="Fit panel to viewport"
                onClick={fitMenu}
              >
                ⤢
              </button>
              <button
                type="button"
                className="dio__close"
                aria-label="Close"
                onClick={() => {
                  setExpanded(false);
                  writeExpanded(false);
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div className="dio__filters" role="tablist" aria-label="Filter events">
            {(
              [
                "all",
                "log",
                "step",
                "tool_call",
                "status",
                "metric"
              ] as const
            ).map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={filter === kind}
                className={`dio__filter${filter === kind ? " dio__filter--active" : ""}`}
                onClick={() => setFilter(kind)}
              >
                {kind === "tool_call" ? "tools" : kind}
              </button>
            ))}
          </div>

          <div className="dio__menu-body">
            {visibleEvents.length === 0 ? (
              <p className="dio__empty">
                No events yet. Push with <code>devInfo.log(...)</code> or the agent
                skill.
              </p>
            ) : (
              <ul className="dio__events">
                {[...visibleEvents].reverse().map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            )}
          </div>

          <p className="dio__hint">
            Drag edges to resize · badge snaps to corners · copy for your notes
          </p>
        </div>
      ) : null}
    </div>
  );
}
