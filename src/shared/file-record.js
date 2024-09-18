// @ts-nocheck

/**
 * @module shared
 */

import _fs from 'fs';
import _path from 'path';

import { compileGlob } from './file-glob.js';

/**
 * @param {FileRecord.Record} record
 * @returns {boolean} record represents a directory
 */
export function isDirectory(record) {
  return Boolean(record && 'entries' in record && record.entries);
}

/**
 * @param {FileRecord.Record} record
 * @returns {boolean} record represents a file
 */
export function isFile(record) {
  return Boolean(record && 'bufferData' in record && record.bufferData);
}

/**
 * Create a host to read records from a file system.
 *
 * @param {object} [options]
 * @param {_fs.promises} [options.fs]
 * @param {_path} [options.path]
 * @returns {FileRecord.Host}
 */
export function createHost({ fs = _fs.promises, path = _path } = {}) {
  const host = new FileSystemHost({ fs, path });

  /** @type {FileRecord.Host} */
  return {
    read: host.read.bind(host),
    collapse: host.collapse.bind(host),
  };
}

/**
 * @implements {FileRecord.Host}
 */
class FileSystemHost {
  /**
   * Create a new host for reading from a file system.
   * @param {object} options
   * @param {_fs.promises} options.fs
   * @param {_path} options.path
   */
  constructor({ fs, path }) {
    /** @type {_fs.promises} */
    this.fs = fs;

    /** @type {_path} */
    this.path = path;
  }

  /**
   * @param {FileRecord.Record} record
   * @param {string[]} splitPath
   * @param {FileRecord.Record[]} parents
   * @param {FileRecord.Functor} fn
   * @returns {Promise<FileRecord.Record>}
   */
  async _walk(record, splitPath, parents, fn) {
    const newRecord = await Promise.resolve(fn(record, splitPath, parents)).catch(error => {
      if (error.code === 'ENOENT') {
        return record;
      }
      throw error;
    });

    if (newRecord.entries) {
      const entries = await Promise.all(
        newRecord.entries.map(entry =>
          this._walk(entry, [...splitPath, entry.name], [...parents, newRecord], fn)
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
  async walk(record, fn) {
    return this._walk(record, [], [], fn);
  }

  /**
   * @param {string} root
   * @returns {Promise<FileRecord.Record>}
   */
  async readFS(root) {
    try {
      const names = (await this.fs.readdir(root)).sort();
      return { entries: names.map(name => ({ name })) };
    } catch (error) {
      if (error.code === 'ENOTDIR') {
        const bufferData = new Uint8Array(await this.fs.readFile(root));
        return { bufferData };
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
  async read(root, { glob = '**' } = {}) {
    const matchesGlob = compileGlob(glob);
    return this.walk({}, async (record, splitPath) => {
      const subpath = splitPath.join(this.path.sep);
      const rawRecord = await this.readFS(this.path.join(root, subpath));
      if (isDirectory(rawRecord)) {
        const entries = [];
        for (const { name } of rawRecord.entries) {
          const path = this.path.join(subpath, name);
          try {
            const stat = await this.fs.stat(this.path.join(root, path));
            if (matchesGlob(path, stat.isDirectory())) {
              entries.push({ name });
            }
          } catch (error) {
            console.error(`Error reading filesystem ${this.path.join(root, path)}: ${error}`);
            throw error;
          }
        }
        return {
          ...record,
          ...rawRecord,
          entries,
        };
      }
      return { ...record, ...rawRecord };
    });
  }

  /**
   * @param {FileRecord.Record} record
   * @returns {FileRecord.NamedRecord[]}
   */
  collapse(record) {
    if (record.entries) {
      return record.entries.flatMap(entry => {
        if (entry.entries) {
          return this.collapse(entry).map(
            file =>
              /** @type {FileRecord.NamedRecord} */ ({
                name: this.path.join(entry.name, file.name),
                bufferData: file.bufferData,
              })
          );
        }
        return [entry];
      });
    }
    return [record];
  }
}

/** @type {FileRecord.Host} */
export const host = createHost();
