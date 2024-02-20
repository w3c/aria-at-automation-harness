import { EventEmitter } from 'events';

import test from 'ava';

import { iterateEmitter } from '../iterate-emitter.js';

const timeout = timeoutTestMiddleware();
test.beforeEach(async () => {
  await timeout.setup();
});
test.afterEach(async () => {
  await timeout.teardown();
});

test('iterate values emitted by an EventEmitter', async t => {
  const emitter = new EventEmitter();
  timeout.thread(async ({ timeout }) => {
    for (let i = 0; i < 100; i++) {
      emitter.emit('next', i);
      await timeout();
    }
  });
  t.deepEqual(await take(10, iterateEmitter(emitter, 'next')), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('stops iterating values emitted by an EventEmitter when it emits a completion event', async t => {
  const emitter = new EventEmitter();
  timeout.thread(async ({ timeout }) => {
    for (let i = 0; i < 5; i++) {
      emitter.emit('next', i);
      await timeout();
    }
    emitter.emit('complete');
    for (let i = 5; i < 100; i++) {
      emitter.emit('next', i);
      await timeout();
    }
  });
  t.deepEqual(await take(10, iterateEmitter(emitter, 'next', 'complete')), [0, 1, 2, 3, 4]);
});

test('throws an error when an EventEmitter emits an error event', async t => {
  const emitter = new EventEmitter();
  timeout.thread(async ({ timeout }) => {
    for (let i = 0; i < 5; i++) {
      emitter.emit('next', i);
      await timeout();
    }
    emitter.emit('error', new Error('error'));
    for (let i = 0; i < 5; i++) {
      emitter.emit('next', i);
      await timeout();
    }
  });
  await t.throwsAsync(
    async () => await take(10, iterateEmitter(emitter, 'next', 'complete', 'error'))
  );
});

test('iterate queued values emitted by an EventEmitter after it emits a completion event', async t => {
  const emitter = new EventEmitter();
  timeout.thread(async () => {
    for (let i = 0; i < 5; i++) {
      emitter.emit('next', i);
    }
    emitter.emit('complete');
    for (let i = 5; i < 100; i++) {
      emitter.emit('next', i);
    }
  });
  t.deepEqual(await take(10, iterateEmitter(emitter, 'next', 'complete')), [0, 1, 2, 3, 4]);
});

test('iterate queued values emitted by an EventEmitter after it emits an error event', async t => {
  const emitter = new EventEmitter();
  timeout.thread(async () => {
    for (let i = 0; i < 5; i++) {
      emitter.emit('next', i);
    }
    emitter.emit('error', new Error('error'));
    for (let i = 5; i < 100; i++) {
      emitter.emit('next', i);
    }
  });
  const first5 = take(5, iterateEmitter(emitter, 'next', 'complete', 'error'));
  const first6 = take(6, iterateEmitter(emitter, 'next', 'complete', 'error'));
  t.deepEqual(await first5, [0, 1, 2, 3, 4]);
  await t.throwsAsync(async () => await first6);
});

async function take(n, asyncIterator) {
  const values = [];
  for await (const item of asyncIterator) {
    values.push(item);
    if (--n <= 0) {
      break;
    }
  }
  return values;
}

function timeoutTestMiddleware() {
  class TeardownError extends Error {}

  let teardownSignal;
  let teardown;
  let thread;

  return {
    async thread(fn) {
      thread(fn);
    },

    async setup() {
      teardownSignal = new Promise((_, reject) => {
        teardown = () => reject(new TeardownError());
      });

      const timeout = () => Promise.race([Promise.resolve(), teardownSignal]);

      thread = async fn => {
        try {
          await Promise.resolve();
          await fn({ timeout });
        } catch (error) {
          if (error instanceof TeardownError) {
            return;
          }
          throw error;
        }
      };
    },

    async teardown() {
      teardown();
      await teardownSignal.catch(() => {});
    },
  };
}
