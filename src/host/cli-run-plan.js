/**
 * @module host
 */

import * as path from 'path';
import { Readable } from 'stream';
import fetch, { Response } from 'node-fetch';

import yargs from 'yargs';

import { hostMain } from './main.js';
import { HostMessage } from './messages.js';
import { HostServer } from './server.js';
import { timesOptionsConfig } from '../shared/times-option.js';
import * as cliMiddleware from './cli-middleware/index.js';

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
      'web-driver-url': {
        coerce(arg) {
          return new URL(arg);
        },
        default: 'http://localhost:4444',
      },
      'web-driver-browser': {
        choices: ['chrome', 'firefox', 'safari'],
        default: 'firefox',
      },
      'at-driver-url': {
        coerce(arg) {
          return new URL(arg);
        },
        default: 'http://localhost:4382',
      },
      'runner-mock': {
        type: 'boolean',
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
      ...timesOptionsConfig,
    })
    .showHidden('show-hidden')
    .middleware(cliMiddleware.verbose)
    .middleware(mainMiddleware);

export const handler = argv => hostMain(argv);

function mainMiddleware(argv) {
  argv.planWorkingdir = path.resolve(argv.planWorkingdir);
  mainFetchMiddleware(argv);
  cliMiddleware.mainLogger(argv);
  cliMiddleware.testPlan(argv);
  mainServerMiddleware(argv);
  mainResultMiddleware(argv);
}

function mainFetchMiddleware(argv) {
  if (!argv.fetch) {
    if (!argv.runnerMock) {
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

function mainServerMiddleware(argv) {
  const { log } = argv;

  argv.server = new HostServer({ log, baseUrl: { hostname: argv.referenceHostname } });
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
