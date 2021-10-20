/**
 * @module agent
 */

import { iterateEmitter } from '../shared/iterate-emitter.js';

import { createLogger } from './messages.js';

export function forkMiddleware(argv) {
  forkLoggerMiddleware(argv);
  forkTestsMiddleware(argv);
  forkReportMiddleware(argv);
}

export function forkLoggerMiddleware(argv) {
  const logger = createLogger();
  argv.log = logger.log;

  const { send } = argv;
  logger.emitter.on('message', message =>
    send({
      type: 'log',
      data: message,
    })
  );
}

export function forkTestsMiddleware(argv) {
  const { signals } = argv;
  argv.tests = (async function* () {
    for await (const message of iterateEmitter(signals, 'message')) {
      if (message.type === 'task') {
        yield message.data;
      }
    }
  })();
}

export function forkReportMiddleware(argv) {
  const { send } = argv;
  argv.reportResult = async function (result) {
    send({ type: 'result', data: result });
  };
}
