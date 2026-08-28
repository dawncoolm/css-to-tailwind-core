/**
 * Selector -> Tailwind variant chain.
 *
 * The original package handled exactly five pseudo selectors with five
 * copy-pasted branches, so `:disabled`, `:first-child`, `::placeholder` and the
 * rest produced classes with no variant at all — silently wrong output rather
 * than a warning. This module is table driven and falls back to Tailwind's
 * arbitrary variant syntax for anything it does not know by name.
 */

/** Pseudo-classes and pseudo-elements Tailwind exposes under a different name. */
const RENAMED: Readonly<Record<string, string>> = Object.freeze({
  'first-child': 'first',
  'last-child': 'last',
  'only-child': 'only',
  'file-selector-button': 'file'
})

/** Pseudo selectors whose Tailwind variant has the identical name. */
const IDENTITY: ReadonlySet<string> = new Set([
  'hover', 'focus', 'focus-visible', 'focus-within', 'active', 'visited',
  'target', 'disabled', 'enabled', 'checked', 'indeterminate', 'default',
  'required', 'valid', 'invalid', 'in-range', 'out-of-range', 'autofill',
  'empty', 'optional', 'placeholder-shown', 'read-only', 'read-write',
  'first-of-type', 'last-of-type', 'only-of-type',
  'before', 'after', 'placeholder', 'marker', 'selection', 'backdrop',
  'first-line', 'first-letter'
])

/** `:nth-child()` arguments Tailwind has dedicated variants for. */
const NTH_CHILD: Readonly<Record<string, string>> = Object.freeze({
  odd: 'odd',
  even: 'even',
  '2n': 'even',
  '2n+1': 'odd'
})

/** Matches one trailing pseudo-class/element, optionally with an argument. */
const TRAILING_PSEUDO = /(::?)([a-zA-Z-]+)(\(([^()]*)\))?$/

/** Matches a trailing attribute selector, e.g. `[data-open]`. */
const TRAILING_ATTRIBUTE = /\[([^\][]+)\]$/

/** A `.dark` / `[data-theme=dark]` ancestor, which Tailwind spells `dark:`. */
const DARK_ANCESTOR = /^(?:\.dark|\[data-theme=["']?dark["']?\]|html\.dark|:root\.dark)\s+/

export interface ParsedSelector {
  /** Variants in source order, ready to be joined with `:`. */
  variants: string[]
  /** What is left of the selector once the variants were stripped. */
  base: string
}

const toVariant = (kind: string, name: string, arg: string | undefined): string => {
  const lower = name.toLowerCase()

  if (lower === 'nth-child' && arg !== undefined) {
    const known = NTH_CHILD[arg.trim().toLowerCase()]
    if (known) return known
    return `[&:nth-child(${arg.trim().replace(/\s+/g, '')})]`
  }

  if (arg !== undefined) {
    // `:not(...)`, `:is(...)`, `:nth-of-type(...)`, … have no named variant.
    return `[&${kind}${lower}(${arg.trim().replace(/\s+/g, '_')})]`
  }

  if (IDENTITY.has(lower)) return lower
  const renamed = RENAMED[lower]
  if (renamed) return renamed

  return `[&${kind}${lower}]`
}

/**
 * Split a selector into its Tailwind variant chain and the remaining base.
 *
 * Trailing pseudo selectors and attribute selectors are consumed from right to
 * left, then reversed so the chain reads in source order:
 * `.btn:hover::before` -> `['hover', 'before']`.
 */
export const parseSelector = (selector: string): ParsedSelector => {
  let base = selector.trim()
  const collected: string[] = []

  for (;;) {
    const pseudo = TRAILING_PSEUDO.exec(base)
    if (pseudo) {
      collected.push(toVariant(pseudo[1] as string, pseudo[2] as string, pseudo[4]))
      base = base.slice(0, pseudo.index)
      continue
    }

    const attribute = TRAILING_ATTRIBUTE.exec(base)
    // Only treat it as a variant when something precedes it, so a bare
    // `[hidden] { … }` rule keeps its selector instead of becoming a variant.
    if (attribute && attribute.index > 0) {
      collected.push(`[&[${(attribute[1] as string).replace(/\s+/g, '')}]]`)
      base = base.slice(0, attribute.index)
      continue
    }

    break
  }

  collected.reverse()

  if (DARK_ANCESTOR.test(base)) {
    base = base.replace(DARK_ANCESTOR, '')
    collected.unshift('dark')
  }

  return { variants: collected, base }
}
