import { last } from './array-util.js';

/**
 * @module shared
 */

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
export function compileGlob(glob) {
  const expr = new RegExp(
    `^(${glob
      .replace(/(?<=^|[{,])[^{},]+(?=$|[,{}])/g, match =>
        match
          .split(/[\\/]/g)
          .reduce(
            (carry, part) =>
              carry.length ? [...carry, `${last(carry)}/`, `${last(carry)}/${part}`] : [part],
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
          ? '[^\\\\/]+'
          : '.*'
      )})$`
  );

  return target => expr.test(target);
}

/** */
export function matchGlob(glob, target) {
  return compileGlob(glob)(target);
}
