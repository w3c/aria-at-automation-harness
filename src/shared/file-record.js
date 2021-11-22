/// <reference path="./file-record-types.js" />

import _fs from 'fs';
import _path from 'path';

import { last } from './array-util';

const host = createHost();

export { host, createHost, isDirectory, isFile };

function isDirectory(record) {
  return Boolean(record && 'entries' in record && record.entries);
}

function isFile(record) {
  return Boolean(record && 'buffer' in record && record.buffer);
}

function createHost({ fs = _fs.promises, path = _path } = {}) {
  /**
   * @param {FileRecord.Record} record
   * @param {string[]} splitPath
   * @param {FileRecord.Record[]} parents
   * @param {FileRecord.Functor} fn
   * @returns {Promise<FileRecord.Record>}
   */
  async function _walk(record, splitPath, parents, fn) {
    const newRecord = await Promise.resolve(fn(record, splitPath, parents)).catch(error => {
      if (error.code === 'ENOENT') {
        return record;
      }
      throw error;
    });

    if (newRecord.entries) {
      const entries = await Promise.all(
        newRecord.entries.map(entry =>
          _walk(entry, [...splitPath, entry.name], [...parents, newRecord], fn)
        )
      );
      return {
        ...newRecord,
        entries,
      };
    }

    return newRecord;
  }

  /**
   * @param {FileRecord.Record} record
   * @param {FileRecord.Functor} fn
   * @returns Promise<FileRecord.Record>
   */
  async function walk(record, fn) {
    return _walk(record, [], [], fn);
  }

  /**
   * Create a function to match paths from a path glob.
   *
   * This function provides a simple conversion from a glob source.
   *
   * If this glob needs to match partial values the glob needs to be written as such. For example if
   * the paths '' (empty string), 'tests', and 'tests/resources', need to be matched together, this
   * could be written ',tests,tests/resources' or ',tests{,resources}'. These partial paths may need
   * to be matched if the glob is used to deeply match a hierarchy, like reading from the filesystem
   * with `read`.
   *
   * - '{' start a set of options and match one of them
   * - '}' end a set of options
   * - ',' separate two options
   * - '/' match a posix or windows path separator
   * - '*' match anything except a path separator
   * - '**' match everything
   *
   * @param {string} glob a fs-like glob to test paths with
   * @returns {function(string): boolean}
   */
  function compileGlob(glob) {
    const expr = new RegExp(
      `^(${glob
        .replace(/(?<=^|[{,])[^{},]+(?=$|[,{}])/g, match =>
          match
            .split(/[\\/]/g)
            .reduce(
              (carry, part) => (carry.length ? [...carry, path.join(last(carry), part)] : [part]),
              []
            )
            .join(',')
        )
        .replace(/\{|\}|,|\.|\/|\*{1,2}/g, match =>
          match === '{'
            ? '('
            : match === '}'
            ? ')'
            : match === ','
            ? '|'
            : match === '.'
            ? '\\.'
            : match === '/'
            ? '[\\\\/]'
            : match === '*'
            ? '[^\\\\/]*'
            : '.*'
        )})$`
    );

    return target => expr.test(target);
  }

  /**
   * @param {string} root
   * @returns {Promise<FileRecord.Record>}
   */
  async function readFS(root) {
    try {
      const names = await fs.readdir(root);
      return { entries: names.map(name => ({ name })) };
    } catch (error) {
      if (error.code === 'ENOTDIR') {
        const buffer = new Uint8Array(await fs.readFile(root));
        return { buffer };
      }

      throw error;
    }
  }

  /**
   * @param {string} root
   * @param {object} [options]
   * @param {string} [options.glob]
   * @returns {Promise<FileRecord.Record>}
   */
  async function read(root, { glob = '**' } = {}) {
    const matchesGlob = compileGlob(glob);
    return walk({}, async (record, splitPath) => {
      const subpath = splitPath.join(path.sep);
      const rawRecord = await readFS(path.join(root, subpath));
      if (isDirectory(rawRecord)) {
        return {
          ...record,
          ...rawRecord,
          entries: rawRecord.entries.filter(({ name }) => matchesGlob(path.join(subpath, name))),
        };
      }
      return { ...record, ...rawRecord };
    });
  }

  /**
   * @param {FileRecord.Record} record
   * @returns {FileRecord.NamedRecord[]}
   */
  function collapse(record) {
    if (record.entries) {
      return record.entries.flatMap(entry => {
        if (entry.entries) {
          return collapse(entry).map(file => ({
            name: path.join(entry.name, file.name),
            buffer: file.buffer,
          }));
        }
        return [entry];
      });
    }
    return [record];
  }

  return {
    read,
    collapse,
    compileGlob,
  };
}
