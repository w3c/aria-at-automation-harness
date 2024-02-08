import test from 'ava';

import { compileGlob, matchGlob } from '../file-glob.js';

test('compileGlob', t => {
  t.plan(12);
  const assertCompiles = glob => t.assert(typeof compileGlob(glob) === 'function');
  assertCompiles('');
  assertCompiles('a');
  assertCompiles('a/b');
  assertCompiles('a/b/c');
  assertCompiles('a,b');
  assertCompiles('a,b/c');
  assertCompiles('{a,b}');
  assertCompiles('a/{b,c}');
  assertCompiles('*');
  assertCompiles('*/*');
  assertCompiles('**');
  assertCompiles('a/{b/*,c/**}');
});

test('testGlob', t => {
  t.plan(91);
  const assertGlobTrue = (glob, target, partial) =>
    t.true(
      matchGlob(glob, target, partial),
      `${partial ? 'partial ' : ''}'${glob}' matches '${target}'`
    );
  const assertGlobFalse = (glob, target, partial) =>
    t.false(
      matchGlob(glob, target, partial),
      `${partial ? 'partial ' : ''}'${glob}' does not match '${target}'`
    );
  const assertGlobTrueWin32 = (glob, target, partial) => {
    if (process.platform === 'win32') {
      return t.true(
        matchGlob(glob, target, partial),
        `${partial ? 'partial ' : ''}'${glob}' matches '${target}' (Win32)`
      );
    } else {
      return t.false(
        matchGlob(glob, target, partial),
        `${partial ? 'partial ' : ''}'${glob}' does not match '${target}' (not win32)`
      );
    }
  };

  assertGlobTrue('', '');
  assertGlobFalse('', 'a');
  assertGlobTrue('a', 'a');
  assertGlobFalse('a', '');
  assertGlobFalse('a', 'b');
  assertGlobFalse('a', 'ab');
  assertGlobFalse('a', 'ba');
  assertGlobFalse('a', 'bab');
  assertGlobTrue('a/b', 'a', true);
  assertGlobFalse('a/b', 'a', false);
  assertGlobTrue('a/b', 'a/b');
  assertGlobTrueWin32('a/b', 'a\\b');
  assertGlobFalse('a/b', '');
  assertGlobFalse('a/b', 'b');
  assertGlobFalse('a/b', 'b/a');
  assertGlobFalse('a/b/c', '/b');
  assertGlobFalse('a/b/c', '\\b');
  assertGlobTrue('a/b/c', 'a', true);
  assertGlobFalse('a/b/c', 'a', false);
  assertGlobTrue('a/b/c', 'a/b', true);
  assertGlobFalse('a/b/c', 'a/b', false);
  assertGlobTrueWin32('a/b/c', 'a\\b', true);
  assertGlobTrue('a/b/c', 'a/b/c');
  assertGlobTrueWin32('a/b/c', 'a\\b\\c');
  assertGlobFalse('a/b/c', '');
  assertGlobFalse('a/b/c', 'b');
  assertGlobFalse('a/b/c', 'c');
  assertGlobFalse('a/b/c', 'b/c');
  assertGlobFalse('a/b/c', 'a/c');
  assertGlobFalse('a,b', 'a');
  assertGlobTrue('{a,b}', 'a');
  assertGlobTrue('{a,b}', 'b');
  assertGlobFalse('{a,b}', '');
  assertGlobFalse('{a,b}', 'c');
  assertGlobFalse('{a,b}', 'ab');
  assertGlobTrue('{a,b/c}', 'a');
  assertGlobTrue('{a,b/c}', 'b', true);
  assertGlobFalse('{a,b/c}', 'b', false);
  assertGlobTrue('{a,b/c}', 'b/c');
  assertGlobTrueWin32('{a,b/c}', 'b\\c');
  assertGlobFalse('{a,b/c}', '');
  assertGlobFalse('{a,b/c}', 'a/c');
  assertGlobTrue('a/{b,c}', 'a', true);
  assertGlobFalse('a/{b,c}', 'a', false);
  assertGlobTrue('a/{b,c}', 'a/b');
  assertGlobTrueWin32('a/{b,c}', 'a\\b');
  assertGlobTrue('a/{b,c}', 'a/c');
  assertGlobTrueWin32('a/{b,c}', 'a\\c');
  assertGlobFalse('a/{b,c}', '');
  assertGlobFalse('a/{b,c}', 'b');
  assertGlobFalse('a/{b,c}', 'c');
  assertGlobFalse('a/{b,c}', 'b/c');
  assertGlobFalse('a/{b,c}', 'a/bc');
  assertGlobFalse('a/{b,c}', 'a/b/c');
  assertGlobTrue('*', 'a');
  assertGlobTrue('*', 'def');
  assertGlobFalse('*', '');
  assertGlobTrue('*', 'a');
  assertGlobFalse('*', '/a');
  assertGlobFalse('*', 'a/b');
  assertGlobTrue('*/*', 'a', true);
  assertGlobFalse('*/*', 'a', false);
  assertGlobTrue('*/*', 'a/b');
  assertGlobTrue('*/*', 'a/c');
  assertGlobTrue('*/*', 'def', true);
  assertGlobFalse('*/*', 'def', false);
  assertGlobTrue('*/*', 'def/ghi');
  assertGlobFalse('*/*', '');
  assertGlobFalse('*/*', '/');
  assertGlobFalse('*/*', '/b');
  assertGlobTrue('**', '');
  assertGlobTrue('**', 'def');
  assertGlobTrue('**', 'def/ghi');
  assertGlobTrue('**', 'def/');
  assertGlobTrue('**', '/ghi');
  assertGlobTrue('**', '/def/ghi/');
  assertGlobTrue('a/{b/*,c/**}', 'a', true);
  assertGlobTrue('a/{b/*,c/**}', 'a/b', true);
  assertGlobTrue('a/{b/*,c/**}', 'a/b/c');
  assertGlobTrue('a/{b/*,c/**}', 'a/b/def');
  assertGlobTrue('a/{b/*,c/**}', 'a/c', true);
  assertGlobTrue('a/{b/*,c/**}', 'a/c/b');
  assertGlobTrue('a/{b/*,c/**}', 'a/c/def');
  assertGlobTrue('a/{b/*,c/**}', 'a/c/def/ghi');
  assertGlobFalse('a/{b/*,c/**}', '');
  assertGlobFalse('a/{b/*,c/**}', 'a/d');
  assertGlobFalse('a/{b/*,c/**}', 'b');
  assertGlobFalse('a/{b/*,c/**}', 'b/');
  assertGlobFalse('a/{b/*,c/**}', 'c');
  assertGlobFalse('a/{b/*,c/**}', 'c/');
  assertGlobFalse('a/{b/*,c/**}', 'c/def');
});
