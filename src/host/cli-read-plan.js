/**
 * @module host
 */

import path from 'path';

import { host } from '../shared/file-record.js';

import { createHostLogger } from './messages.js';

export const command = 'read-plan <files..>';

// This cli module's describe is false to hide the command.
export const describe = false;

export const builder = yargs => {
  return yargs
    .options({
      workingdir: {
        description: 'Directory to read files from',
        default: '.',
        type: 'string',
      },
    })
    .middleware(planLoggerMiddleware)
    .middleware(planEmitMiddleware);
};

export async function handler({ workingdir: _workingdir, files, emitRecord }) {
  const workingdir = path.resolve(_workingdir);
  await emitRecord(await host.read(workingdir, { glob: files.join(',') }));
}

/**
 * Build utilities for logging in this command.
 * @param {object} argv
 * @param {function(*): void} argv.send
 * @param {*} argv.log
 */
export function planLoggerMiddleware(argv) {
  const logger = createHostLogger();
  argv.log = logger.log;

  const { send } = argv;
  logger.emitter.on(
    'message',
    message => (
      console.log(message),
      send({
        type: 'log',
        data: message,
      })
    )
  );
}

/**
 * Build handle to emit a record.
 * @param {object} argv
 * @param {function(*): void} argv.send
 * @param {*} argv.emitRecord
 */
export function planEmitMiddleware(argv) {
  const { send } = argv;
  argv.emitRecord = async function (record) {
    console.warn(record);
    send({ type: 'record', data: record });
  };
}
