/// <reference path="types.js" />

/**
 * @module agent
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { iterateEmitter } from '../shared/iterate-emitter.js';

import { createRunner } from './create-test-runner.js';
import { agentMain } from './main.js';
import { AgentMessage, createAgentLogger } from './messages.js';

/** @param {yargs} args */
export function buildAgentCliOptions(args = yargs) {
  return args
    .options({
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
                `--verbose must be a comma separated list including: ${messageValues.join(', ')}`
              );
            }
          }
          return verbosity;
        },
        conflicts: ['debug', 'quiet'],
        describe: 'Enable a subset of logging messages',
        nargs: 1,
      },
      'reference-base-url': {
        description: 'Url to append reference page listed in tests to',
        type: 'string',
        default: 'http://localhost:8000',
      },
      'web-driver-url': {
        coerce(arg) {
          return new URL(arg);
        },
        default: 'http://localhost:4444',
      },
      'web-driver-browser': {
        choices: ['chrome', 'firefox'],
        default: 'firefox',
      },
      'at-driver-url': {
        coerce(arg) {
          return new URL(arg);
        },
        default: 'ws://localhost:4382',
      },
      'callback-url': {
        default: process.env.ARIA_APP_CALLBACK_URL,
      },
      'callback-header': {
        default: process.env.ARIA_APP_CALLBACK_HEADER,
      },
      mock: {
        type: 'boolean',
        hidden: true,
      },
      'mock-open-page': {
        choices: ['request', 'skip'],
        hidden: true,
      },
    })
    .showHidden('show-hidden');
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
        } else if (value === false) {
          args.push('--debug=false');
        }
        break;
      case 'quiet':
        if (value) {
          args.push('--quiet');
        } else if (value === false) {
          args.push('--quiet=false');
        }
        break;
      case 'callbackUrl':
        args.push('--callback-url', value.toString());
        break;
      case 'callbackHeader':
        args.push('--callback-header', value.toString());
        break;
      case 'verbose':
        args.push('--verbose', value.join(','));
        break;
      case 'referenceBaseUrl':
        args.push('--reference-base-url', value.toString());
        break;
      case 'webDriverUrl':
        args.push('--web-driver-url', value.toString());
        break;
      case 'webDriverBrowser':
        args.push('--web-driver-browser', value.toString());
        break;
      case 'atDriverUrl':
        args.push('--at-driver-url', value.toString());
        break;
      case 'mock':
        if (value) {
          args.push('--mock');
        } else if (value === false) {
          args.push('--mock=false');
        }
        break;
      case 'mockOpenPage':
        args.push(`--mock-open-page=${value}`);
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
export function pickAgentCliOptions({
  debug,
  quiet,
  verbose,
  referenceBaseUrl,
  webDriverUrl,
  webDriverBrowser,
  atDriverUrl,
  mock,
  mockOpenPage,
  callbackUrl,
  callbackHeader,
}) {
  return {
    ...(debug === undefined ? {} : { debug }),
    ...(quiet === undefined ? {} : { quiet }),
    ...(verbose === undefined ? {} : { verbose }),
    ...(referenceBaseUrl === undefined ? {} : { referenceBaseUrl }),
    ...(webDriverUrl === undefined ? {} : { webDriverUrl }),
    ...(webDriverBrowser === undefined ? {} : { webDriverBrowser }),
    ...(atDriverUrl === undefined ? {} : { atDriverUrl }),
    ...(mock === undefined ? {} : { mock }),
    ...(mockOpenPage === undefined ? {} : { mockOpenPage }),
    ...(callbackUrl === undefined ? {} : { callbackUrl }),
    ...(callbackHeader === undefined ? {} : { callbackHeader }),
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
    .command('$0', 'Run tests from input', buildAgentCliOptions, stopAfterMain, [
      agentVerboseMiddleware,
      agentAbortMiddleware,
      agentLoggerMiddleware,
      agentTestsMiddleware,
      agentReportMiddleware,
      agentRunnerMiddleware,
    ]);
}

export async function parseAgentCli({ argv = [], ...parserConfiguration } = {}) {
  return await (await createAgentCliParser(parserConfiguration)).parse(hideBin(argv));
}

/**
 * Summarize cli options as mock options for creating a test runner.
 * @param {AriaATCIAgent.CliOptions} cliOptions
 * @returns {AriaATCIAgent.MockOptions}
 */
export function agentMockOptions(cliOptions) {
  let { mock, mockOpenPage } = pickAgentCliOptions(cliOptions);
  if (mock === undefined && mockOpenPage) {
    mock = true;
  }
  if (mock) {
    return { openPage: mockOpenPage ? mockOpenPage : 'request' };
  }
  return undefined;
}

async function stopAfterMain(argv) {
  await agentMain(argv);
  await argv.stop();
}

/**
 * Build and assign a test runner based on passed arguments.
 * @param {object} argv
 * @param {AriaATCIAgent.Log} argv.log
 * @param {AriaATCIAgent.MockOptions} [argv.mock]
 * @param {AriaATCIAgent.TestRunner} argv.runner
 * @param {AriaATCIAgent.Browser} [argv.webDriverBrowser]
 * @param {AriaATCIShared.BaseURL} argv.webDriverUrl
 */
async function agentRunnerMiddleware(argv) {
  argv.runner = await createRunner({
    log: argv.log,
    baseUrl: new URL(argv.referenceBaseUrl),
    mock: agentMockOptions(argv),
    webDriverUrl: argv.webDriverUrl,
    webDriverBrowser: argv.webDriverBrowser,
    callbackUrl: argv.callbackUrl,
    callbackHeader: argv.callbackHeader,
    atDriverUrl: argv.atDriverUrl,
    abortSignal: argv.abortSignal,
  });
}

/**
 * Build and assign a test runner based on passed arguments.
 * @param {object} argv
 * @param {boolean} argv.debug
 * @param {boolean} argv.quiet
 * @param {string[]} argv.verbose
 * @param {boolean} argv.verbosity
 */
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

async function agentAbortMiddleware(argv) {
  argv.abortSignal = new Promise(resolve => {
    argv.stop = resolve;
    argv.signals.once('SIGINT', () => resolve());
    process.once('beforeExit', () => resolve());
  });
}

/**
 * Build and assign main loop arguments based on passed protocol and other arguments.
 * @param {object} argv
 * @param {function(*): void} argv.send
 * @param {AriaATCIAgent.Log} argv.log
 */
export function agentLoggerMiddleware(argv) {
  if (typeof argv.send !== 'function') {
    throw new Error(
      `Currently, this command may only be used when launched by a nodejs child_process.fork call.`
    );
  }

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

/**
 * Build and assign main loop arguments based on passed protocol and other arguments.
 * @param {object} argv
 * @param {EventEmitter} argv.signals
 * @param {AriaATCIAgent.TestIterable} argv.tests
 */
export function agentTestsMiddleware(argv) {
  const { signals } = argv;
  argv.tests = (async function* () {
    for await (const message of iterateEmitter(signals, 'message', 'SIGINT')) {
      if (message.type === 'task') {
        yield message.data;
      } else if (message.type === 'stop') {
        break;
      }
    }
  })();
}

/**
 * Build and assign main loop arguments based on passed protocol and other arguments.
 * @param {object} argv
 * @param {function(*): void} argv.send
 * @param {AriaATCIAgent.ReportResult} argv.reportResult
 */
export function agentReportMiddleware(argv) {
  if (typeof argv.send !== 'function') {
    throw new Error(
      `Currently, this command may only be used when launched by a nodejs child_process.fork call.`
    );
  }

  const { send } = argv;
  argv.reportResult = async function (result) {
    send({ type: 'result', data: result });
  };
}
