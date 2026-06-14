/** Returns the number of milliseconds from `now` until the next GMT midnight. */
export function msUntilNextMidnightGmt(now: Date): number {
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/** Returns the UTC date string "YYYY-MM-DD" for the given Date. */
export function toGmtDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Schedules `callback` to fire at each GMT midnight.
 * Returns a cancel function.
 */
export function scheduleMidnightGmt(callback: () => void): () => void {
  let handle: ReturnType<typeof setTimeout>;
  let cancelled = false;

  function scheduleNext(): void {
    if (cancelled) return;
    const delay = Math.max(msUntilNextMidnightGmt(new Date()), 1);
    handle = setTimeout(() => {
      try {
        callback();
      } catch (e) {
        console.error("Error in scheduler callback:", e);
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  return () => {
    cancelled = true;
    clearTimeout(handle);
  };
}
