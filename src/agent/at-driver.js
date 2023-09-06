import ws from 'ws';

import { iterateEmitter } from '../shared/iterate-emitter.js';
import { AgentMessage } from './messages.js';

/**
 * @param {object} options
 * @param {object} [options.url]
 * @param {string} [options.url.hostname]
 * @param {number | string} [options.url.port]
 * @param {object} options.abortSignal
 * @returns {Promise<ATDriver>}
 */
export async function createATDriver({
  url: { hostname = 'localhost', port = 4382 } = {},
  abortSignal,
  log,
} = {}) {
  if (!abortSignal) process.exit(1);
  const socket = new ws(`ws://${hostname}:${port}/command`);
  const driver = new ATDriver({ socket, log });
  await driver.ready;
  abortSignal.then(() => driver.quit());
  return driver;
}

export class ATDriver {
  constructor({ socket, log }) {
    this.socket = socket;
    this.log = log;
    this.ready = new Promise(resolve => socket.once('open', () => resolve())).then(() =>
      socket.send(JSON.stringify({ method: 'session.new' }))
    );
    this.closed = new Promise(resolve => socket.once('close', () => resolve()));

    this._nextId = 0;
  }

  async quit() {
    this.socket.close();
    await this.closed;
  }

  async *_messages() {
    for await (const rawMessage of iterateEmitter(this.socket, 'message', 'close', 'error')) {
      // this.log(AgentMessage.DEBUG, {msg: `[message raw] ${rawMessage}`});
      yield JSON.parse(rawMessage.toString());
    }
  }

  async _send(command) {
    const id = (this._nextId++).toString();
    this.socket.send(JSON.stringify({ id, ...command }));
    for await (const message of this._messages()) {
      if (message.id === id) {
        if (message.error) {
          throw new Error(message.error);
        }
        return;
      }
    }
  }

  /**
   * @param  {...(ATKey | ATKeyChord | ATKeySequence)} keys
   */
  async sendKeys(...keys) {
    for (const chord of ATKey.sequence(...keys)) {
      for (const { key } of chord) {
        await this._send({
          type: 'command',
          method: 'interaction.pressKeys',
          params: { keys: chord.keys.map(({ key }) => key.toUpperCase()) },
        });
      }
    }
  }

  /**
   * @returns {AsyncGenerator<string>}
   */
  async *speeches() {
    for await (const message of this._messages()) {
      if (message.method === 'interaction.capturedOutput') {
        yield message.params.data;
      }
    }
  }
}

export class ATKey {
  /**
   * @param {string} key
   */
  constructor(key) {
    this.type = 'key';
    this.key = key;
  }
  toString() {
    return this.key;
  }
  static get ENTER() {
    return new ATKey('enter');
  }
  /**
   * @param {string} key
   * @returns {ATKey}
   */
  static key(key) {
    return new ATKey(key);
  }
  /**
   * @param  {...ATKey} keys
   * @returns {ATKeyChord}
   */
  static chord(...keys) {
    return new ATKeyChord(keys);
  }
  /**
   * @param  {...(ATKey | ATKeyChord | ATKeySequence)} sequence
   * @returns {ATKeySequence}
   */
  static sequence(...sequence) {
    /** @type {ATKeyChord[]} */
    const normalized = [];
    for (const item of sequence) {
      if (item instanceof ATKeyChord) {
        normalized.push(item);
      } else if (item instanceof ATKey) {
        normalized.push(ATKey.chord(item));
      } else if (item instanceof ATKeySequence) {
        normalized.push(...item);
      }
    }
    return new ATKeySequence(normalized);
  }
}

export class ATKeyChord {
  /**
   * @param {ATKey[]} keys
   */
  constructor(keys) {
    this.type = 'chord';
    this.keys = keys;
  }

  *[Symbol.iterator]() {
    yield* this.keys;
  }

  toString() {
    return this.keys.join(' + ');
  }
}

export class ATKeySequence {
  /**
   * @param {ATKeyChord[]} sequence
   */
  constructor(sequence) {
    this.type = 'sequence';
    this.sequence = sequence;
  }

  *[Symbol.iterator]() {
    yield* this.sequence;
  }

  toString() {
    return this.sequence.join(', ');
  }
}
