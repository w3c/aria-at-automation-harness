import test from 'ava';

import * as arrayUtil from '../array-util.js';

test('replace', t => {
  t.plan(7);
  const value = {};
  const value2 = {};
  const value3 = {};
  const oldValue = {};
  const newValue = {};
  t.deepEqual(arrayUtil.replace([], oldValue, newValue), []);
  t.deepEqual(arrayUtil.replace([oldValue], oldValue, newValue), [newValue]);
  t.deepEqual(arrayUtil.replace([value, value2, value3], oldValue, newValue), [
    value,
    value2,
    value3,
  ]);
  t.deepEqual(arrayUtil.replace([oldValue, value, value2, value3], oldValue, newValue), [
    newValue,
    value,
    value2,
    value3,
  ]);
  t.deepEqual(arrayUtil.replace([value, oldValue, value2, value3], oldValue, newValue), [
    value,
    newValue,
    value2,
    value3,
  ]);
  t.deepEqual(arrayUtil.replace([value, value2, oldValue, value3], oldValue, newValue), [
    value,
    value2,
    newValue,
    value3,
  ]);
  t.deepEqual(arrayUtil.replace([value, value2, value3, oldValue], oldValue, newValue), [
    value,
    value2,
    value3,
    newValue,
  ]);
});

test('last', t => {
  t.plan(4);
  t.deepEqual(arrayUtil.last([]), undefined);
  t.deepEqual(arrayUtil.last([1, 2, 3]), 3);
  t.deepEqual(arrayUtil.last([1, 2, 3, 4, 5]), 5);
  t.deepEqual(arrayUtil.last([5, 4, 3, 2, 1]), 1);
});
