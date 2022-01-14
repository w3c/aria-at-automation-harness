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
  t.snapshot(await fileRecord.host.read(`${dirname}/fixtures/file-record/read1`));
  t.snapshot(await fileRecord.host.read(`${dirname}/fixtures/file-record/read2`));
  t.snapshot(await fileRecord.host.read(`${dirname}/fixtures/file-record/read3`));
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
  t.deepEqual(
    fileRecord.host.collapse({ entries: [{ name: 'file', bufferData: new Uint8Array(16) }] }),
    [{ name: 'file', bufferData: new Uint8Array(16) }]
  );
  t.deepEqual(
    fileRecord.host.collapse({
      name: 'folder',
      entries: [{ name: 'file', bufferData: new Uint8Array(16) }],
    }),
    [{ name: 'file', bufferData: new Uint8Array(16) }]
  );
  t.deepEqual(
    fileRecord.host.collapse({
      entries: [{ name: 'folder', entries: [{ name: 'file', bufferData: new Uint8Array(16) }] }],
    }),
    [{ name: 'folder/file', bufferData: new Uint8Array(16) }]
  );
  t.deepEqual(
    fileRecord.host.collapse({
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
