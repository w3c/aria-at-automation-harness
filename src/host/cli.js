/// <reference path="./types.js" />

/**
 * @module agent
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import * as fsCommand from './cli-plan.js';
import * as mainCommand from './cli-main.js';

export async function createParser({ signals, send, stdin, stdout, stderr }) {
  return /** @type {yargs} */ (await yargs())
    .middleware(argv => {
      argv.signals = signals;
      argv.send = send;
      argv.stdin = stdin;
      argv.stdout = stdout;
      argv.stderr = stderr;
    })
    .command(mainCommand)
    .command(fsCommand);
}

export async function parse({ argv = [], ...parserConfiguration } = {}) {
  return (await createParser(parserConfiguration)).parse(hideBin(argv));
}
