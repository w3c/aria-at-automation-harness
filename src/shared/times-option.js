/// <reference path="./types.js" />

/**
 * @module shared
 */

/**
 * @type AriaATCIShared.timesOption
 */
const timesDefaults = {
  afterNav: 1000,
  afterKeys: 5000,
  testSetup: 1000,
  modeSwitch: 750,
  docReady: 2000,
};

/**
 * Create a yargs description for the specified timesOption.
 * @param {keyof AriaATCIShared.timesOption} optionName Key from timesOption
 * @param {string} argName The text used for the argument (without leading --)
 * @param {string} describe Description to be used in --show-help
 */
function addOptionConfig(optionName, argName, describe) {
  timesOptionsArgNameMap.set(optionName, argName);
  timesOptionsConfig[argName] = {
    hidden: true,
    default: timesDefaults[optionName],
    describe,
    coerce(arg) {
      const isNumber = typeof arg === 'number';
      if (!isNumber && !arg.match(/^\d+$/)) {
        throw new Error('option value not a number');
      }
      const time = isNumber ? arg : parseInt(arg, 10);
      if (time <= 0) {
        throw new Error('time must be positive and non-zero');
      }
      return time;
    },
  };
}

/**
 * @type Map<keyof AriaATCIShared.timesOption, string>
 */
const timesOptionsArgNameMap = new Map();

/**
 * the yargs configuration for the time options
 */
export const timesOptionsConfig = {};
addOptionConfig(
  'afterNav',
  'time-after-nav',
  'Timeout used after navigation to collect and discard speech.'
);
addOptionConfig(
  'afterKeys',
  'time-after-keys',
  'Timeout used to wait for speech to finish after pressing keys.'
);
addOptionConfig(
  'testSetup',
  'time-test-setup',
  'Timeout used after pressing test setup button to collect and discard speech.'
);
addOptionConfig(
  'modeSwitch',
  'time-mode-switch',
  'Timeout used after switching modes to check resulting speech (NVDA).'
);
addOptionConfig('docReady', 'time-doc-ready', 'Timeout used waiting for document ready (Safari).');

/**
 * Convert the times dictionary to an array of strings to pass back to args.
 * @param {AriaATCIShared.timesOption} opts
 * @returns {string[]}
 */
export function timesArgs(opts) {
  const args = [];
  for (const key of Object.keys(opts)) {
    const value = opts[key];
    // no need to pass on "default" value
    if (value == timesDefaults[key]) continue;
    // casting in jsdoc syntax is complicated - the extra () around key are
    // required to make the type annotation work.
    const argName = timesOptionsArgNameMap.get(/** @type keyof AriaATCIShared.timesOption */ (key));
    args.push('--' + argName);
    args.push(String(value));
  }
  return args;
}

/**
 * Convert the arguments parse result into a timesOption object.
 * @param {any} args The parsed arguments
 * @returns {AriaATCIShared.timesOption}
 */
export function getTimesOption(args) {
  const result = { ...timesDefaults };
  for (const key in result) {
    const mapped = timesOptionsArgNameMap.get(/** @type keyof AriaATCIShared.timesOption */ (key));
    if (mapped) {
      if (args[mapped]) result[key] = args[mapped];
    }
  }
  return result;
}
