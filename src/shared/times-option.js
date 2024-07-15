/// <reference path="./types.js" />

/**
 * @module shared
 */

/**
 * @type AriaATCIShared.timesOption
 */
export const timesOption = {
  afterNav: 1000,
  afterKeys: 5000,
  testSetup: 1000,
  modeSwitch: 750,
  docReady: 2000,
};

const timesDefaults = { ...timesOption };

/**
 * Convert the times dictionary to a string to pass to args printout.
 * @param {AriaATCIShared.timesOption} opts
 * @returns String
 */
export function timesArgs(opts = timesOption) {
  return Object.entries(opts)
    .map(([key, value]) => `${key}:${value}`)
    .join(',');
}

/**
 * the yargs setup for the times option
 */
export const timesOptionDescription = {
  // hidden by default because it's a really long one
  hidden: true,
  default: timesArgs(timesDefaults),
  describe: 'Configure timeout and delays',
  coerce(arg) {
    if (!arg) return;
    const parts = arg.split(/,/g);
    for (const part of parts) {
      const match = part.match(/^([^:]+):(\d+)$/);
      if (!match) {
        throw new Error(`Error parsing times "${part}"`);
      }
      if (!timesOption[match[1]]) {
        throw new Error(`Unknown times param "${match[1]}"`);
      }
      timesOption[match[1]] = parseInt(match[2], 10);
    }
  },
};
