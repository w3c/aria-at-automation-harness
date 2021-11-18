import path from 'path';
import { Readable } from 'stream';

import yargs from 'yargs';

import * as agentCli from '../agent/cli.js';

import { Agent } from './agent.js';
import { hostMain } from './main.js';
import { HostMessage, createHostLogger } from './messages.js';
import { plansFrom } from './plan-from.js';
import { Server } from './server.js';

export const command = '$0 [files..]';

export const describe = 'Run test plans';

/**
 * @param {yargs} args
 */
export const builder = (args = yargs) =>
  args
    .positional('files', { describe: 'Files in a test plan' })
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
                `--verbose '${arg}' contains unknown ids. It must be a comma separated list including: ${Object.values(
                  HostMessage
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
      workingdir: {
        describe: 'Directory "files" are relative to',
        default: '.',
        nargs: 1,
        type: 'string',
      },
      ['tests-match']: {
        describe: 'Files matching pattern in a test plan will be tested',
        default: '{,**/}test*.json',
        nargs: 1,
        type: 'string',
      },
      ['agent-arg']: {
        async coerce(arg) {
          if (!arg) {
            return {};
          }
          let options = {};
          const agentOptionsParser = agentCli.buildAgentCliOptions(await yargs());
          for (const item of arg) {
            options = { ...options, ...(await agentOptionsParser.parse(item)) };
          }
          return agentCli.pickAgentCliOptions(options);
        },
        hidden: true,
        nargs: 1,
        type: 'array',
      },
      ['agent-protocol']: {
        choices: ['fork', 'shell', 'api', 'auto'],
        default: 'auto',
        hidden: true,
      },
      ['plan-protocol']: {
        choices: ['fork', 'shell', 'api', 'stream', 'auto'],
        default: 'auto',
        hidden: true,
      },
    })
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
  argv.workingdir = path.resolve(argv.workingdir);

  mainLoggerMiddleware(argv);
  mainTestPlanMiddleware(argv);
  mainServerMiddleware(argv);
  mainAgentMiddleware(argv);
  mainResultMiddleware(argv);
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
  const {
    log,
    testsMatch: testPattern,
    planProtocol: protocol,
    workingdir,
    files,
    stdin: stream,
  } = argv;

  const planOptions = { log, testPattern };
  let planInput;
  if (['fork', 'shell', 'api'].includes(protocol)) {
    if (!files || files.length === 0) {
      throw new Error(`'--plan-protocol ${protocol}' requires 'files' argument to be not empty`);
    }
    planInput = {
      protocol,
      workingdir,
      files,
    };
  } else if (protocol === 'stream') {
    if (files && files.length > 0) {
      throw new Error(`'--plan-protocol stream' and 'files' argument cannot be used together`);
    }
    planInput = { stream };
  } else if (files && files.length > 0) {
    planInput = { workingdir, files };
  } else {
    planInput = { stream };
  }

  argv.plans = plansFrom(planInput, planOptions);
}

function mainServerMiddleware(argv) {
  const { log } = argv;

  argv.server = new Server({ log });
}

function mainAgentMiddleware(argv) {
  const { log, agentProtocol: protocol, agentArg: config } = argv;

  argv.agent = new Agent({
    log,
    protocol,
    config,
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
