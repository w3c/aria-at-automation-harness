/**
 * @module host
 */

import * as path from 'path';
import { Readable } from 'stream';
import fetch, { Response } from 'node-fetch';

import yargs from 'yargs';
import { pickAgentCliOptions } from '../agent/cli.js';
import { AgentMessage } from '../agent/messages.js';

import { AgentController as Agent } from './agent.js';
import { hostMain } from './main.js';
import { HostMessage, createHostLogger } from './messages.js';
import { plansFrom } from './plan-from.js';
import { HostServer } from './server.js';
import { timesOptionDescription } from '../shared/times-option.js';

export const command = 'run-plan [plan-files..]';

export const describe = 'Run test plans';

/**
 * @param {yargs} args
 */
export const builder = (args = yargs) =>
  args
    .positional('plan-files', { describe: 'Files in a test plan' })
    .env('ARIA_AT')
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
          const messageValues = Object.values(HostMessage);
          const verbosity = arg.split(',');
          for (const name of verbosity) {
            if (!messageValues.includes(name)) {
              throw new Error(
                `--verbose '${arg}' contains unknown ids. It must be a comma separated list including: ${messageValues.join(
                  ', '
                )}`
              );
            }
          }
          return verbosity;
        },
        conflicts: ['debug', 'quiet'],
        describe: 'Enable a subset of logging messages',
        nargs: 1,
      },
      'tests-match': {
        describe: 'Files matching pattern in a test plan will be tested',
        default: '{,**/}test*.json',
        nargs: 1,
        type: 'string',
      },
      'reference-hostname': {
        default: 'localhost',
      },
      'plan-workingdir': {
        describe: 'Directory "plan-files" are relative to',
        default: '.',
      },
      'plan-protocol': {
        choices: ['fork', 'developer'],
        default: 'fork',
        hidden: true,
      },
      'agent-web-driver-url': {
        coerce(arg) {
          return new URL(arg);
        },
        default: 'http://localhost:4444',
      },
      'agent-web-driver-browser': {
        choices: ['chrome', 'firefox', 'safari'],
        default: 'firefox',
      },
      'agent-at-driver-url': {
        coerce(arg) {
          return new URL(arg);
        },
        default: 'http://localhost:4382',
      },
      'agent-protocol': {
        choices: ['fork', 'developer'],
        default: 'fork',
        hidden: true,
      },
      'agent-quiet': {
        conflicts: ['agent-debug', 'agent-verbose'],
        describe: 'Disable all logging',
        hidden: true,
      },
      'agent-debug': {
        conflicts: ['agent-quiet', 'agent-verbose'],
        describe: 'Enable all logging',
        hidden: true,
      },
      'agent-verbose': {
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
        conflicts: ['agent-debug', 'agent-quiet'],
        describe: 'Enable a subset of logging messages',
        nargs: 1,
        hidden: true,
      },
      'agent-mock': {
        type: 'boolean',
        hidden: true,
      },
      'agent-mock-open-page': {
        choices: ['request', 'skip'],
        hidden: true,
      },
      'callback-url': {
        describe: 'URL to POST test results to as they complete',
      },
      'callback-header': {
        describe: 'Header to send with callback request',
        coerce(arg) {
          if (!arg) {
            return {};
          }
          if (String(arg).indexOf(':') == -1) {
            throw new Error('callback header must include a : to separate header name from value');
          }
          // capture all non ":" characters, ignore :\s*, capture rest of string
          const [, name, value] = arg.match(/^([^:]+):\s*(.*)$/);

          return { [name]: value };
        },
      },
      times: timesOptionDescription,
    })
    .showHidden('show-hidden')
    .middleware(verboseMiddleware)
    .middleware(mainMiddleware);

export const handler = argv => hostMain(argv);

