/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module agent
 */

import { request } from 'http';
import { RunnerMessage } from './messages.js';
import { validateKeysFromCommand } from './driver-test-runner.js';

/**
 * @implements {AriaATCIRunner.TestRunner}
 */
export class MockTestRunner {
  /**
   * @param {object} options
   * @param {URL} options.baseUrl
   * @param {AriaATCIHost.Log} options.log
   */
  constructor({ baseUrl, log }) {
    this.baseUrl = baseUrl;
    this.log = log;
  }

  async openPage(url) {
    await new Promise((resolve, reject) =>
      request(url.toString(), res => {
        try {
          res
            .on('data', () => {})
            .on('error', reject)
            .setEncoding('utf8')
            .on('end', () => {
              res.statusCode < 400
                ? resolve()
                : reject(new Error(`request returned ${res.statusCode}`));
            });
        } catch (e) {
          reject(e);
        }
      })
        .on('error', reject)
        .end()
    );

    this.log(RunnerMessage.OPEN_PAGE, { url });
  }

  /**
   * @param {AriaATCIData.CollectedTest} task
   */
  async run(task) {
    await this.openPage(
      new URL(
        `${this.baseUrl.pathname ? `${this.baseUrl.pathname}/` : ''}${task.target.referencePage}`,
        this.baseUrl.toString()
      )
    );

    const commandsOutput = [];

    for (const command of task.commands) {
      const { value: validCommand, errors } = validateKeysFromCommand(command);
      const assertions = task.assertions.map(assertion => {
        return {
          expectation: assertion.expectation || assertion.assertionStatement,
          verdict: null,
        };
      });
      if (validCommand) {
        const mockOutput = `mocked output for ${command.id}`;
        commandsOutput.push({
          command: validCommand.id,
          response: mockOutput,
          assertions,
        });
      } else {
        await this.log(RunnerMessage.INVALID_KEYS, { command, errors });

        commandsOutput.push({
          command: command.id,
          errors,
          assertions,
        });
      }
    }

    return {
      capabilities: {
        browserName: 'mock',
        browserVersion: '1.0',
        atName: 'mock',
        atVersion: '1.0',
        platformName: 'mock',
      },
      commands: commandsOutput,
    };
  }
}
