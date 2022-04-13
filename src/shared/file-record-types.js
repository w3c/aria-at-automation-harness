/**
 * @namespace FileRecord
 */
const FileRecord = {};

/**
 * @interface
 * @memberof FileRecord
 */
FileRecord.Host = {
  /**
   * Recursively read items from a file system starting from root.
   * @memberof FileRecord.Host#
   * @param {string} root file system root path to start reading from
   * @param {object} [options]
   * @param {string} [options.glob] a glob pattern to filter what is read
   * @returns {Promise<FileRecord.Record>} a graph of directories and files read
   */
  async read(root, options) {
    return null;
  },

  /**
   * Collapse a record graph into a flat list of only bufferData records.
   * @memberof FileRecord.Host#
   * @param {FileRecord.Record} record
   * @returns {FileRecord.NamedRecord[]}
   */
  collapse(record) {},
};

/**
 * @typedef FileRecord.Record
 * @property {FileRecord.NamedRecord[] | null} [entries] an array of NamedRecords or null if it should be removed
 * @property {Uint8Array | null} [bufferData] a Uint8Array or null if it should be removed
 */

/**
 * @typedef FileRecord.NamedRecord
 * @property {string} name
 * @property {FileRecord.NamedRecord[] | null} [entries] an array of FileRecord.NamedRecord or null if it should be removed
 * @property {Uint8Array | null} [bufferData] a Uint8Array or null if it should be removed
 */

/**
 * @typedef {function(FileRecord.Record, string[], FileRecord.Record[]): PromiseLike<FileRecord.Record> | FileRecord.Record} FileRecord.Functor
 */
