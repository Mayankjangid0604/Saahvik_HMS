import { useEffect, useState } from "react";

/** "10:42 AM" — no seconds (single-timezone product, so no tz shown). */
function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Wall clock in the TopBar. Updates once per MINUTE, not per second: the
 * display has minute granularity, so a per-second interval would force a
 * re-render of every page every second for no visible change. The first tick
 * is aligned to the next minute boundary so the digit flips on time.
 * Hidden below md — the TopBar is already dense with the bell + avatar at sm.
 */
export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <span
      className="hidden font-mono text-xs tabular-nums text-muted md:inline"
      aria-label="Current time"
    >
      {formatClock(now)}
    </span>
  );
}
