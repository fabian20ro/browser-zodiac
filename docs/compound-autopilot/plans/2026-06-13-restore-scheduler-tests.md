# Plan: Restore Scheduler Tests

**Goal**: Restore unit tests for `src/engine/scheduler.ts` that were removed.

**Current behavior**: `src/engine/scheduler.test.ts` no longer contains tests for `msUntilNextMidnightGmt` and `scheduleMidnightGmt`.

**Expected behavior**: Regression-free execution of scheduler logic with full test coverage for corner cases (midnight, month/year boundaries).

## Implementation Units

### Tier 0: Restore `msUntilNextMidnightGmt` tests
- **Description**: Re-add tests for `msUntilNextMidnightGmt` covering:
  - Exact midnight.
  - Noon.
  - Month/year boundaries.
- **Verification**: `npm test` (specifically the scheduler tests).

### Tier 0: Restore `scheduleMidnightGmt` tests
- **Description**: Re-add tests for `scheduleMidnightGmt` using `vi.useFakeTimers()`.
- **Verification**: `npm test`.

**Risks**:
- Changes to the scheduler implementation might break the tests (but we are restoring existing tests, so we expect them to pass).
- Environmental issues with `vitest` and fake timers.

**Contract Surfaces**:
- `msUntilNextMidnightGmt(Date): number`
- `scheduleMidnightGmt(callback: () => void): () => void`
