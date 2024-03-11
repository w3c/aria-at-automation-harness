// The `fetch-blob` module internally relies on a type named File which it does
// not define:
//
// Define a type for the "File" object globally so that it available when the
// TypeScript compiler inspects that module's type definitions.

export {};

declare global {
  type File = typeof import('fetch-blob/file.js');
}
