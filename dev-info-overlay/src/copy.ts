import type { DevInfoEvent, DevInfoSnapshot } from "./types.ts";

function formatJson(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatEvent(event: DevInfoEvent): string {
  const when = new Date(event.ts).toISOString();
  const source = event.source ? ` · ${event.source}` : "";

  switch (event.kind) {
    case "log": {
      const level = event.level ?? "info";
      const detail = event.detail ? `\n\n\`\`\`\n${event.detail}\n\`\`\`` : "";
      return `### log · ${level}${source}\n\n- **time:** ${when}\n- **message:** ${event.message}${detail}`;
    }
    case "step": {
      const detail = event.detail ? `\n- **detail:** ${event.detail}` : "";
      return `### step · ${event.status}${source}\n\n- **time:** ${when}\n- **id:** \`${event.stepId}\`\n- **title:** ${event.title}${detail}`;
    }
    case "tool_call": {
      const status = event.status ?? "ok";
      const duration =
        typeof event.durationMs === "number"
          ? `\n- **duration:** ${event.durationMs}ms`
          : "";
      const error = event.error ? `\n- **error:** ${event.error}` : "";
      const args = formatJson(event.args);
      const result = formatJson(event.result);
      const argsBlock = args ? `\n\n**args**\n\n\`\`\`json\n${args}\n\`\`\`` : "";
      const resultBlock = result
        ? `\n\n**result**\n\n\`\`\`json\n${result}\n\`\`\``
        : "";
      return `### tool_call · ${event.name} · ${status}${source}\n\n- **time:** ${when}${duration}${error}${argsBlock}${resultBlock}`;
    }
    case "status": {
      const tone = event.tone ? ` · ${event.tone}` : "";
      return `### status${tone}${source}\n\n- **time:** ${when}\n- **${event.label}:** ${event.value}`;
    }
    case "metric": {
      const unit = event.unit ? ` ${event.unit}` : "";
      const label = event.label ? ` (${event.label})` : "";
      return `### metric · ${event.name}${label}${source}\n\n- **time:** ${when}\n- **value:** ${event.value}${unit}`;
    }
  }
}

export function formatDevInfoMarkdown(
  snapshot: DevInfoSnapshot,
  options: { readonly appName?: string } = {}
): string {
  const title = options.appName
    ? `# Dev info · ${options.appName}`
    : "# Dev info overlay";
  if (snapshot.events.length === 0) {
    return `${title}\n\n_No events yet._\n`;
  }
  const body = snapshot.events.map(formatEvent).join("\n\n");
  return `${title}\n\n${body}\n`;
}
