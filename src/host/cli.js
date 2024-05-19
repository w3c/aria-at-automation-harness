/// <reference path="./types.js" />

/**
 * @module host
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import * as readPlanCommand from './cli-read-plan.js';
import * as runPlanCommand from './cli-run-plan.js';

/**
 * @param {object} options
 * @param {import("events").EventEmitter} options.signals
 * @param {function(*): void} [options.send]
 * @param {import("events").EventEmitter} options.stdin
 * @param {import("events").EventEmitter} options.stdout
 * @param {import("events").EventEmitter} options.stderr
 */
export async function createParser({ signals, send, stdin, stdout, stderr }) {
  return /** @type {yargs} */ (await yargs())
    .middleware(argv => {
      argv.signals = signals;
      argv.send = send;
      argv.stdin = stdin;
      argv.stdout = stdout;
      argv.stderr = stderr;
    })
    .command(runPlanCommand)
    .command(readPlanCommand);
}

/**
 * @param {object} options
 * @param {string[]} options.argv
 * @param {import("events").EventEmitter} options.signals
 * @param {function(*): void} [options.send]
 * @param {import("events").EventEmitter} options.stdin
 * @param {import("events").EventEmitter} options.stdout
 * @param {import("events").EventEmitter} options.stderr
 */
export async function parse({ argv = [], ...parserConfiguration }) {
  return (await createParser(parserConfiguration)).parse(hideBin(argv));
}
