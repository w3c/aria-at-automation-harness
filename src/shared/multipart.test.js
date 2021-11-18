import test from 'ava';

import {
  recordToFlatRecordList,
  recordListToPartRecordList,
  partRecordListToMultipartOptions,
  partRecordListToMultipart,
  partsFromMultipart,
  flatRecordsFromMultipartParts,
} from './multipart.js';

test('recordToFlatRecordList - flatten a FileRecord to a list of NamedRecords', t => {
  t.deepEqual(recordToFlatRecordList({}), []);
  t.deepEqual(recordToFlatRecordList({ buffer: new Uint8Array(0) }), [
    { name: '.', buffer: new Uint8Array(0) },
  ]);
  t.deepEqual(recordToFlatRecordList({ entries: [] }), []);
  t.deepEqual(
    recordToFlatRecordList({ entries: [{ name: 'file.txt', buffer: new Uint8Array(0) }] }),
    [{ name: 'file.txt', buffer: new Uint8Array(0) }]
  );
  t.deepEqual(
    recordToFlatRecordList({
      entries: [
        { name: 'a.txt', buffer: new Uint8Array(0) },
        { name: 'b.txt', buffer: new Uint8Array(0) },
      ],
    }),
    [
      { name: 'a.txt', buffer: new Uint8Array(0) },
      { name: 'b.txt', buffer: new Uint8Array(0) },
    ]
  );
  t.deepEqual(
    recordToFlatRecordList({
      entries: [
        { name: 'a', entries: [{ name: 'c.txt', buffer: new Uint8Array(0) }] },
        { name: 'b', entries: [{ name: 'd.txt', buffer: new Uint8Array(0) }] },
      ],
    }),
    [
      { name: 'a/c.txt', buffer: new Uint8Array(0) },
      { name: 'b/d.txt', buffer: new Uint8Array(0) },
    ]
  );
});

test('partRecordListToMultipartOptions - create options like boundary that does not appear in records', t => {
  const boundaries = ['abcd1234', 'efgh5678'];
  const createBoundaryFactory = () => {
    let i = 0;
    return function () {
      if (i < boundaries.length) {
        return boundaries[i++];
      }
      throw new Error('exhausted boundaries');
    };
  };

  t.deepEqual(
    partRecordListToMultipartOptions([{ buffer: toBuffer('') }], {
      createBoundary: createBoundaryFactory(),
    }),
    { boundary: boundaries[0] }
  );
  t.deepEqual(
    partRecordListToMultipartOptions([{ buffer: toBuffer('abcd1234') }], {
      createBoundary: createBoundaryFactory(),
    }),
    { boundary: boundaries[0] }
  );
  t.deepEqual(
    partRecordListToMultipartOptions([{ buffer: toBuffer('\n--abcd1234') }], {
      createBoundary: createBoundaryFactory(),
    }),
    { boundary: boundaries[1] }
  );
});

test('encode to decode', async t => {
  const toMultipart = recordList => {
    return partRecordListToMultipart(recordListToPartRecordList(recordList));
  };
  const fromMultipart = async byteStream => {
    return await asyncArrayFrom(flatRecordsFromMultipartParts(partsFromMultipart(byteStream)));
  };
  t.deepEqual(
    await fromMultipart(toMultipart([{ name: 'a.txt', buffer: toBuffer('file content') }])),
    [{ name: 'a.txt', buffer: toBuffer('file content') }]
  );
  t.deepEqual(
    await fromMultipart(
      toMultipart([
        { name: 'a/b.txt', buffer: toBuffer('file content') },
        { name: 'c/d.txt', buffer: toBuffer('file content') },
      ])
    ),
    [
      { name: 'a/b.txt', buffer: toBuffer('file content') },
      { name: 'c/d.txt', buffer: toBuffer('file content') },
    ]
  );
});

function toBuffer(value) {
  return new Uint8Array(Buffer.from(value));
}

async function asyncArrayFrom(asyncIterator) {
  const array = [];
  for await (const item of asyncIterator) {
    array.push(item);
  }
  return array;
}
