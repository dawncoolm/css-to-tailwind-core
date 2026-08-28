/** Low level helpers for reading and rewriting raw CSS declaration values. */

/**
 * Split a leading minus sign off a value.
 *
 * Tailwind expresses negative utilities by moving the sign in front of the class
 * name (`-mt-4`), so callers need the sign and the magnitude separately.
 *
 * @returns `[sign, magnitude]` where sign is `'-'` or `''`.
 */
export const hasNegative = (val: string): ['-' | '', string] =>
  val.charCodeAt(0) === 45 /* - */ ? ['-', val.slice(1)] : ['', val]

/**
 * Encode a raw CSS value for use inside Tailwind's arbitrary value syntax.
 *
 * Tailwind class names cannot contain spaces, so runs of whitespace collapse to a
 * single underscore. Runs of underscores collapse too, which keeps the output
 * stable whether the author wrote `1px  solid` or `1px _ solid`.
 */
export const toArbitrary = (val: string): string =>
  val.replace(/\s+/g, '_').replace(/_{2,}/g, '_')

const enum Code {
  Quote = 34,
  Apostrophe = 39,
  LParen = 40,
  RParen = 41,
  Backslash = 92,
  LBracket = 91,
  RBracket = 93,
  LBrace = 123,
  RBrace = 125
}

const isOpener = (code: number): boolean =>
  code === Code.LParen || code === Code.LBracket || code === Code.LBrace

const isCloser = (code: number): boolean =>
  code === Code.RParen || code === Code.RBracket || code === Code.RBrace

/**
 * True when the value contains nothing that could nest a separator.
 *
 * Most declaration values are plain (`1rem`, `#fff`, `flex-start`), so this check
 * lets the hot path skip the character walk entirely.
 */
const isFlat = (value: string): boolean => {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (isOpener(code) || isCloser(code) || code === Code.Quote || code === Code.Apostrophe) {
      return false
    }
  }
  return true
}

/**
 * Split a value on a separator, ignoring separators nested inside brackets or
 * quotes.
 *
 * This is what keeps `url(data:image/svg+xml;base64,AAA)` and `"a, b"` in one
 * piece where a naive `String.prototype.split` would tear them apart.
 *
 * @param limit Stop after this many splits and return the remainder as the last
 *   entry. Used to isolate the property name from a declaration, where only the
 *   first colon is a separator.
 */
export const splitTopLevel = (
  value: string,
  separator: string,
  limit = Infinity
): string[] => {
  const separatorCode = separator.charCodeAt(0)

  if (isFlat(value)) {
    if (limit === Infinity) return value.split(separator)
    const parts: string[] = []
    let start = 0
    for (let i = 0; i < value.length && parts.length < limit; i++) {
      if (value.charCodeAt(i) === separatorCode) {
        parts.push(value.slice(start, i))
        start = i + 1
      }
    }
    parts.push(value.slice(start))
    return parts
  }

  const parts: string[] = []
  let depth = 0
  let quote = 0
  let start = 0

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)

    if (quote !== 0) {
      if (code === Code.Backslash) i++
      else if (code === quote) quote = 0
      continue
    }

    if (code === Code.Quote || code === Code.Apostrophe) {
      quote = code
    } else if (isOpener(code)) {
      depth++
    } else if (isCloser(code)) {
      if (depth > 0) depth--
    } else if (code === separatorCode && depth === 0 && parts.length < limit) {
      parts.push(value.slice(start, i))
      start = i + 1
    }
  }

  parts.push(value.slice(start))
  return parts
}

/** Collapse every run of whitespace to a single space, and trim. */
export const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim()

/** A percentage written to more precision than Tailwind's fraction tables carry. */
const PRECISE_PERCENTAGE_RE = /^\d+\.[1-9]{2,}%$/

/** The digits past the second decimal, which the rounding below discards. */
const EXCESS_DECIMALS_RE = /(\.[1-9]{2})\d+/

/**
 * Round `33.333333%` down to the `33.33%` spelling Tailwind's fraction tables
 * are keyed on. Anything else passes through untouched.
 *
 * Mirrors the preamble of the original package's `getUnitMetacharactersVal`,
 * including its quirk of only rounding when every digit after the decimal point
 * is non-zero — `33.300000%` is left alone.
 */
export const normalizeFractionPercentage = (value: string): string => {
  if (!PRECISE_PERCENTAGE_RE.test(value)) return value
  const rounded = Number(value.slice(0, -1)).toFixed(6).replace(EXCESS_DECIMALS_RE, '$1')
  return `${rounded}%`
}

const WHITESPACE_RE = /\s/

/** Split on whitespace that is not nested inside brackets or quotes. */
export const splitTopLevelWhitespace = (value: string): string[] =>
  splitTopLevel(collapseWhitespace(value), ' ').filter(v => v !== '')

/**
 * Collapse whitespace inside every top level bracket group.
 *
 * `rgba(0, 0, 0, .5)` becomes `rgba(0,0,0,.5)` while the spaces separating
 * shorthand components (`1px solid rgba(0,0,0,.5)`) survive, so the result can
 * still be split into components.
 */
export const compactBrackets = (value: string): string => {
  if (isFlat(value)) return value

  let depth = 0
  let quote = 0
  let out = ''
  let runStart = 0

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)

    if (quote !== 0) {
      if (code === Code.Backslash) i++
      else if (code === quote) quote = 0
      continue
    }

    if (code === Code.Quote || code === Code.Apostrophe) {
      quote = code
    } else if (isOpener(code)) {
      depth++
    } else if (isCloser(code)) {
      if (depth > 0) depth--
    } else if (depth > 0 && WHITESPACE_RE.test(value[i] as string)) {
      // Drop this character by closing the run before it and reopening after.
      out += value.slice(runStart, i)
      runStart = i + 1
    }
  }

  return out + value.slice(runStart)
}

/** `name(arguments)` — the shape of every CSS functional notation. */
const FUNCTION_CALL_RE = /^([a-zA-Z][a-zA-Z0-9-]*)\(([\s\S]*)\)$/

/**
 * Split `name(arguments)` into its two halves.
 *
 * The parentheses inside `arguments` must balance, so a truncated `rgb(0,0,0`
 * and a trailing `rgb(0,0,0))` are both rejected rather than silently accepted
 * with a mangled argument list.
 *
 * @returns `[name, arguments]` with the name lower-cased and the arguments
 *   verbatim, or `null` when the value is not a function call.
 */
export const parseFunctionCall = (value: string): [name: string, args: string] | null => {
  const match = FUNCTION_CALL_RE.exec(value)
  if (!match) return null

  const args = match[2] as string
  let depth = 0
  for (let i = 0; i < args.length; i++) {
    const code = args.charCodeAt(i)
    if (code === Code.LParen) depth++
    else if (code === Code.RParen && depth-- === 0) return null
  }
  if (depth !== 0) return null

  return [(match[1] as string).toLowerCase(), args]
}

/** Remove a wrapping pair of quotes, if the value is fully quoted. */
export const unquote = (value: string): string => {
  const first = value[0]
  if ((first === '"' || first === "'") && value.endsWith(first) && value.length > 1) {
    return value.slice(1, -1)
  }
  return value
}
