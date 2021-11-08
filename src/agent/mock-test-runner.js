/// <reference path="../../node_modules/aria-at/types/aria-at-file.js" />

/**
 * @module agent
 */

export class MockTestRunner {
  /**
   * @param {CollectedTestCommand} command
   * @param {CollectedTestAssertion} assertion
   */
  runAssertion(command, assertion) {
    return {
      command: command.id,
      expectation: assertion.expectation,
      pass: this.testAssertion(command, assertion),
    };
  }

  /**
   * @param {CollectedTestCommand} command
   * @param {CollectedTestAssertion} assertion
   */
  testAssertion(command, assertion) {
    return true;
  }

  /**
   * @param {AriaATFile.CollectedTest} task
   */
  run(task) {
    return {
      testId: task.info.testId,
      results: task.commands.flatMap(command =>
        task.assertions.map(assertion => this.runAssertion(command, assertion))
      ),
    };
  }
}

/**
 * @typedef CollectedTestCommand
 * @property {string} id
 * @property {string} keystroke
 * @property {string} [extraInstructions]
 */

/**
 * @typedef CollectedTestAssertion
 * @property {number} priority
 * @property {string} expectation
 */
