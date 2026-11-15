import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduler } from '../src/scheduler.js';

test('scans once after a pause, not per change', async () => {
  let runs = 0;
  const s = createScheduler(async () => { runs++; }, { delay: 20 });
  s.changed(); s.changed(); s.changed();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(runs, 1);
  s.cancel();
});

test('a change during a scan schedules one more scan after it', async () => {
  let runs = 0;
  let release;
  const s = createScheduler(async () => { runs++; if (runs === 1) await new Promise((r) => { release = r; }); }, { delay: 10 });
  const first = s.now();
  s.changed();
  await new Promise((r) => setTimeout(r, 30));
  s.changed();
  release();
  await first;
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(runs, 2);
  s.cancel();
});
