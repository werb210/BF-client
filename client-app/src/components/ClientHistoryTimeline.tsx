import { useMemo } from "react";
import { safeParseDate } from "@/utils/safeDate";
import { components, tokens } from "@/styles";
import type { ClientHistoryEvent } from "@/portal/clientHistory";

type ClientHistoryTimelineProps = {
  events: ClientHistoryEvent[];
};

function formatTimestamp(value: string) {
  const parsed = safeParseDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function ClientHistoryTimeline({ events }: ClientHistoryTimelineProps) {
  const ordered = useMemo(() => Object.freeze([...events]), [events]);

  return (
    <ul style={{ margin: 0, paddingLeft: tokens.spacing.lg }}>
      {ordered.map((event) => (
        <li key={event.id} style={{ marginBottom: tokens.spacing.sm }}>
          <div style={{ fontWeight: 600 }}>{event.title}</div>
          {event.detail && (
            <div style={components.form.helperText}>{event.detail}</div>
          )}
          <div style={components.form.helperText}>
            {formatTimestamp(event.occurredAt)}
          </div>
        </li>
      ))}
    </ul>
  );
}

