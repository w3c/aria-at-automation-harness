import ws from 'ws';

import { iterateEmitter } from '../shared/iterate-emitter.js';

export async function createATDriver({
  url: { hostname = 'localhost', port = 4382 } = {},
  abortSignal,
} = {}) {
  if (!abortSignal) process.exit(1);
  const socket = new ws(`ws://${hostname}:${port}`, ['v1.aria-at.bocoup.com']);
  const driver = new ATDriver({ socket });
  await driver.ready;
  abortSignal.then(() => driver.quit());
  return driver;
}

export class ATDriver {
  constructor({ socket }) {
    this.socket = socket;
    this.ready = new Promise(resolve => socket.once('open', () => resolve()));
    this.closed = new Promise(resolve => socket.once('close', () => resolve()));

    this._nextId = 0;
  }

  async quit() {
    this.socket.close();
    await this.closed;
  }

  async *_messages() {
    for await (const rawMessage of iterateEmitter(this.socket, 'message', 'close', 'error')) {
      yield JSON.parse(rawMessage.toString());
    }
  }

  async _send(command) {
    const id = this._nextId++;
    this.socket.send(JSON.stringify({ id, ...command }));
    for await (const message of this._messages()) {
      if (message.type === 'response' && message.id === id) {
        if (message.error) {
          throw new Error(message.error);
        }
        return;
      }
    }
  }

  /**
   * @param  {...(string | ATKey | ATKeyChord | ATKeySequence)} keys
   */
  async sendKeys(...keys) {
    for (const chord of ATKey.sequence(...keys)) {
      for (const { key } of chord) {
        await this._send({ type: 'command', name: 'pressKey', params: [key] });
      }
      for (const { key } of Array.from(chord).reverse()) {
        await this._send({ type: 'command', name: 'releaseKey', params: [key] });
      }
    }
  }

  /**
   * @returns {AsyncGenerator<string>}
   */
  async *speeches() {
    for await (const message of this._messages()) {
      if (message.type === 'event' && message.name === 'speech') {
        yield message.data;
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
  static key(key) {
    return new ATKey(key);
  }
  static chord(...keys) {
    return new ATKeyChord(keys);
  }
  static string(string) {
    return new ATKeySequence(string.split('').map(char => ATKey.chord(ATKey.key(char))));
  }
  static sequence(...sequence) {
    /** @type {ATKeyChord[]} */
    const normalized = [];
    for (const item of sequence) {
      if (typeof item === 'string') {
        normalized.push(...ATKey.string(string));
      } else if (item instanceof ATKeyChord) {
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
