/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module agent
 */

import { request } from 'http';
import { AgentMessage } from './messages.js';
import { validateKeysFromCommand } from './driver-test-runner.js';

/**
 * @implements {AriaATCIAgent.TestRunner}
 */
export class MockTestRunner {
  /**
   * @param {object} options
   * @param {AriaATCIShared.BaseURL} options.baseUrl
   * @param {AriaATCIHost.Log} options.log
   * @param {AriaATCIAgent.MockOptions} options.mock
   */
  constructor({ baseUrl, log, mock: config }) {
    this.baseUrl = baseUrl;
    this.log = log;
    this.config = config;
  }

  async openPage(url) {
    if (this.config.openPage === 'request') {
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
    }

    this.log(AgentMessage.OPEN_PAGE, { url });
  }

  /**
   * @param {AriaATCIData.CollectedTest["commands"][number]} command
   * @param {AriaATCIData.CollectedTest["assertions"][number]} assertion
   */
  async testAssertion(command, assertion) {
    return true;
  }

  /**
   * @param {AriaATCIData.CollectedTest} task
   * @param {AriaATCIShared.BaseURL} baseUrl
   */
  async run(task, baseUrl) {
    const base = `${baseUrl.protocol}://${baseUrl.hostname}:${baseUrl.port}${baseUrl.pathname}`;
    await this.openPage(
      new URL(`${baseUrl.pathname ? `${baseUrl.pathname}/` : ''}${task.target.referencePage}`, base)
    );

    const commandsOutput = [];
    const results = [];

    for (const command of task.commands) {
      const { value: validCommand, errors } = validateKeysFromCommand(command);
      if (validCommand) {
        const mockOutput = `mocked output for ${command.id}`;
        commandsOutput.push({
          command: validCommand.id,
          output: mockOutput,
        });

        for (const assertion of task.assertions) {
          const expectationText = assertion.expectation || assertion.assertionStatement;

          results.push({
            command: validCommand.id,
            expectation: expectationText,
            pass: await this.testAssertion(validCommand, assertion),
            output: `mocked output for ${expectationText}`,
          });
        }
      } else {
        await this.log(AgentMessage.INVALID_KEYS, { command, errors });

        commandsOutput.push({
          command: command.id,
          errors,
        });

        for (const assertion of task.assertions) {
          const expectationText = assertion.expectation || assertion.assertionStatement;

          results.push({
            command: command.id,
            expectation: expectationText,
            output: `mocked output for ${expectationText}`,
            pass: false,
          });
        }
      }
    }

    return {
      testId: task.info.testId,
      capabilities: {
        browserName: 'mock',
        browserVersion: '1.0',
        atName: 'mock',
        atVersion: '1.0',
        platformName: 'mock',
      },
      commands: commandsOutput,
      results,
    };
  }
}
