/// <reference path="types.js" />

/**
 * @module agent
 */

import { Readable } from 'stream';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { iterateEmitter } from '../shared/iterate-emitter.js';
import { parseJSONChunks, separateJSONChunks } from '../shared/json-chunks.js';

import { createRunner } from './create-test-runner.js';
import { agentMain } from './main.js';
import { AgentMessage, createAgentLogger } from './messages.js';

/** @param {yargs} args */
export function buildAgentCliMockOptions(args = yargs) {
  return args.options({
    openPage: {
      choices: ['request', 'skip'],
      describe: 'Mock by http "request" or "skip" it',
      default: 'request',
    },
  });
}

/**
 * @param {AriaATCIAgent.MockOptions} options
 * @returns {string[]}
 */
export function agentCliMockArgsFromOptionsMap(options) {
  const args = [];
  for (const key of Object.keys(options)) {
    const value = options[key];
    switch (key) {
      case 'openPage':
        args.push(`--openPage=${value}`);
        break;
      default:
        throw new Error(`unknown agent cli mock argument ${key}`);
    }
  }
  return args;
}

/**
 * @param {AriaATCIAgent.MockOptions} options
 * @returns {AriaATCIAgent.MockOptions}
 */
export function pickAgentCliMockOptions({ openPage }) {
  return { ...(openPage ? { openPage } : null) };
}

/** @param {yargs} args */
export function buildAgentCliOptions(args = yargs) {
  return args.options({
    quiet: {
      conflicts: ['debug', 'verbose'],
      describe: 'Disable all logging',
    },
    debug: {
      conflicts: ['quiet', 'verbose'],
      describe: 'Enable all logging',
    },
    verbose: {
      coerce(arg) {
        if (!arg) {
          return;
        }
        const messageValues = Object.values(AgentMessage);
        const verbosity = arg.split(',');
        for (const name of verbosity) {
          if (!messageValues.includes(name)) {
            throw new Error(
              `--verbose must be a comma separated list including: ${Object.values(
                AgentMessage
              ).join(', ')}`
            );
          }
        }
        return verbosity;
      },
      conflicts: ['debug', 'quiet'],
      describe: 'Enable a subset of logging messages',
      nargs: 1,
    },
    ['reference-base-url']: {
      description: 'Url to append reference page listed in tests to',
      type: 'string',
      default: 'http://localhost:8000',
    },
    mock: {
      async coerce(arg) {
        if (!arg) {
          return;
        }
        const mockOptions = await buildAgentCliMockOptions(await yargs());
        const opt = pickAgentCliMockOptions(
          await mockOptions.parse(arg === true ? '' : arg.split(',').join(' '))
        );
        return opt;
      },
      hidden: true,
    },
    protocol: {
      choices: ['fork', 'shell'],
      description: 'Read tests from shell input or from parent nodejs process messages',
      default: 'shell',
      hidden: true,
      type: 'string',
    },
  });
}

/**
 * @param {AriaATCIAgent.CliOptions} options
 * @returns {string[]}
 */
export function agentCliArgsFromOptionsMap(options) {
  const args = [];
  for (const key of Object.keys(options)) {
    const value = options[key];
    switch (key) {
      case 'debug':
        if (value) {
          args.push('--debug');
        }
        break;
      case 'quiet':
        if (value) {
          args.push('--quiet');
        }
        break;
      case 'verbose':
        args.push('--verbose', value.join(','));
        break;
      case 'referenceBaseUrl':
        args.push('--reference-base-url', value.toString());
        break;
      case 'mock':
        if (value) {
          args.push(
            `--mock=${agentCliMockArgsFromOptionsMap(value === true ? {} : value).join(',')}`
          );
        }
        break;
      case 'protocol':
        args.push('--protocol', value);
        break;
      default:
        throw new Error(`unknown agent cli argument ${key}`);
    }
  }
  return args;
}

/**
 * @param {AriaATCIAgent.CliOptions} options
 * @returns {AriaATCIAgent.CliOptions}
 */
export function pickAgentCliOptions({ debug, quiet, verbose, referenceBaseUrl, mock, protocol }) {
  return {
    ...(debug === undefined ? null : { debug }),
    ...(quiet === undefined ? null : { quiet }),
    ...(verbose === undefined ? null : { verbose }),
    ...(referenceBaseUrl === undefined ? null : { referenceBaseUrl }),
    ...(mock === undefined ? null : { mock }),
    ...(protocol === undefined ? null : { protocol }),
  };
}

