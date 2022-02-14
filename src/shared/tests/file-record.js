import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import test from 'ava';

import * as fileRecord from '../file-record.js';

test('isDirectory', t => {
  t.plan(6);
  t.true(fileRecord.isDirectory({ entries: [] }));
  t.true(fileRecord.isDirectory({ name: 'folder', entries: [] }));
  t.true(fileRecord.isDirectory({ entries: [{ bufferData: new Uint8Array(16) }] }));
  t.true(
    fileRecord.isDirectory({
      name: 'folder',
      entries: [{ name: 'file', bufferData: new Uint8Array(16) }],
    })
  );
  t.false(fileRecord.isDirectory({ bufferData: new Uint8Array(16) }));
  t.false(fileRecord.isDirectory({ name: 'file', bufferData: new Uint8Array(16) }));
});
test('isFile', t => {
  t.plan(6);
  t.true(fileRecord.isFile({ bufferData: new Uint8Array(16) }));
  t.true(fileRecord.isFile({ name: 'file', bufferData: new Uint8Array(16) }));
  t.false(fileRecord.isFile({ entries: [] }));
  t.false(fileRecord.isFile({ name: 'folder', entries: [] }));
  t.false(fileRecord.isFile({ entries: [{ bufferData: new Uint8Array(16) }] }));
  t.false(
    fileRecord.isFile({
      name: 'folder',
      entries: [{ name: 'file', bufferData: new Uint8Array(16) }],
    })
  );
});
test('createHost', t => {
  t.plan(10);
  function assertImplementsHost(actualHost) {
    t.is(typeof actualHost.read, 'function');
    t.is(typeof actualHost.collapse, 'function');
  }
  assertImplementsHost(fileRecord.host);
  assertImplementsHost(fileRecord.createHost());
  assertImplementsHost(fileRecord.createHost({ fs: fs.promises, path: path }));
  assertImplementsHost(fileRecord.createHost({ fs: { async readdir() {}, async readFile() {} } }));
  assertImplementsHost(fileRecord.createHost({ path: { sep: '/', join() {} }, path: path.posix }));
});
test('Host.read', async t => {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  t.snapshot(
    normalizeFileRecord(await fileRecord.host.read(`${dirname}/fixtures/file-record/read1`))
  );
  t.snapshot(
    normalizeFileRecord(await fileRecord.host.read(`${dirname}/fixtures/file-record/read2`))
  );
  t.snapshot(
    normalizeFileRecord(await fileRecord.host.read(`${dirname}/fixtures/file-record/read3`))
  );
});
test('Host.collapse', async t => {
  // Create a host with determinstic path methods. Expected values contain a posix path separator.
  const posixHost = fileRecord.createHost({ path: path.posix });
  t.deepEqual(posixHost.collapse({ bufferData: new Uint8Array(16) }), [
    { bufferData: new Uint8Array(16) },
  ]);
  t.deepEqual(posixHost.collapse({ name: 'file', bufferData: new Uint8Array(16) }), [
    { name: 'file', bufferData: new Uint8Array(16) },
  ]);
  t.deepEqual(posixHost.collapse({ entries: [] }), []);
  t.deepEqual(posixHost.collapse({ entries: [{ name: 'file', bufferData: new Uint8Array(16) }] }), [
    { name: 'file', bufferData: new Uint8Array(16) },
  ]);
  t.deepEqual(
    posixHost.collapse({
      name: 'folder',
      entries: [{ name: 'file', bufferData: new Uint8Array(16) }],
    }),
    [{ name: 'file', bufferData: new Uint8Array(16) }]
  );
  t.deepEqual(
    posixHost.collapse({
      entries: [{ name: 'folder', entries: [{ name: 'file', bufferData: new Uint8Array(16) }] }],
    }),
    [{ name: 'folder/file', bufferData: new Uint8Array(16) }]
  );
  t.deepEqual(
    posixHost.collapse({
      entries: [
        {
          name: 'level1',
          entries: [
            { name: '16bytes', bufferData: new Uint8Array(16) },
            { name: 'level2', entries: [{ name: '8bytes', bufferData: new Uint8Array(8) }] },
          ],
        },
      ],
    }),
    [
      { name: 'level1/16bytes', bufferData: new Uint8Array(16) },
      { name: 'level1/level2/8bytes', bufferData: new Uint8Array(8) },
    ]
  );
});

/**
 * Normalize differences in files between operating system environments.
 * @param {FileRecord.Record} record
 * @returns {FileRecord.Record}
 */
function normalizeFileRecord(record, coders = textCoders()) {
  if (record.entries) {
    return { ...record, entries: record.entries.map(entry => normalizeFileRecord(entry, coders)) };
  } else if (isTextFile(record)) {
    return normalizeTextRecordEOL(record, coders);
  }
  return record;
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isTextFile(filePath) {
  return /\.(?:html|js|json|txt)$/.test(filePath);
}

/**
 * Replace CRLF line ending sequence with LF line ending sequence.
 * @param {FileRecord.NamedRecord} file
 * @param {object} [coders]
 * @param {TextEncoder} coders.textEncoder
 * @param {TextDecoder} coders.textDecoder
 * @returns {FileRecord.NamedRecord}
 */
function normalizeTextRecordEOL(file, { textEncoder, textDecoder } = textCoders()) {
  return {
    ...file,
    bufferData: textEncoder.encode(textDecoder.decode(file.bufferData).replace('\r\n', '\n')),
  };
}

/**
 * @returns {{textEncoder: TextEncoder, textDecoder: TextDecoder}}
 */
function textCoders() {
  return { textEncoder: new TextEncoder(), textDecoder: new TextDecoder() };
}
