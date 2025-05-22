/**
 * @module host
 */

import * as path from 'path';
import * as cliMiddleware from './cli-middleware/index.js';
import { HostMessage } from './messages.js';
import { HostServer } from './server.js';
import { createHost } from '../shared/file-record.js';
import { setServerOptionsInTestPlan } from './plan-object.js';
import { createBrowserDriver } from '../runner/browser-driver/create.js';
import { createATDriver } from '../runner/at-driver.js';
import { getTimesOption } from '../shared/times-option.js';
import {
  atKeysFromCommand,
  DriverTestRunner,
  validateKeysFromCommand,
} from '../runner/driver-test-runner.js';
import { RunnerMessage } from '../runner/messages.js';

export const command = 'manual-test <plan-files..>';

// This cli module's describe is false to hide the command.
export const describe = false;

export const builder = yargs => {
  return yargs
    .env('ARIA-AT')
    .positional('plan-files', { describe: 'Files in a test plan' })
    .options({
      'plan-workingdir': {
        description: 'Directory to host localhost server on',
        default: '.',
        type: 'string',
        coerce(arg) {
          return path.resolve(arg);
        },
      },
      'tests-match': {
        describe: 'Files matching pattern in a test plan will be tested',
        default: '{,**/}test*.json',
        nargs: 1,
        type: 'string',
      },
      quiet: {
        conflicts: ['debug'],
        describe: 'Disable all logging',
      },
      debug: {
        conflicts: ['quiet'],
        describe: 'Enable all logging',
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
      'reference-hostname': {
        default: 'localhost',
      },
    })
    .middleware(cliMiddleware.verbose)
    .middleware(cliMiddleware.mainLogger)
    .middleware(cliMiddleware.testPlan);
};

export async function handler(argv) {
  const { planWorkingdir, log, referenceHostname, plans, webDriverUrl, webDriverBrowser } = argv;
  // throw new Error('manual-test is a sandbox for developer to write scripts to manually test in similar environment to the run-plan.  Please edit src/host/cli-manual-test.js to prepare the test you want.');
  log(HostMessage.START);

  // setup http localhost server
  const server = new HostServer({ log, baseUrl: { hostname: referenceHostname } });
  await server.ready;
  log(HostMessage.SERVER_LISTENING, { url: server.baseUrl });

  let stopDrivers = any => {};
  const abortSignal = new Promise(resolve => {
    stopDrivers = () => {
      log(HostMessage.STOP_DRIVERS);
      resolve();
    };
  });

  let timesOption = getTimesOption(argv);

  const [browserDriver, atDriver] = await Promise.all([
    createBrowserDriver({
      url: argv.webDriverUrl,
      browser: argv.webDriverBrowser,
      abortSignal,
      timesOption,
    }).catch(cause => {
      throw new Error('Error initializing browser driver', { cause });
    }),
    createATDriver({
      url: argv.atDriverUrl,
      abortSignal,
      log,
    }).catch(cause => {
      throw new Error('Error connecting to at-driver', { cause });
    }),
  ]);

  for await (const plan of plans) {
    const serverDirectory = server.addFiles(plan.files);
    log(HostMessage.ADD_SERVER_DIRECTORY, { url: serverDirectory.baseUrl });
    const usePlan = setServerOptionsInTestPlan(plan, { baseUrl: serverDirectory.baseUrl });

    const runner = new DriverTestRunner({
      baseUrl: new URL(serverDirectory.baseUrl.toString()),
      log,
      browserDriver,
      atDriver,
      timesOption,
    });
    const file = plan.files.find(({ name }) => name === plan.tests[0].filepath);
    const textDecoder = new TextDecoder();
    const test = JSON.parse(textDecoder.decode(file.bufferData));

    await log(RunnerMessage.OPEN_PAGE, { url: 'about:blank' });
    await browserDriver.navigate('about:blank');
    let runNumber = 1;
    while (true) {
      // const result = await runner.run(testSource);
      // console.log(result.commands);

      const command = test.commands[0];
      const { value: validCommand, errors } = validateKeysFromCommand(command);

      const spokenOutputOnOpen = await runner._collectSpeech(timesOption.afterNav, () =>
        runner.openPage({
          url: runner._appendBaseUrl(test.target.referencePage),
          referencePage: test.target.referencePage,
        })
      );

      if (command.settings) {
        await runner.ensureSettings(command.settings);
      } else if (test.target?.mode) {
        await runner.ensureMode(test.target.mode);
      }

      const spokenOutputOnKeys = await runner._collectSpeech(timesOption.afterKeys, () =>
        runner.sendKeys(atKeysFromCommand(validCommand))
      );

      const spokenOutputOnReset = await runner._collectSpeech(timesOption.afterNav, async () => {
        await log(RunnerMessage.OPEN_PAGE, { url: 'about:blank' });
        await browserDriver.navigate('about:blank');
      });

      console.log({
        runNumber: runNumber++,
        spokenOutputOnOpen,
        spokenOutputOnKeys,
        spokenOutputOnReset,
      });
    }

    break; // we only use the first plan in this manual test
  }

  stopDrivers();
  server.close();
}
