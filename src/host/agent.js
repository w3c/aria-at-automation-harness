/// <reference path="../data/types.js" />
/// <reference path="../agent/types.js" />
/// <reference path="types.js" />

import child_process from 'child_process';
import { EventEmitter } from 'events';
import { constants as osConstants } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { iterateEmitter } from '../shared/iterate-emitter.js';
import { startJob } from '../shared/job.js';
import { processExited } from '../shared/process-util.js';

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
   * @param {'fork' | 'api' | 'auto'} [options.protocol]
   * @param {AriaATCIAgent.CliOptions} [options.config]
   */
  constructor({ config = {}, ...otherOptions } = {}) {
    this._options = {
      ...this._defaultOptions(),
      ...otherOptions,
      config: this._modifyConfig(config),
    };

    /** @type {AriaATCIAgent.CliOptions} */
    this._instanceConfig = null;
    /** @type {AgentProtocol} */
    this._instance = null;

    this._logEmitter = new EventEmitter();
  }

  _defaultOptions() {
    return { protocol: 'auto' };
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
   * @returns {AriaATCIData.TestResult}
   */
  async run(test) {
    return await this._instance.run(test);
  }

  /**
   * @returns {AsyncGenerator<AriaATCIData.Log>}
   */
  async *logs() {
    if (this._instance) {
      yield* this._instance.logs();
    }
    for await (const instance of iterateEmitter(this._logEmitter, 'log')) {
      yield* instance.logs();
    }
  }

  /**
   * @param {AriaATCIAgent.CliOptions} options
   */
  async start(options) {
    const { log, protocol, config } = this._options;
    options = { ...config, ...options };
    this._instanceConfig = options;
    const errors = [];

    for (const Protocol of AGENT_PROTOCOLS[protocol]) {
      try {
        this._instance = new Protocol();
        const ready = this._instance.start(options);
        this._logEmitter.emit('log', this._instance);
        await ready;
        log(HostMessage.AGENT_PROTOCOL, { protocol: Protocol.protocol });
        break;
      } catch (error) {
        errors.push(error);
        this._instance = null;
      }
    }

    if (this._instance === null) {
      throw new Error(
        `Agent failed to start.\n${errors
          .map(error => (error.stack ? error.stack : error.toString()))
          .join('\n')}`
      );
    }
  }

  async stop() {
    await this._instance.stop();
    this._instance = null;
  }
}

class AgentProtocol {
  static get protocol() {
    return 'unknown';
  }

  constructor() {
    /** @type {Promise<{code: number, signal: number}> | null} */
    this.exited = null;
    /** @type {Promise<void> | null} */
    this.ready = null;
  }

  /**
   * @param {AriaATCIData.Test} test
   * @returns {Promise<AriaATCIData.TestResult>}
   */
  async run(test) {
    this._sendTest(test);
    for await (const result of this._results()) {
      if (result.testId === test.info.testId) {
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

class AgentFork extends AgentProtocol {
  static get protocol() {
    return 'fork';
  }

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
      { stdio: 'pipe' }
    ));
    const stderrJob = startJob(async function ({ cancelable }) {
      let carry = '';
      for await (const buffer of cancelable(
        iterateEmitter(agentProcess.stderr, 'data', 'end', 'error')
      )) {
        carry += buffer.toString();
      }
      return carry;
    });

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
      this._processFork.kill(SIGINT);
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

class AgentAPI extends AgentProtocol {
  static get protocol() {
    return 'api';
  }

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

    this.exited = agentMain({
      runner: await createRunner({
        baseUrl: options.referenceBaseUrl,
        log,
        mock: agentMockOptions(options),
      }),
      log,
      tests: iterateEmitter(this._testEmitter, 'message', 'stop'),
      reportResult: result => {
        this._resultEmitter.emit('result', result);
      },
    }).then(() => ({ code: 0 }));
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

const AGENT_PROTOCOLS = {
  fork: [AgentFork],
  api: [AgentAPI],
  auto: [AgentFork, AgentAPI],
};
