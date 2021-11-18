// import { describe, it, expect } from '@jest/globals';

import test from 'ava';

import { parseJSONChunks, separateJSONChunks, splitJSON } from './json-chunks.js';

test('splitJSON - returns string not containing complete json chunk', t => {
  t.deepEqual(splitJSON(''), { remaining: '' });
  t.deepEqual(splitJSON('{'), { remaining: '{' });
  t.deepEqual(splitJSON('['), { remaining: '[' });
  t.deepEqual(splitJSON('"'), { remaining: '"' });
  t.deepEqual(splitJSON('"{}'), { remaining: '"{}' });
  t.deepEqual(splitJSON('"[]'), { remaining: '"[]' });
  t.deepEqual(splitJSON('"\\"\\"'), { remaining: '"\\"\\"' });
  t.deepEqual(splitJSON('{"key":{}'), { remaining: '{"key":{}' });
  t.deepEqual(splitJSON('{"key":[]'), { remaining: '{"key":[]' });
  t.deepEqual(splitJSON('{"key":""'), { remaining: '{"key":""' });
});

test('splitJSON - returns json chunk split from remaining input', t => {
  const tests = [
    { arguments: ['{}'], returns: { json: '{}', remaining: '', start: 0, end: 2 } },
    { arguments: ['[]'], returns: { json: '[]', remaining: '', start: 0, end: 2 } },
    { arguments: ['""'], returns: { json: '""', remaining: '', start: 0, end: 2 } },
    {
      arguments: ['{"key":{}}'],
      returns: { json: '{"key":{}}', remaining: '', start: 0, end: 10 },
    },
    {
      arguments: ['{"key":[]}'],
      returns: { json: '{"key":[]}', remaining: '', start: 0, end: 10 },
    },
    {
      arguments: ['{"key":""}'],
      returns: { json: '{"key":""}', remaining: '', start: 0, end: 10 },
    },
    { arguments: ['[{}]'], returns: { json: '[{}]', remaining: '', start: 0, end: 4 } },
    { arguments: ['[[]]'], returns: { json: '[[]]', remaining: '', start: 0, end: 4 } },
    { arguments: ['[""]'], returns: { json: '[""]', remaining: '', start: 0, end: 4 } },
    { arguments: ['[{}, {}]'], returns: { json: '[{}, {}]', remaining: '', start: 0, end: 8 } },
    { arguments: ['"{}"'], returns: { json: '"{}"', remaining: '', start: 0, end: 4 } },
    { arguments: ['"[]"'], returns: { json: '"[]"', remaining: '', start: 0, end: 4 } },
    { arguments: ['"\\"\\""'], returns: { json: '"\\"\\""', remaining: '', start: 0, end: 6 } },
  ];

  const alternates = [
    { prefix: '', suffix: '' },
    { prefix: ' ', suffix: '' },
    { prefix: '', suffix: ' ' },
    { prefix: ' ', suffix: ' ' },
    { prefix: '\n', suffix: '' },
    { prefix: '', suffix: '\n' },
    { prefix: '\n', suffix: '\n' },
  ];

  for (let i = 0; i < alternates.length; i++) {
    const { prefix, suffix } = alternates[i];
    for (let j = 0; j < tests.length; j++) {
      const {
        arguments: [text],
        returns: { json, remaining, start, end },
      } = tests[j];
      const testText = `${prefix}${text}${suffix}`;
      t.deepEqual(splitJSON(testText), {
        json,
        remaining: `${remaining}${suffix}`,
        start: start + prefix.length,
        end: end + prefix.length,
      });
    }
  }
});

test('separateJSONChunks - iterates a series of strings into json string chunks', async t => {
  t.deepEqual(await asyncArrayFrom(separateJSONChunks('{}{}{}')), ['{}', '{}', '{}']);
  t.deepEqual(await asyncArrayFrom(separateJSONChunks(['{}{}{}'])), ['{}', '{}', '{}']);
  t.deepEqual(await asyncArrayFrom(separateJSONChunks(['{}', '{}', '{}'])), ['{}', '{}', '{}']);
  t.deepEqual(await asyncArrayFrom(separateJSONChunks(['{', '}', '{', '}', '{', '}'])), [
    '{}',
    '{}',
    '{}',
  ]);
});

test('parseJSONChunks - iterates over a series of json chunks and parses them into objects', async t => {
  t.deepEqual(await asyncArrayFrom(parseJSONChunks(['{}', '{}', '{}'])), [{}, {}, {}]);
});

async function asyncArrayFrom(asyncIterator) {
  const array = [];
  for await (const item of asyncIterator) {
    array.push(item);
  }
  return array;
}
