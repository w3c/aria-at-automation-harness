const FileRecord = {};

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
    throw new Error('Not implemented.');
  },

  /**
   * Collapse a record graph into a flat list of only bufferData records.
   * @memberof FileRecord.Host#
   * @param {FileRecord.Record} record
   * @returns {FileRecord.NamedRecord[]}
   */
  collapse(record) {
    throw new Error('Not implemented.');
  },
};
