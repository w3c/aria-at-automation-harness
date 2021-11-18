/// <reference path="types.js" />

import child_process from 'child_process';
import { SIGINT } from 'constants';
import { EventEmitter } from 'events';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

import { iterateEmitter } from '../shared/iterate-emitter.js';
import { createJob } from '../shared/job.js';
import { parseJSONChunks, separateJSONChunks } from '../shared/json-chunks.js';

import { agentCliArgsFromOptionsMap } from '../agent/cli.js';
import { createRunner } from '../agent/create-test-runner.js';
import { agentMain } from '../agent/main.js';
import { AgentMessage, createAgentLogger } from '../agent/messages.js';

import { HostMessage } from './messages.js';

export class Agent {
  /**
   * @param {object} options
   * @param {AriaATCIHost.Log} options.log
   * @param {'fork' | 'shell' | 'api' | 'auto'} [options.protocol]
   * @param {{debug: (boolean | undefined), quiet: (boolean | undefined), verbose: (string[] | undefined)}} [options.config]
   */
  constructor({ config = {}, ...otherOptions } = {}) {
    this._options = {
      ...otherOptions,
      config: { debug: config.quiet || config.verbose ? false : true, ...config },
    };
    this._instanceOptions = null;
    this._instance = null;
    this._logEmitter = new EventEmitter();
  }
  /**
   * @param {*} test
   * @returns {*}
   */
  async run(test) {
    return await this._instance.run(test);
  }
  /**
   * @returns {AsyncGenerator<{text: string}>}
   */
  async *logs() {
    if (this._instance) {
      yield* this._instance.logs();
    }
    for await (const instance of iterateEmitter(this._logEmitter, 'log')) {
      yield* instance.logs();
    }
  }
  async start(options) {
    const { log, protocol = 'auto', config } = this._options;
    options = { ...config, ...options };
    this._instanceOptions = options;
    const errors = [];
    for (const Tool of AGENT_TOOLS[protocol]) {
      try {
        this._instance = new Tool();
        const ready = this._instance.start(options);
        this._logEmitter.emit('log', this._instance);
        await ready;
        log(HostMessage.AGENT_PROTOCOL, { protocol: Tool.protocol });
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

class AgentFork {
  static get protocol() {
    return 'fork';
  }

  async run(test) {
    this._process.send({ type: 'task', data: test });
    for await (const result of this._results()) {
      if (result.testId === test.info.testId) {
        return result;
      }
    }
    throw new Error('test result not received');
  }

  async *logs() {
    yield* this._logs();
  }

  async start(options) {
    const process = (this._process = child_process.fork(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../bin/agent.js'),
      agentCliArgsFromOptionsMap({ ...options, protocol: 'fork' }),
      { stdio: 'pipe' }
    ));
    this.exited = new Promise(resolve => {
      this._process.once('exit', (code, signal) => {
        resolve({ code, signal });
      });
    });
    const stderrJob = createJob(async function ({ cancelable }) {
      let carry = '';
      for await (const buffer of cancelable(
        iterateEmitter(process.stderr, 'data', 'end', 'error')
      )) {
        carry += buffer.toString();
      }
      return carry;
    });
    this.ready = (async () => {
      for await (const log of this._logs()) {
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
    if (this._process) {
      this._process.kill(SIGINT);
    }
    this._process = null;
    await this.exited;
  }

  async *_messages() {
    yield* iterateEmitter(this._process, 'message', 'exit');
  }

  async *_results() {
    for await (const message of this._messages()) {
      if (message.type === 'result') {
        yield message.data;
      }
    }
  }

  async *_logs() {
    for await (const message of this._messages()) {
      if (message.type === 'log') {
        yield message.data;
      }
    }
  }
}

class AgentShell {
  static get protocol() {
    return 'shell';
  }

  async run(test) {
    (async () => {
      await new Promise(resolve => {
        Readable.from(JSON.stringify(test))
          .on('end', resolve)
          .pipe(this._process.stdin, { end: false });
      });
    })();
    for await (const result of this._results()) {
      return result;
    }
    throw new Error('test result not received');
  }

  async *logs() {
    yield* this._logs();
  }

  async start(options) {
    const process = (this._process = child_process.spawn(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../bin/agent.js'),
      agentCliArgsFromOptionsMap({ ...options, protocol: 'shell' }),
      { stdio: 'pipe' }
    ));
    this.exited = new Promise(resolve => {
      this._process.once('exit', (code, signal) => {
        resolve({ code, signal });
      });
    });
    const stderrJob = createJob(async function ({ cancelable }) {
      let carry = '';
      for await (const buffer of cancelable(
        iterateEmitter(process.stderr, 'data', 'end', 'error')
      )) {
        carry += buffer.toString();
      }
      return carry;
    });
    this.ready = (async () => {
      for await (const message of this._logs()) {
        if (message.text.includes('Start')) {
          await stderrJob.cancel();
          return;
        }
      }
      const stderrOutput = await stderrJob.cancel();
      throw new Error(`Agent shell exited before it was ready.\n${stderrOutput}`);
    })();
    await this.ready;
  }

  async stop() {
    if (this._process) {
      this._process.kill();
    }
    this._process = null;
    await this.exited;
  }

  _results() {
    return parseJSONChunks(separateJSONChunks(iterateEmitter(this._process.stdout, 'data', 'end')));
  }

  async *_logs() {
    for await (const buffer of iterateEmitter(this._process.stderr, 'data', 'end')) {
      yield { text: buffer.toString().trim() };
    }
  }
}

class AgentAPI {
  static get protocol() {
    return 'api';
  }

  constructor() {
    this._testEmitter = null;
    this._logEmitter = null;
    this._resultEmitter = null;
    this.exited = null;
  }

  async run(test) {
    this._testEmitter.emit('message', test);
    for await (const result of iterateEmitter(this._resultEmitter, 'result', 'stop')) {
      return result;
    }
    throw new Error('did not receive test result');
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
      runner: await createRunner({ baseUrl: options.referenceBaseUrl, log, mock: options.mock }),
      log,
      tests: iterateEmitter(this._testEmitter, 'message', 'stop'),
      reportResult: result => {
        this._resultEmitter.emit('result', result);
      },
    });
  }

  async stop() {
    this._testEmitter.emit('stop');
    this._logEmitter.emit('stop');
    this._resultEmitter.emit('stop');
    await this.exited;
  }
}

const AGENT_TOOLS = {
  fork: [AgentFork],
  shell: [AgentShell],
  api: [AgentAPI],
  auto: [AgentFork, AgentShell, AgentAPI],
};
