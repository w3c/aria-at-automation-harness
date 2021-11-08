/**
 * @module agent
 */

import { Readable } from 'stream';

import { parseJSONChunks, separateJSONChunks } from '../shared/json-chunks.js';
import { iterateEmitter } from '../shared/iterate-emitter.js';

import { createLogger } from './messages.js';

export function shellMiddleware(argv) {
  shellLoggerMiddleware(argv);
  shellTestsMiddleware(argv);
  shellReportMiddleware(argv);
  shellInterruptMiddleware(argv);
}

export function shellLoggerMiddleware(argv) {
  const logger = createLogger();
  argv.log = logger.log;

  const { stderr } = argv;
  logger.emitter.on('message', ({ text }) => stderr.write(`${text}\n`));
}

export function shellTestsMiddleware(argv) {
  const { stdin } = argv;
  argv.tests = parseJSONChunks(separateJSONChunks(iterateEmitter(stdin, 'data', 'end', 'error')));
}

export function shellReportMiddleware(argv) {
  const { stdout } = argv;
  argv.reportResult = async function (result) {
    await new Promise(resolve =>
      Readable.from(JSON.stringify(result)).on('end', resolve).pipe(stdout, { end: false })
    );
  };
}

export function shellInterruptMiddleware(argv) {
  const { signals, stdin } = argv;
  signals.once('SIGINT', () => stdin.emit('end'));
}
