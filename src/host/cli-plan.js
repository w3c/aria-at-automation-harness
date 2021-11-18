import path from 'path';
import { Readable } from 'stream';

import { host } from '../shared/file-record.js';
import { recordToMultipartChunks } from '../shared/multipart.js';

import { createHostLogger } from './messages.js';

export const command = 'plan <files..>';

// This cli module's describe is false to hiden the command.
export const describe = false;

export const builder = yargs => {
  return yargs
    .options({
      workingdir: {
        description: 'Directory to read files from',
        default: '.',
        type: 'string',
      },
      protocol: {
        choices: ['fork', 'shell'],
        description: 'Emit test plan through nodejs fork api or stdout shell stream',
        default: 'shell',
        type: 'string',
      },
    })
    .middleware(protocolMiddleware);
};

export async function handler({ workingdir: _workingdir, files, emitRecord }) {
  const workingdir = path.resolve(_workingdir);
  await emitRecord(await host.read(workingdir, { glob: files.join(',') }));
}

/**
 * Build and assign main loop arguments based on passed protocol and other arguments.
 * @param {object} argv
 * @param {string} argv.protocol
 * @param {function(*): void} argv.send
 * @param {EventEmitter} argv.signals
 * @param {WritableStream} argv.stdout
 * @param {WritableStream} argv.stderr
 * @param {*} argv.log
 * @param {*} argv.emitRecord
 */
function protocolMiddleware(argv) {
  switch (argv.protocol) {
    case 'shell':
      planShellMiddleware(argv);
      break;
    case 'fork':
      if (typeof argv.send !== 'function') {
        throw new Error(
          `'fork' protocol may only be used when launched by a nodejs child_process.fork call.`
        );
      }
      planForkMiddleware(argv);
      break;
    default:
      throw new Error(
        `Unknown protocol. Options are 'fork' or 'shell'. Received: ${argv.protocol}`
      );
  }
}

export function planForkMiddleware(argv) {
  planForkLoggerMiddleware(argv);
  planForkEmitMiddleware(argv);
}

export function planForkLoggerMiddleware(argv) {
  const logger = createHostLogger();
  argv.log = logger.log;

  const { send } = argv;
  logger.emitter.on('message', message =>
    send({
      type: 'log',
      data: message,
    })
  );
}

export function planForkEmitMiddleware(argv) {
  const { send } = argv;
  argv.emitRecord = async function (record) {
    send({ type: 'record', data: record });
  };
}

export function planShellMiddleware(argv) {
  planShellLoggerMiddleware(argv);
  planShellEmitMiddleware(argv);
}

export function planShellLoggerMiddleware(argv) {
  const logger = createHostLogger();
  argv.log = logger.log;

  const { stderr } = argv;
  logger.emitter.on('message', ({ text }) => stderr.write(`${text}\n`));
}

export function planShellEmitMiddleware(argv) {
  const { stdout } = argv;
  argv.emitRecord = async function (record) {
    for (const chunk of recordToMultipartChunks(record)) {
      await new Promise(resolve =>
        Readable.from(Buffer.from(chunk)).on('end', resolve).pipe(stdout, { end: false })
      );
    }
  };
}
