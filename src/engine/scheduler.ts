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
 * @param options.immediate — when true and not already mid-loop, fire `callback` immediately on first call (before waiting for midnight). Default false.
 */
export function scheduleMidnightGmt(callback: () => void, options?: { immediate?: boolean }): () => void {
  if (activeHandle) {
    clearTimeout(activeHandle);
  }
  const loopId = ++activeLoopId;
  let shouldSkipFirstTick = !options?.immediate && isLoopRunning;

  function scheduleNext(): void {
    const delay = Math.max(msUntilNextMidnightGmt(new Date()), 1);
    activeHandle = setTimeout(async () => {
      if (loopId !== activeLoopId) return;

      if (shouldSkipFirstTick) {
        shouldSkipFirstTick = false;
        scheduleNext();
        return;
      }

      isLoopRunning = true;
      try {
        await callback();
      } catch (e) {
        console.error("Error in scheduler callback:", e);
      } finally {
        isLoopRunning = false;
        if (loopId === activeLoopId) {
          scheduleNext();
        }
      }
    }, delay);
  }

  scheduleNext();
  return () => {
    if (activeHandle) {
      clearTimeout(activeHandle);
      activeHandle = undefined;
    }
    isLoopRunning = false;
  };
}
