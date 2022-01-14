import test from 'ava';

import { HostMessage, createHostLogger } from '../messages.js';

test('log', async t => {
  t.plan(16);
  const { log, emitter } = createHostLogger();
  const logAndResolveMessage = async (...args) => {
    const {
      text,
      data: { date, ...otherData },
    } = await new Promise(resolve => {
      emitter.once('message', resolve);
      log(...args);
    });
    // Remove non-determinstic date from the log data.
    return { text, data: otherData };
  };
  t.snapshot(await logAndResolveMessage(HostMessage.START));
  t.snapshot(
    await logAndResolveMessage(HostMessage.UNCAUGHT_ERROR, { error: new Error('Broken') })
  );
  t.snapshot(await logAndResolveMessage(HostMessage.WILL_STOP));
  t.snapshot(
    await logAndResolveMessage(HostMessage.PLAN_READ, {
      name: 'test',
      source: 'unknown',
      tests: [],
      files: [],
    })
  );
  t.snapshot(await logAndResolveMessage(HostMessage.START_SERVER));
  t.snapshot(
    await logAndResolveMessage(HostMessage.SERVER_LISTENING, {
      url: {
        toString() {
          return 'http://localhost:1234/path';
        },
      },
    })
  );
  t.snapshot(await logAndResolveMessage(HostMessage.STOP_SERVER));
  t.snapshot(
    await logAndResolveMessage(HostMessage.ADD_SERVER_DIRECTORY, {
      url: {
        toString() {
          return 'http://localhost:1234/folder';
        },
      },
    })
  );
  t.snapshot(
    await logAndResolveMessage(HostMessage.REMOVE_SERVER_DIRECTORY, {
      url: {
        toString() {
          return 'http://localhost:1234/folder';
        },
      },
    })
  );
  t.snapshot(
    await logAndResolveMessage(HostMessage.SERVER_LOG, { text: `Served file 'test.json'.` })
  );
  t.snapshot(await logAndResolveMessage(HostMessage.START_AGENT));
  t.snapshot(await logAndResolveMessage(HostMessage.AGENT_PROTOCOL, { protocol: 'fork' }));
  t.snapshot(await logAndResolveMessage(HostMessage.STOP_AGENT));
  t.snapshot(await logAndResolveMessage(HostMessage.AGENT_LOG, { text: 'Starting test.' }));
  t.snapshot(await logAndResolveMessage(HostMessage.AGENT_CRASHED));
  t.snapshot(await logAndResolveMessage(HostMessage.START_TEST));
});
