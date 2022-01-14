import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import test from 'ava';
import { HostMessage } from '../messages.js';

const VERBOSE = [
  '--verbose',
  [
    HostMessage.START,
    HostMessage.UNCAUGHT_ERROR,
    HostMessage.WILL_STOP,
    HostMessage.SERVER_LISTENING,
    HostMessage.ADD_SERVER_DIRECTORY,
    HostMessage.REMOVE_SERVER_DIRECTORY,
    HostMessage.PLAN_READ,
  ].join(','),
];

test('plan1', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan1',
      '"**"',
      '--agent-mock',
      '--agent-mock-open-page=skip',
      ...VERBOSE,
      // '--verbose',
      // '"start,willStop,startAgent,startServer,stopServer,planRead,stopAgent,startTest"',
    ])
  );
});

test('plan2', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan2',
      '"**"',
      '--agent-mock',
      '--agent-mock-open-page',
      'skip',
      ...VERBOSE,
    ])
  );
});

test('plan3', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan3',
      '"**"',
      '--agent-mock',
      '--agent-mock-open-page',
      'skip',
      ...VERBOSE,
    ])
  );
});

const ISO_DATE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g;
const DETERMINISTIC_DATE = '2000-01-01T12:00:00.000Z';
const URL_PORT_PATHNAME = /(https?:\/\/[^:]+:)(\d+)(\/\w+)?/g;
const DETERMINISTIC_PORT_PATHNAME = (...match) => `${match[1]}8888${match[3] ? '/static' : ''}`;
async function spawnRunPlan(args) {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const hostBin = path.join(dirname, '../../../bin/host.js');

  const { stdout, stderr } = await new Promise((resolve, reject) =>
    exec(
      ['node', hostBin, 'run-plan', ...args].join(' '),
      { cwd: dirname, shell: false },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      }
    )
  );

  return {
    stdout: stdout
      .toString()
      .replace(ISO_DATE, DETERMINISTIC_DATE)
      .replace(URL_PORT_PATHNAME, DETERMINISTIC_PORT_PATHNAME),
    stderr: stderr
      .toString()
      .replace(ISO_DATE, DETERMINISTIC_DATE)
      .replace(URL_PORT_PATHNAME, DETERMINISTIC_PORT_PATHNAME),
  };
}
