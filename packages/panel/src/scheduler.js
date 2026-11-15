// Runs a scan after the author pauses, never per keystroke (Phase 0: about
// 100 ms for a typical post on a slow computer is fine after a pause, too
// much while typing). One scan at a time; a change during a scan schedules
// one more after it.

/**
 * `run` is an async function doing one scan. `delay` is the pause, in ms, or
 * a function returning it (a longer pause while nobody is looking).
 * Returns { changed(), now(), cancel() }.
 */
export function createScheduler(
  run,
  { delay = 1000, setTimer = setTimeout, clearTimer = clearTimeout } = {}
) {
  let timer = null;
  let running = false;
  let again = false;
  let cancelled = false;
  const wait = () => (typeof delay === 'function' ? delay() : delay);

  async function fire() {
    timer = null;
    if (cancelled) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await run();
    } finally {
      running = false;
      if (again && !cancelled) {
        again = false;
        // A change after the one that set `again` may have armed a timer
        // already: one scan follows, not two.
        if (timer) clearTimer(timer);
        timer = setTimer(fire, wait());
      }
    }
  }

  return {
    /** The content changed: scan after the next pause. */
    changed() {
      if (cancelled) return;
      if (timer) clearTimer(timer);
      timer = setTimer(fire, wait());
    },
    /** Scan now (the panel was opened). */
    now() {
      if (cancelled) return Promise.resolve();
      if (timer) clearTimer(timer);
      return fire();
    },
    cancel() {
      cancelled = true;
      if (timer) clearTimer(timer);
      timer = null;
    }
  };
}
