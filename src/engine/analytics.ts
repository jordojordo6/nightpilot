const ANALYTICS_KEY = "nightpilot_analytics";

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2, 10);
  }
  return sessionId;
}

export function logEvent(
  eventName: string,
  payload: Record<string, unknown> = {}
): void {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    const events: unknown[] = raw ? JSON.parse(raw) : [];
    events.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      ...payload,
    });
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
  } catch {
    // quota exceeded — silently drop
  }
}

export function clearAnalytics(): void {
  localStorage.removeItem(ANALYTICS_KEY);
}