async function verboseMiddleware(argv) {
  const { debug, quiet, verbose } = argv;

  let verbosity;
  if (debug) {
    verbosity = Object.values(HostMessage);
  } else if (quiet) {
    verbosity = [];
  } else {
    verbosity = Array.isArray(verbose)
      ? verbose
      : [
          HostMessage.START,
          HostMessage.UNCAUGHT_ERROR,
          HostMessage.WILL_STOP,
          HostMessage.SERVER_LISTENING,
          HostMessage.ADD_SERVER_DIRECTORY,
          HostMessage.REMOVE_SERVER_DIRECTORY,
        ];
  }

  argv.verbosity = verbosity;
}

function mainMiddleware(argv) {
  argv.planWorkingdir = path.resolve(argv.planWorkingdir);
  mainFetchMiddleware(argv);
  mainLoggerMiddleware(argv);
  mainTestPlanMiddleware(argv);
  mainServerMiddleware(argv);
  mainAgentMiddleware(argv);
  mainResultMiddleware(argv);
}

function mainFetchMiddleware(argv) {
  if (!argv.fetch) {
    if (!argv.agentMock) {
      argv.fetch = fetch;
    } else {
      argv.fetch = (url, ...params) =>
        new Promise(resolve => {
          const { searchParams } = new URL(url);
          const status = parseInt(searchParams.get('TEST-STATUS'), 10) || 200;
          const response = new Response('a body', { status });

          if (searchParams.has('TEST-BAD-BODY')) {
            // Disturb the response body stream in order to trigger failure in
            // any future attempt to read.
            response.text();
          }

          console.log('Callback Fetch Mocked: ', url, ...params);
          resolve(response);
        });
    }
  }
}

function mainLoggerMiddleware(argv) {
  const { stderr, verbosity } = argv;

  const logger = createHostLogger();
  argv.log = logger.log;

  logger.emitter.on('message', ({ data: { type }, text }) => {
    if (verbosity.includes(type)) {
      stderr.write(`${text}\n`);
    }
  });
}

function mainTestPlanMiddleware(argv) {
  const { log, testsMatch: testPattern, planProtocol, planWorkingdir, planFiles } = argv;

  if (!planFiles || planFiles.length === 0) {
    throw new Error(
      `'--plan-protocol ${planProtocol}' requires 'plan-files' argument to not be empty`
    );
  }

  const planInput = {
    workingdir: planWorkingdir,
    files: planFiles,
  };
  const planOptions = { log, testPattern, protocol: planProtocol };

  argv.plans = plansFrom(planInput, planOptions);
}

function mainServerMiddleware(argv) {
  const { log } = argv;

  argv.server = new HostServer({ log, baseUrl: { hostname: argv.referenceHostname } });
}

function mainAgentMiddleware(argv) {
  const {
    log,
    agentProtocol: protocol,
    agentDebug,
    agentQuiet,
    agentVerbose,
    agentWebDriverUrl,
    agentWebDriverBrowser,
    agentAtDriverUrl,
    agentMock,
    agentMockOpenPage,
  } = argv;

  argv.agent = new Agent({
    log,
    protocol,
    config: pickAgentCliOptions({
      debug: agentDebug,
      quiet: agentQuiet,
      verbose: agentVerbose,
      webDriverUrl: agentWebDriverUrl,
      webDriverBrowser: agentWebDriverBrowser,
      atDriverUrl: agentAtDriverUrl,
      mock: agentMock,
      mockOpenPage: agentMockOpenPage,
    }),
  });
}

function mainResultMiddleware(argv) {
  const { stdout } = argv;

  /**
   * @param {AriaATCIHost.TestPlan} testPlan
   */
  argv.emitPlanResults = async ({ name, tests, log }) => {
    const result = {
      name,
      tests: tests.map(test => ({
        ...test,
        log: test.log.map(index => log[index]),
      })),
      log,
    };
    await new Promise(resolve =>
      Readable.from(JSON.stringify(result) + '\n')
        .on('end', resolve)
        .pipe(stdout, { end: false })
    );
  };
}
