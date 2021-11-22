/**
 * @module shared
 */

export function replace(array, oldValue, newValue) {
  const index = array.indexOf(oldValue);
  if (index > -1) {
    return [...array.slice(0, index), newValue, ...array.slice(index + 1)];
  }
  return array.slice();
}

export function last(array) {
  return array[array.length - 1];
}
