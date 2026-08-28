/** Assembling final class names: important marker, prefix, variants. */

import type { TailwindVersion } from '../types.js'

const OPEN_BRACKET = 91
const HYPHEN = 45

const isArbitrary = (className: string): boolean =>
  className.charCodeAt(0) === OPEN_BRACKET && className.endsWith(']')

/**
 * Mark a class as important.
 *
 * v3 puts the bang in front (`!flex`) and, for an arbitrary property, inside the
 * brackets (`[color:red!important]`). v4 moved the marker to the end (`flex!`).
 */
const applyImportant = (className: string, version: TailwindVersion): string => {
  if (version === 4) return `${className}!`
  if (isArbitrary(className)) return `${className.slice(0, -1)}!important]`
  return `!${className}`
}

/**
 * Insert Tailwind's configured prefix, keeping a leading minus sign outermost:
 * `-mt-4` with prefix `tw-` becomes `-tw-mt-4`.
 */
const applyPrefix = (className: string, prefix: string): string => {
  if (prefix === '') return className
  return className.charCodeAt(0) === HYPHEN
    ? `-${prefix}${className.slice(1)}`
    : `${prefix}${className}`
}

export interface FormatOptions {
  /** Outermost first, e.g. `['sm', 'hover']` for `sm:hover:flex`. */
  variants: readonly string[]
  important: boolean
  prefix: string
  version: TailwindVersion
}

/**
 * Apply prefix, important marker and variants to every class in a list.
 *
 * The original package applied variants to the first class only whenever the
 * list started with `transform`, `filter` or `backdrop-filter`, producing
 * `hover:transform rotate-45` where the rotation then applied unconditionally.
 * Every class is decorated here.
 */
export const formatClasses = (
  classes: readonly string[],
  options: FormatOptions
): string[] => {
  const { variants, important, prefix, version } = options
  const variantPrefix = variants.length > 0 ? `${variants.join(':')}:` : ''

  return classes.map(className => {
    let result = applyPrefix(className, prefix)
    if (important) result = applyImportant(result, version)
    return `${variantPrefix}${result}`
  })
}

/** Split a handler's output into individual classes, dropping empty entries. */
export const splitClasses = (value: string): string[] =>
  value.length === 0 ? [] : value.split(' ').filter(v => v !== '')

/** Remove duplicate classes while keeping first-seen order. */
export const dedupe = (classes: readonly string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const className of classes) {
    if (seen.has(className)) continue
    seen.add(className)
    out.push(className)
  }
  return out
}
