/**
 * @module shared
 */

export async function* seperateJSONChunks(iterContent) {
  let chunk = '';
  for await (const blob of iterContent) {
    chunk += blob;
    let split = splitJson(chunk);
    while (split.json) {
      chunk = split.remaining;
      yield split.json;
      split = splitJson(chunk);
    }
  }
}

export async function* parseJSONChunks(iterJSON) {
  for await (const chunk of iterJSON) {
    yield JSON.parse(chunk);
  }
}

/**
 * @param {string} text
 */
function splitJson(text) {
  let start = -1;
  let level = 0;
  const token = /[{}[\]"]/g;
  const restOfString = /(?:\\.|[^"\\])*"/g;
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
          const end = tokenMatch.index + 1;
          return {
            start,
            end,
            json: text.substring(start, end),
            remaining: text.substring(end),
          };
        }
        break;
      case '"':
        restOfString.lastIndex = token.lastIndex;
        const restOfStringMatch = restOfString.exec(text);
        if (restOfStringMatch) {
          token.lastIndex = restOfString.lastIndex;
        } else {
          token.lastIndex = text.length;
        }
        break;
    }
  }
  return {
    remaining: text,
  };
}
