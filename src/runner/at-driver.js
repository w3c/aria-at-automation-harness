import ws from 'ws';

import { iterateEmitter } from '../shared/iterate-emitter.js';
import { RunnerMessage } from './messages.js';

/**
 * @param {object} options
 * @param {object} [options.url]
 * @param {string} [options.url.hostname]
 * @param {string} [options.url.pathname]
 * @param {number | string} [options.url.port]
 * @param {Promise<void>} [options.abortSignal]
 * @param {AriaATCIHost.Log} [options.log]
 * @returns {Promise<ATDriver>}
 */
export async function createATDriver({
  url: { hostname = 'localhost', port = 4382, pathname = '/session' } = {},
  abortSignal,
  log,
} = {}) {
  if (!abortSignal) process.exit(1);
  const url = `ws://${hostname}:${port}${pathname}`;
  log(RunnerMessage.AT_DRIVER_COMMS, { direction: 'connect', message: url });
  const socket = new ws(url);
  const driver = new ATDriver({ socket, log });
  await driver.ready;
  abortSignal.then(() => driver.quit());
  return driver;
}

export class ATDriver {
  constructor({ socket, log }) {
    this.socket = socket;
    this.log = log;
    const connected = new Promise((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', err => reject(err));
    });
    this.ready = connected.then(() =>
      this._send({ method: 'session.new', params: { capabilities: {} } }).then(
        ({ result: { capabilities } }) => {
          this._capabilities = capabilities;
        }
      )
    );
    this.hasClosed = false;
    this.closed = new Promise(resolve =>
      socket.once('close', () => {
        this.hasClosed = true;
        this.log(RunnerMessage.AT_DRIVER_COMMS, { direction: 'closed' });
        resolve();
      })
    );
    this._nextId = 0;
  }

  async getCapabilities() {
    await this.ready;
    return this._capabilities;
  }

  async quit() {
    this.log(RunnerMessage.AT_DRIVER_COMMS, { direction: 'close' });
    this.socket.close();
    await this.closed;
  }

  async *_messages() {
    if (this.hasClosed) throw new Error('AT-Driver connection unexpectedly closed');
    for await (const rawMessage of iterateEmitter(this.socket, 'message', 'close', 'error')) {
      const message = rawMessage.toString();
      this.log(RunnerMessage.AT_DRIVER_COMMS, { direction: 'inbound', message });
      yield JSON.parse(message);
    }
  }

  async _send(command) {
    const id = this._nextId++;
    const rawMessage = JSON.stringify({ id, ...command });
    this.log(RunnerMessage.AT_DRIVER_COMMS, { direction: 'outbound', message: rawMessage });
    await new Promise((resolve, reject) => {
      this.socket.send(rawMessage, error => {
        if (error) reject(error);
        else resolve();
      });
    });
    for await (const message of this._messages()) {
      if (message.id === id) {
        if (message.error) {
          throw new Error(message.error);
        }
        return message;
      }
    }
  }

  /**
   * @param  {...(ATKey | ATKeyChord | ATKeySequence)} keys
   */
  async sendKeys(...keys) {
    // the sequence can be like ['UP', ATChord(['SHIFT', 'P'])]
    // the we loop over each "chord" (combo of keys to press) asking the driver
    // to press it, waiting for that keypress to finish, then pressing the next.
    for (const chord of ATKey.sequence(...keys)) {
      await this._send({
        method: 'interaction.pressKeys',
        params: { keys: chord.toAtDriverKeyCodes() },
      });
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

// https://w3c.github.io/webdriver/#keyboard-actions
export const webDriverCodePoints = {
  NULL: '\ue000',
  UNIDENTIFIED: '\ue000',
  CANCEL: '\ue001',
  HELP: '\ue002',
  BACKSPACE: '\ue003',
  TAB: '\ue004',
  CLEAR: '\ue005',
  RETURN: '\ue006',
  ENTER: '\ue007',
  SHIFT: '\ue008',
  CTRL: '\ue009',
  CONTROL: '\ue009',
  ALT: '\ue00a',
  OPT: '\ue00a',
  OPTION: '\ue00a',
  PAUSE: '\ue00b',
  ESC: '\ue00c',
  ESCAPE: '\ue00c',
  SPACE: '\ue00d',
  ' ': '\ue00d',
  PAGE_UP: '\ue00e',
  PAGEUP: '\ue00e',
  PAGE_DOWN: '\ue00f',
  PAGEDOWN: '\ue00f',
  END: '\ue010',
  HOME: '\ue011',
  LEFT: '\ue012',
  ARROWLEFT: '\ue012',
  UP: '\ue013',
  ARROWUP: '\ue013',
  RIGHT: '\ue014',
  ARROWRIGHT: '\ue014',
  DOWN: '\ue015',
  ARROWDOWN: '\ue015',
  INS: '\ue016',
  INSERT: '\ue016',
  DELETE: '\ue017',
  DEL: '\ue017',
  SEMICOLON: '\ue018',
  EQUALS: '\ue019',

  NUMPAD0: '\ue01a',
  NUMPAD1: '\ue01b',
  NUMPAD2: '\ue01c',
  NUMPAD3: '\ue01d',
  NUMPAD4: '\ue01e',
  NUMPAD5: '\ue01f',
  NUMPAD6: '\ue020',
  NUMPAD7: '\ue021',
  NUMPAD8: '\ue022',
  NUMPAD9: '\ue023',
  MULTIPLY: '\ue024',
  ADD: '\ue025',
  SEPARATOR: '\ue026',
  SUBTRACT: '\ue027',
  DECIMAL: '\ue028',
  DIVIDE: '\ue029',

  F1: '\ue031',
  F2: '\ue032',
  F3: '\ue033',
  F4: '\ue034',
  F5: '\ue035',
  F6: '\ue036',
  F7: '\ue037',
  F8: '\ue038',
  F9: '\ue039',
  F10: '\ue03a',
  F11: '\ue03b',
  F12: '\ue03c',

  META: '\ue03d',
  COMMAND: '\ue03d',
  ZENKAKU_HANKAKU: '\ue040',

  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  ZERO: '0',
  COMMA: ',',
};

export class ATKey {
  /**
   * @param {string} key
   */
  constructor(key) {
    this.type = 'key';
    this.key = key;
    this.codePoint = webDriverCodePoints[this.key.toUpperCase()] ?? this.key;
    if (this.codePoint.length > 1) {
      throw new Error(`Unknown key: ${this.key} - should be a single character, or a special key`);
    }
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

  toAtDriverKeyCodes() {
    return this.keys.map(({ codePoint }) => codePoint);
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
