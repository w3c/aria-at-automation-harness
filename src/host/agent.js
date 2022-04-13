/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module host
 */

import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import { constants as osConstants } from 'os';
import * as path from 'path';
import { fileURLToPath, URL } from 'url';

import { iterateEmitter } from '../shared/iterate-emitter.js';
import { processExited, collectProcessPipe } from '../shared/process-util.js';

import { agentCliArgsFromOptionsMap, agentMockOptions } from '../agent/cli.js';
import { createRunner } from '../agent/create-test-runner.js';
import { agentMain } from '../agent/main.js';
import { AgentMessage, createAgentLogger } from '../agent/messages.js';

import { HostMessage } from './messages.js';

const {
  signals: { SIGINT },
} = osConstants;

export class AgentController {
  /**
   * @param {object} options
   * @param {AriaATCIHost.Log} options.log
   * @param {'fork' | 'developer'} [options.protocol]
   * @param {AriaATCIAgent.CliOptions} [options.config]
   */
  constructor({ config = {}, ...otherOptions }) {
    this._options = {
      ...this._defaultOptions(),
      ...otherOptions,
      config: this._modifyConfig(config),
    };

    /** @type {AriaATCIAgent.CliOptions} */
    this._activeConfig = null;
    /** @type {AgentProtocol} */
    this._activeProtocol = null;

    this._logEmitter = new EventEmitter();
  }

  _defaultOptions() {
    return { protocol: 'fork' };
  }

  /**
   * @param {AriaATCIAgent.CliOptions} config
   * @returns {AriaATCIAgent.CliOptions}
   */
  _modifyConfig(config) {
    return {
      debug: config.quiet === undefined && config.verbose === undefined ? true : undefined,
      ...config,
    };
  }

  /**
   * @param {AriaATCIData.Test} test
   * @returns {Promise<AriaATCIData.TestResult>}
   */
  async run(test) {
    return await this._activeProtocol.run(test);
  }

  /**
   * @returns {AsyncGenerator<AriaATCIData.Log>}
   */
  async *logs() {
    if (this._activeProtocol) {
      yield* this._activeProtocol.logs();
    }
    for await (const instance of iterateEmitter(this._logEmitter, 'log')) {
      yield* instance.logs();
    }
  }

  /**
   * @param {AriaATCIAgent.CliOptions} options
   */
  async start(options) {
    try {
      const { log, protocol, config } = this._options;
      options = { ...config, ...options };
      this._activeConfig = options;

      const Protocol = AGENT_PROTOCOL[protocol];
      this._activeProtocol = new Protocol();
      const ready = this._activeProtocol.start(options);
      this._logEmitter.emit('log', this._activeProtocol);
      await ready;
      log(HostMessage.AGENT_PROTOCOL, { protocol: Protocol.protocolName });
    } catch (error) {
      this._activeProtocol = null;
      throw new Error(`Agent failed to start.\n${error.stack ? error.stack : error.toString()}`);
    }
  }

  async stop() {
    await this._activeProtocol.stop();
    this._activeProtocol = null;
  }
}

class AgentProtocol {
  static get protocolName() {
    return 'unknown';
  }

  /**
   * Start a copy of src/agent and run tests in it.
   */
  constructor() {
    /** @type {Promise<{code: number, signal: number} | {code: number}> | null} */
    this.exited = null;
    /** @type {Promise<void> | null} */
    this.ready = null;
  }

  /**
   * @param {AriaATCIData.Test} test
   * @returns {Promise<AriaATCIData.TestResult>}
   */
  async run(test) {
    const { testId } = test.info;
    this._sendTest(test);
    for await (const result of this._results()) {
      if (result.testId === testId) {
        return result;
      }
    }
    throw new Error('test result not received');
  }

  /**
   * Iterate process log messages as they are received.
   * @returns {AsyncGenerator<AriaATCIData.Log>}
   */
  async *logs() {
    throw new Error(`${this.constructor.name}.logs() not implemented`);
  }

  /**
   * Start the agent process.
   * @param {AriaATCIAgent.CliOptions} options
   */
  async start(options) {
    throw new Error(`${this.constructor.name}.start() not implemented`);
  }

  /**
   * Stop the agent process.
   */
  async stop() {
    throw new Error(`${this.constructor.name}.stop() not implemented`);
  }

