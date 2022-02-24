import test from 'ava';

import * as messages from '../messages.js';

const TestMessage = {
  /** @type {'test1'} */
  TEST1: 'test1',
  /** @type {'test2'} */
  TEST2: 'test2',
};

const MESSAGES = {
  [TestMessage.TEST1]: () => 'message',
  [TestMessage.TEST2]: ({ value }) => `message 2: ${value}`,
};

test('createSharedLogger', t => {
  const logger = messages.createSharedLogger(MESSAGES);
  t.is(typeof logger.log, 'function');
  t.is(typeof logger.emitter, 'object');
  t.is(typeof logger.emitter.on, 'function');
});

test('log', async t => {
  const start = Date.now();
  const { log, emitter } = messages.createSharedLogger(MESSAGES);
  emitter.on('message', ({ text, data: { date, ...otherData } }) => {
    // The date value is not deterministic. Check that it is older than the
    // start of the test and newer than now.
    t.true(date instanceof Date);
    t.true(date >= start);
    t.true(date <= Date.now());
    t.snapshot({ text, data: otherData });
  });
  log(TestMessage.TEST1);
  log(TestMessage.TEST2, { value: 18 });
});
