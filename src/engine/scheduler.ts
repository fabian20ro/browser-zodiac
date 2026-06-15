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
 * A singleton to manage the scheduler loop.
 */
let activeHandle: ReturnType<typeof setTimeout> | undefined;

/**
 * Schedules `callback` to fire at each GMT midnight.
 * Returns a cancel function.
 * If called while a scheduler is already running, the previous one is cancelled.
 */
export function scheduleMidnightGmt(callback: () => void): () => void {
  if (activeHandle) {
    clearTimeout(activeHandle);
  }

  function scheduleNext(): void {
    const delay = Math.max(msUntilNextMidnightGmt(new Date()), 1);
    activeHandle = setTimeout(() => {
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
    if (activeHandle) {
      clearTimeout(activeHandle);
      activeHandle = undefined;
    }
  };
}