  /**
   * Send a test to the process.
   * @param {AriaATCIData.Test} test
   */
  async _sendTest(test) {
    throw new Error(`${this.constructor.name}._sendTest() not implemented`);
  }

  /**
   * Iterate results from the agent process as they are received.
   * @returns {AsyncGenerator<AriaATCIData.TestResult>}
   */
  async *_results() {
    throw new Error(`${this.constructor.name}._results() not implemented`);
  }
}

class AgentForkProtocol extends AgentProtocol {
  static get protocolName() {
    return 'fork';
  }

  /**
   * Start a copy of src/agent with child_process.fork and run tests in it.
   */
  constructor() {
    super();
    /** @type {child_process.ChildProcess | null} */
    this._processFork = null;
  }

  async *logs() {
    for await (const message of this._messages()) {
      if (message.type === 'log') {
        yield message.data;
      }
    }
  }

  /**
   * @param {AriaATCIAgent.CliOptions} options
   */
  async start(options) {
    const agentPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../bin/agent.js'
    );

    const agentProcess = (this._processFork = child_process.fork(
      agentPath,
      agentCliArgsFromOptionsMap(options),
      { stdio: 'pipe', serialization: 'advanced' }
    ));

    const stderrJob = collectProcessPipe(agentProcess.stderr);
    this.exited = processExited(agentProcess);
    this.ready = (async () => {
      for await (const log of this.logs()) {
        if (log.data.type === AgentMessage.START) {
          await stderrJob.cancel();
          return;
        }
      }
      const stderrOutput = await stderrJob.cancel();
      throw new Error(`Agent fork exited before it was ready.\n${stderrOutput}`);
    })();

    await this.ready;
  }

  async stop() {
    if (this._processFork) {
      this._processFork.send({ type: 'stop' });
      try {
        await Promise.race([
          this.exited,
          new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
            throw new Error('AgentProtocol: graceful stop timeout');
          }),
        ]);
      } catch (_) {
        this._processFork.kill(SIGINT);
      }
    }
    await this.exited;

    this._processFork = null;
    this.exited = null;
    this.ready = null;
  }

  async _sendTest(test) {
    this._processFork.send({ type: 'task', data: test });
  }

  async *_messages() {
    yield* iterateEmitter(this._processFork, 'message', 'exit');
  }

  async *_results() {
    for await (const message of this._messages()) {
      if (message.type === 'result') {
        yield message.data;
      }
    }
  }
}

class AgentDeveloperProtocol extends AgentProtocol {
  static get protocolName() {
    return 'developer';
  }

  /**
   * Start a copy of src/agent with the js api and run tests in it.
   */
  constructor() {
    super();
    this._testEmitter = null;
    this._logEmitter = null;
    this._resultEmitter = null;
  }

  async _sendTest(test) {
    this._testEmitter.emit('message', test);
  }

  _results() {
    return iterateEmitter(this._resultEmitter, 'result', 'stop');
  }

  async *logs() {
    yield* iterateEmitter(this._logEmitter, 'message', 'stop');
  }

  async start(options) {
    const { log, emitter: logEmitter } = createAgentLogger();
    this._testEmitter = new EventEmitter();
    this._logEmitter = logEmitter;
    this._resultEmitter = new EventEmitter();

    const abortSignal = new Promise(resolve => {
      this._testEmitter.once('stop', () => resolve());
    });

    this.exited = agentMain({
      runner: await createRunner({
        abortSignal,
        baseUrl: options.referenceBaseUrl || new URL('http://localhost:4400'),
        log,
        mock: agentMockOptions(options),
        atDriverUrl: options.atDriverUrl,
        webDriverUrl: options.webDriverUrl,
      }),
      log,
      tests: iterateEmitter(this._testEmitter, 'message', 'stop'),
      reportResult: result => {
        this._resultEmitter.emit('result', result);
      },
    })
      .then(() => {
        this.stop();
      })
      .then(() => ({ code: 0 }));
    this.ready = Promise.resolve();

    await this.ready;
  }

  async stop() {
    this._testEmitter.emit('stop');
    this._logEmitter.emit('stop');
    this._resultEmitter.emit('stop');

    await this.exited;

    this.exited = null;
    this.ready = null;
  }
}

const AGENT_PROTOCOL = {
  fork: AgentForkProtocol,
  developer: AgentDeveloperProtocol,
};
