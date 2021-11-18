/// <reference path="../shared/file-record-types.js" />

import _path from 'path';

import * as arrayUtil from '../shared/array-util.js';
import * as fileRecord from '../shared/file-record.js';

const [NEWLINE, DASH] = '\n-'.split('').map(c => c.charCodeAt(0));

const NEWLINE_NEWLINE = new Uint8Array([NEWLINE, NEWLINE]);

export function recordToMultipartChunks(record) {
  return partRecordListToMultipart(recordListToPartRecordList(recordToFlatRecordList(record)));
}

export function recordFromMultipartChunks(chunks) {
  return recordFromFlatRecordList(flatRecordsFromMultipartParts(partsFromMultipart(chunks)));
}

/**
 * @param {FileRecord.NamedRecord} record
 * @param {string} relativePath
 */
function* walkRecords(record, relativePath, path = _path.posix) {
  if (record.entries) {
    for (const entry of record.entries) {
      yield* walkRecords(entry, path.join(relativePath, entry.name));
    }
  } else if (record.buffer) {
    yield { name: relativePath, buffer: record.buffer };
  }
}

/**
 *
 * @param {FileRecord.Record} record
 * @param {*} param1
 * @returns {FileRecord.NamedRecord[]}
 */
export function recordToFlatRecordList(record, { path = _path.posix } = {}) {
  return Array.from(walkRecords(record, '.', path));
}

/**
 *
 * @param {FileRecord.NamedRecord[]} recordList
 * @param {*} param1
 * @returns {FileRecord.Record}
 */
export function recordFromFlatRecordList(recordList, { path = _path.posix } = {}) {
  const host = fileRecord.createHost({ path });
  let record = { entries: [] };
  for (const { name, buffer } of recordList) {
    host.insert(record, name, { buffer });
  }
  return record;
}

export async function collectFlatRecords(flatRecordAsyncIterable) {
  const recordList = [];
  for await (const flatRecord of flatRecordAsyncIterable) {
    recordList.push(flatRecord);
  }
  return recordList;
}

export function* recordListToPartRecordList(recordList) {
  for (const { name, buffer } of recordList) {
    yield {
      buffer: new Uint8Array(
        Buffer.concat([
          toBuffer(`content-disposition: file; filename="${encodeURIComponent(name)}"\n`),
          toBuffer('content-type: application/octet-stream\n'),
          toBuffer('content-transfer-encoding: binary\n'),
          toBuffer('\n'),
          toBuffer(buffer),
        ])
      ),
    };
  }
}

/**
 * @param {Iterable<FileRecord.Record>} partRecordList
 * @param {*} util
 * @returns {{boundary: string}}
 */
export function partRecordListToMultipartOptions(
  partRecordList,
  { createBoundary = _createBoundary } = {}
) {
  let boundary = createBoundary();

  let lastBoundary;
  do {
    const boundaryBuffer = toBuffer(`\n--${boundary}`);

    lastBoundary = boundary;

    for (const { buffer } of partRecordList) {
      if (indexOfBoundary(buffer, boundaryBuffer) > -1) {
        boundary = createBoundary();
        break;
      }
    }
  } while (lastBoundary !== boundary);

  return { boundary };
}

function _createBoundary() {
  return Array.from({ length: 32 }, () => (Math.random() * 36).toString(36).substring(0, 1)).join(
    ''
  );
}

/**
 * @param {Uint8Array} buffer
 * @param {Uint8Array} boundary
 * @returns {number}
 */
function indexOfBoundary(buffer, boundary) {
  for (let i = 0; i < buffer.length - (boundary.length - 1); i++) {
    let j = 0;
    for (; j < boundary.length && buffer[i + j] === boundary[j]; j++) {}
    if (j === boundary.length) {
      return i;
    }
  }
  return -1;
}

/**
 * @param {Iterable<FileRecord.Record>} partRecordList
 * @returns {Generator<Uint8Array>}
 */
export function* partRecordListToMultipart(partRecordList, options) {
  if (!options) {
    partRecordList = Array.from(partRecordList);
    options = partRecordListToMultipartOptions(partRecordList);
  }
  const { boundary } = options;

  const boundaryBuffer = toBuffer(`\n--${boundary}`);

  yield toBuffer(`content-type: multipart/mixed; boundary=${boundary}\n`);
  yield boundaryBuffer;

  for (const { buffer } of partRecordList) {
    yield toBuffer('\n');
    yield buffer;
    yield boundaryBuffer;
  }

  yield toBuffer(`--\n`);
}

function toBuffer(str) {
  return new Uint8Array(Buffer.from(str));
}

/**
 * @param {AsyncIterable<Uint8Array>} _byteStream
 * @returns {AsyncGenerator<AsyncIterable<Uint8Array>>}
 */
