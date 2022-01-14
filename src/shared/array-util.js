/**
 * @module shared
 */

/**
 * Replace oldValue with newValue if the array contains oldValue.
 * @param {T[]} array
 * @param {T} oldValue
 * @param {T} newValue
 * @returns {T[]}
 * @template T
 */
export function replace(array, oldValue, newValue) {
  const index = array.indexOf(oldValue);
  if (index > -1) {
    return [...array.slice(0, index), newValue, ...array.slice(index + 1)];
  }
  return array.slice();
}

/**
 * Get the last item in an array.
 * @param {T[]} array
 * @returns {T | undefined}
 * @template T
 */
export function last(array) {
  return array[array.length - 1];
}
