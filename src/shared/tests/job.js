import test from 'ava';

import { startJob } from '../job.js';

test('startJob', async t => {
  t.plan(4);

  async function* step() {
    for (let i = 0; i < 100; i++) {
      await Promise.resolve();
      yield i;
    }
  }

  {
    const job = startJob(async () => {
      await Promise.resolve();
      return 'complete';
    });
    t.is(await job.cancel(), 'complete', 'cancel resolves to returned value');
  }
  {
    const job = startJob(async () => {
      await Promise.resolve();
      throw new Error();
    });
    t.throwsAsync(job.cancel, undefined, 'cancel rejects if the job errored');
  }
  {
    const job = startJob(async ({ cancelable }) => {
      let i = -1;
      for await (i of cancelable(step())) {
      }
      return i;
    });
    // This loop is more efficient because it is one promise instead of the a
    // series of promises that mechanically must occur with cancelable.
    for (let i = 0; i < 15; i++) {
      await Promise.resolve();
    }
    t.is(await job.cancel(), 2, 'cancel stops any cancelable wrapped async iterator');
  }
  {
    const job = startJob(async ({ cancelable }) => {
      let i = -1;
      for await (i of cancelable(step())) {
      }
      let j = -1;
      for await (j of cancelable(step())) {
      }
      return [i, j];
    });
    for (let i = 0; i < 15; i++) {
      await Promise.resolve();
    }
    t.deepEqual(
      await job.cancel(),
      [2, -1],
      'cancel stops future cancelable wrapped async iterators to not run'
    );
  }
});
