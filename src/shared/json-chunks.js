/**
 * @module shared
 */

export async function* separateJSONChunks(iterContent) {
  let chunk = '';
  for await (const blob of iterContent) {
    chunk += blob;
    let split = splitJSON(chunk);
    while (split.json) {
      chunk = split.remaining;
      yield split.json;
      split = splitJSON(chunk);
    }
  }
}

export async function* parseJSONChunks(iterJSON) {
  for await (const chunk of iterJSON) {
    yield JSON.parse(chunk);
  }
}

/**
 * Split the input text string into a contained JSON string chunk and the
 * remaining string content after that.
 *
 * JSON chunks that can be detected start and end with braces, curly `{}` or
 * square `[]`, or double quotes. Anything before a detectable JSON chunk, such
 * as whitespace, boolean, null, and number literals, will be ignored. Valid
 * JSON values such as boolean, null, and number literals cannot be detected
 * since there is ambiguity in how to differentiate between two literals. While
 * JSON objects, arrays, and strings are clear beginnings and endings.
 *
 * @param {string} text
 * @returns {{json: (string | undefined), remaining: string}}
 */
export function splitJSON(text) {
  let start = -1;
  let end = -1;
  let level = 0;
  const token = /[{}[\]"]/g;
  const restOfString = /(?:\\.|[^"\\])*"/gsy;
  for (let tokenMatch = token.exec(text); tokenMatch !== null; tokenMatch = token.exec(text)) {
    switch (tokenMatch[0]) {
      case '{':
      case '[':
        if (level === 0) {
          start = tokenMatch.index;
        }
        level += 1;
        break;
      case '}':
      case ']':
        level -= 1;
        if (level === 0) {
          end = tokenMatch.index + 1;
          // Fast forward to the end of the text to exit the for loop.
          token.lastIndex = text.length;
        }
        break;
      case '"':
        restOfString.lastIndex = token.lastIndex;
        const restOfStringMatch = restOfString.exec(text);
        if (restOfStringMatch) {
          if (level === 0) {
            start = tokenMatch.index;
            end = restOfString.lastIndex;
            // Fast forward to the end of the text to exit the for loop.
            token.lastIndex = text.length;
          } else {
            token.lastIndex = restOfString.lastIndex;
          }
        } else {
          // Fast forward to the end of the text to exit the for loop.
          token.lastIndex = text.length;
        }
        break;
    }
  }

  if (end > -1) {
    return {
      start,
      end,
      json: text.substring(start, end),
      remaining: text.substring(end),
    };
  }
  return {
    remaining: text,
  };
}
