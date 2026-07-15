/** Returns the number of milliseconds from `now` until the next GMT midnight. */
export function msUntilNextMidnightGmt(now: Date): number {
  const midnight = getNextMidnightGmt(now);
  return midnight.getTime() - now.getTime();
}

/** Returns the next GMT midnight as a new Date object. */
export function getNextMidnightGmt(now: Date = new Date()): Date {
  const midnight = new Date(now.getTime());
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);
  return midnight;
}

/** Returns the UTC date string "YYYY-MM-DD" for the given Date. */
export function toGmtDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A singleton to manage the scheduler loop.
 */
let activeHandle: ReturnType<typeof setTimeout> | undefined;
let activeLoopId = 0;
let isLoopRunning = false;

/**
 * Schedules `callback` to fire at each GMT midnight.
 * Returns a cancel function.
 * If called while a scheduler is already running, the previous one is cancelled.
 * The existing callback will complete, but its next scheduled iteration will be ignored if a new loop has started.
 */
export function scheduleMidnightGmt(callback: () => void): () => void {
  if (activeHandle) {
    clearTimeout(activeHandle);
  }
  const loopId = ++activeLoopId;
  let iteration = 0;
  let wasStartedDuringLoop = isLoopRunning;

  function scheduleNext(): void {
    const delay = Math.max(msUntilNextMidnightGmt(new Date()), 1);
    activeHandle = setTimeout(async () => {
      if (loopId !== activeLoopId) return;

      iteration++;
      if (iteration === 1 && wasStartedDuringLoop) {
        scheduleNext();
        return;
      }

      isLoopRunning = true;
      try {
        await callback();
      } catch (e) {
        console.error("Error in scheduler callback:", e);
      }
      isLoopRunning = false;
      if (loopId === activeLoopId) {
        scheduleNext();
      }
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
