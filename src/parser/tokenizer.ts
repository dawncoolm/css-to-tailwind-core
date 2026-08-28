/**
 * Structural tokenizer for CSS.
 *
 * The original package prepared its input with `code.replace(/[\n\r]/g, '')` and
 * then counted braces character by character. That approach cannot tell a real
 * `;` from one inside `url(data:image/svg+xml;base64,…)`, cannot skip comments,
 * and treats a `{` inside a string as the start of a block.
 *
 * This scanner walks the source exactly once while tracking comment, string and
 * bracket state, and emits only the delimiters that are structurally meaningful.
 * Everything between delimiters is returned verbatim (minus comments) so callers
 * keep the author's original spelling of selectors and values.
 *
 * Text is produced by slicing, not by appending character by character: a run of
 * text costs one `String.prototype.slice` regardless of its length. Comments are
 * the only thing that splits a run, and they are rare, so the common path is a
 * single slice per token.
 */

export type TokenType = 'text' | 'block-start' | 'block-end' | 'semicolon'

export interface Token {
  type: TokenType
  /** For `text`, the comment-stripped source. Empty for delimiters. */
  value: string
  /** Offset of the first character of this token in the original input. */
  start: number
  /** Offset one past the last character of this token in the original input. */
  end: number
}

export interface TokenizeResult {
  tokens: Token[]
  /** True when a comment or string ran to the end of the input. */
  truncated: boolean
  /** Offset where the unterminated construct began, when `truncated`. */
  truncatedAt: number
}

const enum Char {
  Tab = 9,
  NewLine = 10,
  Return = 13,
  Space = 32,
  Quote = 34,
  Apostrophe = 39,
  LParen = 40,
  RParen = 41,
  Asterisk = 42,
  Slash = 47,
  Semicolon = 59,
  LBrace = 123,
  Backslash = 92,
  RBrace = 125
}

/**
 * Split `input` into structural delimiters and the text between them.
 *
 * Braces, semicolons and parentheses that appear inside comments, quoted strings
 * or (for braces and semicolons) inside parentheses are treated as ordinary text.
 */
export const tokenize = (input: string): TokenizeResult => {
  const tokens: Token[] = []
  const length = input.length

  /** Start of the current uninterrupted run of text. */
  let runStart = 0
  /** Start of the whole token, which may span several runs across comments. */
  let tokenStart = 0
  /** Text from runs already closed by a comment. Empty on the common path. */
  let carried = ''
  let parenDepth = 0
  let truncated = false
  let truncatedAt = -1

  const emitDelimiter = (type: TokenType, at: number): void => {
    const text = carried + input.slice(runStart, at)
    if (text.length > 0) {
      tokens.push({ type: 'text', value: text, start: tokenStart, end: at })
    }
    tokens.push({ type, value: '', start: at, end: at + 1 })
    carried = ''
    runStart = at + 1
    tokenStart = at + 1
  }

  for (let i = 0; i < length; i++) {
    const code = input.charCodeAt(i)

    // Comments are dropped entirely, at any nesting level.
    if (code === Char.Slash && input.charCodeAt(i + 1) === Char.Asterisk) {
      const close = input.indexOf('*/', i + 2)
      if (close === -1) {
        truncated = true
        truncatedAt = i
        carried += input.slice(runStart, i)
        runStart = length
        break
      }
      carried += input.slice(runStart, i)
      runStart = close + 2
      i = close + 1
      continue
    }

    // Strings are opaque: skip to the closing quote without inspecting anything
    // in between. The text itself is still covered by the enclosing run.
    if (code === Char.Quote || code === Char.Apostrophe) {
      let j = i + 1
      let closed = false
      for (; j < length; j++) {
        const inner = input.charCodeAt(j)
        if (inner === Char.Backslash) {
          j++
        } else if (inner === code) {
          closed = true
          break
        }
      }
      if (!closed) {
        truncated = true
        truncatedAt = i
        i = length
        break
      }
      i = j
      continue
    }

    if (code === Char.LParen) {
      parenDepth++
    } else if (code === Char.RParen) {
      if (parenDepth > 0) parenDepth--
    } else if (parenDepth === 0) {
      if (code === Char.LBrace) {
        emitDelimiter('block-start', i)
      } else if (code === Char.RBrace) {
        emitDelimiter('block-end', i)
      } else if (code === Char.Semicolon) {
        emitDelimiter('semicolon', i)
      }
    }
  }

  const trailing = carried + input.slice(runStart)
  if (trailing.length > 0) {
    tokens.push({ type: 'text', value: trailing, start: tokenStart, end: length })
  }

  return { tokens, truncated, truncatedAt }
}

/** True when the character code is CSS whitespace. */
export const isWhitespaceCode = (code: number): boolean =>
  code === Char.Space || code === Char.Tab || code === Char.NewLine || code === Char.Return
