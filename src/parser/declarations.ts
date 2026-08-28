/** Turning raw `property: value` text into structured declarations. */

import { splitTopLevel } from '../utils/value.js'

export interface Declaration {
  /** Lower-cased property name, e.g. `background-color`. Vendor prefixes kept. */
  property: string
  /** Value with `!important` removed and surrounding whitespace trimmed. */
  value: string
  important: boolean
  start: number
  end: number
}

/**
 * `!important`, in any of the spellings CSS permits: the bang may be separated
 * from the keyword by whitespace or comments (already stripped), and the keyword
 * is case-insensitive.
 */
const IMPORTANT_RE = /!\s*important\s*$/i

/**
 * Parse one declaration.
 *
 * The property/value split happens at the first *top level* colon, so
 * `background: url(data:image/png;base64,AA==)` keeps its value intact where a
 * plain `split(':')` would cut it at `data:`.
 *
 * @returns `null` when the text is not a declaration (no colon, or empty name).
 */
export const parseDeclaration = (raw: string, start: number): Declaration | null => {
  const parts = splitTopLevel(raw, ':', 1)
  if (parts.length < 2) return null

  const property = (parts[0] as string).trim().toLowerCase()
  if (property === '') return null

  let value = (parts[1] as string).trim()
  const important = IMPORTANT_RE.test(value)
  if (important) {
    value = value.replace(IMPORTANT_RE, '').trim()
  }

  return { property, value, important, start, end: start + raw.length }
}
