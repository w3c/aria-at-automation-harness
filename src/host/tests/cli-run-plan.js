import { exec } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

import test from 'ava';

test('plan1', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan1',
      '"**"',
      '--runner-mock',
      '--debug',
    ])
  );
});

test('plan2', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan2',
      '"**"',
      '--runner-mock',
      '--debug',
    ])
  );
});

test('plan3', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan3',
      '"**"',
      '--runner-mock',
      '--debug',
    ])
  );
});

test('plan3 with callback no url param', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan3',
      '"**"',
      '--runner-mock',
      '--debug',
      '--callback-url=http://callback.url/',
      '--callback-header=test:header:multiple:colon',
    ])
  );
});

test('plan3 with callback', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan3',
      '"**"',
      '--runner-mock',
      '--debug',
      '--callback-url=http://callback.url/:testRowNumber',
      '--callback-header=test:header:multiple:colon',
    ])
  );
});

test('plan3 with callback request which fails', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan3',
      '"**"',
      '--runner-mock',
      '--debug',
      '--callback-url=http://example.com/?TEST-STATUS=418',
      '--callback-header=x:y',
    ])
  );
});

test('plan3 with callback request which fails with a faulty response body', async t => {
  t.snapshot(
    await spawnRunPlan([
      '--plan-workingdir=fixtures/host-bin/plan3',
      '"**"',
      '--runner-mock',
      '--debug',
      '--callback-url="http://example.com/?TEST-STATUS=418&TEST-BAD-BODY"',
      '--callback-header=x:y',
    ])
  );
});

async function spawnRunPlan(args) {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const hostBin = path.join(dirname, '../../../bin/host.js');

  const { stdout, stderr } = await new Promise((resolve, reject) =>
    exec(
      ['node', hostBin, 'run-plan', ...args].join(' '),
      { cwd: dirname },
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
    stdout: replaceNonDeterministicOutput(stdout.toString()),
    stderr: replaceNonDeterministicOutput(stderr.toString()),
  };
}

const ISO_DATE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g;
const DETERMINISTIC_DATE = '2000-01-01T12:00:00.000Z';
const URL_PATHNAME_ONLY = /'\/[^/']+((?:\/[^/']*)*')/g;
const DETERMINISTIC_PATHNAME_PREFIX = (...match) => `'/static${match[1]}`;
const URL_PORT_PATHNAME = /(https?:\/\/[^:]+:)\d+(\/[^/\s]+)?/g;
const DETERMINISTIC_PORT_PATHNAME = (...match) => `${match[1]}8888${match[2] ? '/static' : ''}`;

function replaceNonDeterministicOutput(text) {
  return text
    .replace(ISO_DATE, DETERMINISTIC_DATE)
    .replace(URL_PATHNAME_ONLY, DETERMINISTIC_PATHNAME_PREFIX)
    .replace(URL_PORT_PATHNAME, DETERMINISTIC_PORT_PATHNAME);
}
