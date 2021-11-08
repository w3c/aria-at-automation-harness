/// <reference path="./types.js" />

/**
 * @module agent
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { MockTestRunner } from './mock-test-runner.js';
import { main } from './main.js';
import { forkMiddleware } from './cli-protocol-fork.js';
import { shellMiddleware } from './cli-protocol-shell.js';

export async function createParser({ signals, send, stdin, stdout, stderr }) {
  return (await yargs())
    .middleware(argv => {
      argv.signals = signals;
      argv.send = send;
      argv.stdin = stdin;
      argv.stdout = stdout;
      argv.stderr = stderr;
    })
    .command(
      '$0',
      'Run tests from input',
      {
        protocol: {
          choices: ['fork', 'shell'],
          description: 'Read tests from shell input or from parent nodejs process messages',
          default: 'shell',
          type: 'string',
        },
      },
      main,
      [protocolMiddleware, runnerMiddleware]
    );
}

/**
 * Build and assign a test runner based on passed arguments.
 * @param {object} argv
 * @param {AriaATCIAgent.TestRunner} argv.runner
 */
function runnerMiddleware(argv) {
  argv.runner = new MockTestRunner();
}

/**
 * Build and assign main loop arguments based on passed protocol and other arguments.
 * @param {object} argv
 * @param {string} argv.protocol
 * @param {function(*): void} argv.send
 * @param {EventEmitter} argv.signals
 * @param {ReadableStream} argv.stdin
 * @param {WritableStream} argv.stdout
 * @param {WritableStream} argv.stderr
 * @param {AriaATCIAgent.Log} argv.log
 * @param {AriaATCIAgent.TestIterable} argv.tests
 * @param {AriaATCIAgent.ReportResult} argv.reportResult
 */
function protocolMiddleware(argv) {
  switch (argv.protocol) {
    case 'shell':
      shellMiddleware(argv);
      break;
    case 'fork':
      if (typeof argv.send !== 'function') {
        throw new Error(
          `'fork' protocol may only be used when launched by a nodejs child_process.fork call.`
        );
      }
      forkMiddleware(argv);
      break;
    default:
      throw new Error(
        `Unknown protocol. Options are 'fork' or 'shell'. Received: ${argv.protocol}`
      );
  }
}

export async function parse({ argv = [], ...parserConfiguration } = {}) {
  return (await createParser(parserConfiguration)).parse(hideBin(argv));
}
