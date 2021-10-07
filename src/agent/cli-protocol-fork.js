/**
 * @module agent
 */

import { iterateEmitter } from '../shared/iterate-emitter';

import { createLogger } from './messages';

export function forkMiddleware(argv) {
  forkLoggerMiddleware(argv);
  forkTestsMiddleware(argv);
  forkReportMiddleware(argv);
}

export function forkLoggerMiddleware(argv) {
  const logger = createLogger();
  argv.log = logger.log;

  const { postMessage } = argv;
  logger.emitter.on('message', message =>
    postMessage({
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
  const { postMessage } = argv;
  argv.reportResult = async function (result) {
    postMessage({ type: 'result', data: result });
  };
}
