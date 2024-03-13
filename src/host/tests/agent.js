/// <reference path="../../data/types.js" />

import test from 'ava';

import { iterateEmitter } from '../../shared/iterate-emitter.js';
import { startJob } from '../../shared/job.js';
import { AgentMessage } from '../../agent/messages.js';

import { AgentController } from '../agent.js';
import { createHostLogger, HostMessage } from '../messages.js';

test('new AgentController(options)', async t => {
  t.timeout(60000);
  const TEST_DEFINITIONS = [];
  for (const tests of createTests()) {
    for (const protocol of /**@type {('fork'|'developer')[]}*/ ([undefined, 'fork', 'developer'])) {
      for (const config of [
        {},
        { debug: true },
        { verbose: [AgentMessage.START] },
        {
          referenceBaseUrl: {
            protocol: 'http:',
            hostname: 'localhost',
            port: 1234,
            pathname: '/path',
            toString() {
              return `${this.protocol}//${this.hostname}:${this.port}${this.pathname}`;
            },
          },
        },
      ]) {
        TEST_DEFINITIONS.push({
          tests,
          options: { protocol, config },
        });
      }
    }
  }

  t.log(`${TEST_DEFINITIONS.length} definitions`);
  t.is(TEST_DEFINITIONS.length, 36);

  for (const testDefinition of TEST_DEFINITIONS) {
    const { log, emitter } = createHostLogger();
    const logJob = startJob(async ({ cancelable }) => {
      const logs = [];
      for await (const log of cancelable(iterateEmitter(emitter, 'message', 'exit', 'error'))) {
        logs.push(omitDates(log));
      }
      return logs;
    });

    const controller = new AgentController({
      log,
      ...(testDefinition.options.protocol && {
        protocol: testDefinition.options.protocol,
      }),
      config: {
        ...testDefinition.options.config,
        mock: true,
        mockOpenPage: 'skip',
      },
    });

    const agentLogJob = startJob(async ({ cancelable }) => {
      for await (const message of cancelable(controller.logs())) {
        log(HostMessage.AGENT_LOG, message);
      }
    });

    await controller.start();

    for (const test of testDefinition.tests) {
      t.snapshot(
        await controller.run(test),
        `${snapshotPrefix(testDefinition)}: controller.run(${test.info.title})`
      );
    }

    await controller.stop();
    await agentLogJob.cancel();
    const fullLog = await logJob.cancel();
    t.snapshot(fullLog, `${snapshotPrefix(testDefinition)}: log`);
  }
});

/**
 * @returns {AriaATCIData.CollectedTest[][]}
 */
function createTests() {
  return [
    [],
    [
      {
        info: { testId: 1, title: 'test 1', task: 'test', references: [] },
        target: {
          at: { key: 'at', name: 'At', raw: 'AT' },
          mode: 'reading',
          referencePage: 'reference/index.html',
        },
        instructions: { raw: '', user: [] },
        commands: [
          {
            id: 'UP_ARROW',
            keystroke: 'up arrow',
            keypresses: [{ id: 'UP_ARROW', keystroke: 'up arrow' }],
          },
        ],
        assertions: [{ expectation: 'role up', priority: 1 }],
      },
    ],
    [
      {
        info: { testId: 1, title: 'test 1', task: 'test', references: [] },
        target: {
          at: { key: 'at', name: 'At', raw: 'AT' },
          mode: 'reading',
          referencePage: 'reference/index.html',
        },
        instructions: { raw: '', user: [] },
        commands: [
          {
            id: 'UP_ARROW',
            keystroke: 'up arrow',
            keypresses: [{ id: 'UP_ARROW', keystroke: 'up arrow' }],
          },
        ],
        assertions: [{ expectation: 'role up', priority: 1 }],
      },
      {
        info: { testId: 2, title: 'test 2', task: 'interaction', references: [] },
        target: {
          at: { key: 'at', name: 'At', raw: 'AT' },
          mode: 'interaction',
          referencePage: 'reference/index.html',
        },
        instructions: { raw: '', user: [] },
        commands: [
          {
            id: 'UP_ARROW,DOWN_ARROW',
            keystroke: 'up arrow, then down arrow',
            keypresses: [
              { id: 'UP_ARROW', keystroke: 'up arrow' },
              { id: 'DOWN_ARROW', keystroke: 'down arrow' },
            ],
          },
        ],
        assertions: [{ expectation: 'role down', priority: 1 }],
      },
    ],
  ];
}

function snapshotPrefix({ tests, options }) {
  return JSON.stringify({ tests: tests.map(test => test.info.testId), options });
}

function omitDates(obj) {
  if (Array.isArray(obj)) {
    return obj.map(omitDates);
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj)
        .map(([key, value]) => (key === 'date' ? null : [key, omitDates(value)]))
        .filter(Boolean)
    );
  }
  return obj;
}