export async function createAgentCliParser({ signals, send, stdin, stdout, stderr }) {
  return /** @type {yargs} */ (await yargs())
    .middleware(argv => {
      argv.signals = signals;
      argv.send = send;
      argv.stdin = stdin;
      argv.stdout = stdout;
      argv.stderr = stderr;
    })
    .command('$0', 'Run tests from input', buildAgentCliOptions, agentMain, [
      agentVerboseMiddleware,
      agentProtocolMiddleware,
      agentRunnerMiddleware,
    ]);
}

/**
 * Build and assign a test runner based on passed arguments.
 * @param {object} argv
 * @param {AriaATCIAgent.Log} argv.log
 * @param {AriaATCIAgent.TestRunner} argv.runner
 * @param {AriaATCIAgent.MockOptions} [argv.mock]
 */
async function agentRunnerMiddleware(argv) {
  argv.runner = await createRunner({
    log: argv.log,
    baseUrl: new URL(argv['reference-base-url']),
    mock: argv.mock,
  });
}

async function agentVerboseMiddleware(argv) {
  if (argv.debug) {
    argv.verbosity = Object.values(AgentMessage);
  } else if (argv.quiet) {
    argv.verbosity = [];
  } else {
    argv.verbosity =
      argv.verbose && argv.verbose.length
        ? argv.verbose
        : [AgentMessage.START, AgentMessage.UNCAUGHT_ERROR, AgentMessage.WILL_STOP];
  }
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
function agentProtocolMiddleware(argv) {
  switch (argv.protocol) {
    case 'shell':
      agentShellMiddleware(argv);
      break;
    case 'fork':
      if (typeof argv.send !== 'function') {
        throw new Error(
          `'fork' protocol may only be used when launched by a nodejs child_process.fork call.`
        );
      }
      agentForkMiddleware(argv);
      break;
    default:
      throw new Error(
        `Unknown protocol. Options are 'fork' or 'shell'. Received: ${argv.protocol}`
      );
  }
}

export async function parseAgentCli({ argv = [], ...parserConfiguration } = {}) {
  return await (await createAgentCliParser(parserConfiguration)).parse(hideBin(argv));
}

export function agentForkMiddleware(argv) {
  agentForkLoggerMiddleware(argv);
  agentForkTestsMiddleware(argv);
  agentForkReportMiddleware(argv);
}

export function agentForkLoggerMiddleware(argv) {
  const logger = createAgentLogger();
  argv.log = logger.log;

  const { send, verbosity } = argv;
  logger.emitter.on('message', message => {
    if (verbosity.includes(message.data.type)) {
      send({
        type: 'log',
        data: message,
      });
    }
  });
}

export function agentForkTestsMiddleware(argv) {
  const { signals } = argv;
  argv.tests = (async function* () {
    for await (const message of iterateEmitter(signals, 'message')) {
      if (message.type === 'task') {
        yield message.data;
      }
    }
  })();
}

export function agentForkReportMiddleware(argv) {
  const { send } = argv;
  argv.reportResult = async function (result) {
    send({ type: 'result', data: result });
  };
}

export function agentShellMiddleware(argv) {
  agentShellLoggerMiddleware(argv);
  agentShellTestsMiddleware(argv);
  agentShellReportMiddleware(argv);
  agentShellInterruptMiddleware(argv);
}

export function agentShellLoggerMiddleware(argv) {
  const logger = createAgentLogger();
  argv.log = logger.log;

  const { stderr, verbosity } = argv;
  logger.emitter.on('message', ({ data: { type }, text }) => {
    if (verbosity.includes(type)) {
      stderr.write(`${text}\n`);
    }
  });
}

export function agentShellTestsMiddleware(argv) {
  const { stdin } = argv;
  argv.tests = parseJSONChunks(separateJSONChunks(iterateEmitter(stdin, 'data', 'end', 'error')));
}

export function agentShellReportMiddleware(argv) {
  const { stdout } = argv;
  argv.reportResult = async function (result) {
    await new Promise(resolve =>
      Readable.from(JSON.stringify(result) + '\n')
        .on('end', resolve)
        .pipe(stdout, { end: false })
    );
  };
}

export function agentShellInterruptMiddleware(argv) {
  const { signals, stdin } = argv;
  signals.once('SIGINT', () => stdin.emit('end'));
}