export async function* multipartStreams(_byteStream) {
  const byteStream = _byteStream[Symbol.asyncIterator]();

  try {
    let open = true;
    let carry = new Uint8Array(0);
    while (open) {
      yield (async function* () {
        let findingEnd = true;
        let boundaryBuffer = null;
        while (boundaryBuffer === null) {
          const next = await byteStream.next();
          if (next.done) {
            open = false;
            return;
          }
          carry = new Uint8Array(Buffer.concat([carry, next.value]));

          for (const { name, value } of httpHeaders(carry)) {
            if (name === 'content-type') {
              for (const { key: paramKey, value: paramValue } of httpHeaderParams(value)) {
                if (paramKey === 'boundary') {
                  boundaryBuffer = toBuffer(`\n--${paramValue}--\n`);
                  break;
                }
              }
            }

            if (boundaryBuffer !== null) {
              break;
            }
          }
        }

        do {
          const index = indexOfBoundary(carry, boundaryBuffer);
          if (index > -1) {
            const buffer = carry.slice(0, index + boundaryBuffer.length);
            carry = carry.slice(index + boundaryBuffer.length);
            yield buffer;
            findingEnd = false;
            break;
          } else if (carry.length > boundaryBuffer.length) {
            const buffer = carry.slice(0, carry.length - boundaryBuffer.length);
            carry = carry.slice(carry.length - boundaryBuffer.length);
            yield buffer;
          }

          const next = await byteStream.next();
          if (next.done) {
            open = false;
            return;
          }
          carry = new Uint8Array(Buffer.concat([carry, next.value]));
        } while (findingEnd);
      })();
    }
  } catch (error) {
    if (byteStream.throw) {
      await byteStream.throw(error);
    }
  } finally {
    if (byteStream.return) {
      await byteStream.return();
    }
  }
}

/**
 * @param {AsyncIterable<Uint8Array>} byteStream
 * @returns {AsyncGenerator<Uint8Array>}
 */
export async function* partsFromMultipart(byteStream) {
  let boundaryBuffer = null;
  let headersRead = false;
  let carry = new Uint8Array(0);
  for await (const chunk of byteStream) {
    carry = toBuffer(Buffer.concat([carry, chunk]));

    if (!headersRead) {
      if (boundaryBuffer === null) {
        for (const { name, value } of httpHeaders(carry)) {
          if (name === 'content-type') {
            for (const { key: paramKey, value: paramValue } of httpHeaderParams(value)) {
              if (paramKey === 'boundary') {
                boundaryBuffer = toBuffer('\n--' + paramValue);
                break;
              }
            }
          }
          if (boundaryBuffer !== null) {
            break;
          }
        }
      }

      if (boundaryBuffer === null) {
        if (indexOfBoundary(carry, NEWLINE_NEWLINE) > -1) {
          throw new Error('boundary not defined');
        }
      } else {
        const { before, remaining } = splitMultipartBoundary(carry, boundaryBuffer);
        if (before) {
          carry = remaining;
          headersRead = true;
        }
      }
    }
    if (headersRead) {
      let { before, remaining } = splitMultipartBoundary(carry, boundaryBuffer);
      while (before) {
        if (before.length > 0 && before[0] === NEWLINE) {
          before = before.slice(1);
        }
        yield before;

        carry = remaining;
        ({ before, remaining } = splitMultipartBoundary(carry, boundaryBuffer));
      }
      if (carry.length > 1 && carry[0] === DASH && carry[1] === DASH) {
        break;
      }
    }
  }

  function splitMultipartBoundary(buffer, boundaryBuffer) {
    const index = indexOfBoundary(buffer, boundaryBuffer);
    if (index > -1) {
      return {
        before: buffer.slice(0, index),
        remaining: buffer.slice(index + boundaryBuffer.length),
      };
    }
    return { remaining: buffer };
  }
}

/**
 * @param {Uint8Array} buffer
 * @returns {Generator<{name: string, value: string}>}
 */
function* httpHeaders(buffer) {
  let lastIndex = 0;
  let emptyLine = false;
  let lineIndex = 0;
  do {
    const index = buffer.indexOf(NEWLINE, lastIndex);
    if (index > -1) {
      emptyLine = index === lastIndex;
      if (!emptyLine) {
        const line = Buffer.from(buffer.slice(lastIndex, index)).toString();
        const colonIndex = line.indexOf(':');
        const name = line.substring(0, colonIndex).toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        yield { name, value };
      }
      if (lineIndex++ > 100) {
        throw new Error(`too many headers ${index} ${lastIndex}`);
      }
      lastIndex = index + 1;
    } else {
      break;
    }
  } while (!emptyLine);
}

/**
 * @param {string} headerValue
 */
function* httpHeaderParams(headerValue) {
  const paramSplit = headerValue.split(';');
  for (const param of paramSplit.slice(1)) {
    const [rawKey, rawValue] = param.split('=');

    const key = rawKey.trim();
    const value = decodeURIComponent(trimQuotes(rawValue.trim()));
    yield { key, value };
  }
}

/**
 * @param {string} value
 */
function trimQuotes(value) {
  if (value[0] === '"') {
    value = value.substring(1);
  }
  if (arrayUtil.last(value) === '"') {
    value = value.substring(0, value.length - 1);
  }
  return value;
}

/**
 * @param {AsyncIterable<Uint8Array>} multipartParts
 * @returns {AsyncGenerator<FileRecord.NamedRecord>}
 */
export async function* flatRecordsFromMultipartParts(multipartParts) {
  for await (const partBuffer of multipartParts) {
    let filename = null;

    const { headers, body: buffer } = splitHeadersBody(partBuffer);

    for (const { name, value } of httpHeaders(headers)) {
      if (name === 'content-disposition') {
        for (const { key: paramKey, value: paramValue } of httpHeaderParams(value)) {
          if (paramKey === 'filename') {
            filename = paramValue;
          }
        }
      }
    }

    yield {
      name: filename,
      buffer,
    };
  }

  /**
   * @param {Uint8Array} buffer
   * @returns {{headers: Uint8Array, body: Uint8Array}}
   */
  function splitHeadersBody(buffer) {
    const headerEndIndex = indexOfBoundary(buffer, NEWLINE_NEWLINE);

    if (headerEndIndex === -1) {
      throw new Error('incomplete headers');
    }

    const headers = buffer.slice(0, headerEndIndex);
    const body = buffer.slice(headerEndIndex + 2);
    return { headers, body };
  }
}
