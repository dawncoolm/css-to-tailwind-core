/**
 * Handler shapes that recur across the property groups.
 *
 * The sixteen groups were written independently, and each one grew its own copy
 * of the same three or four handler shapes. Those copies had already started to
 * diverge — one rejected an empty value where the others did not, two split the
 * same factory into two functions — so they live here once instead.
 *
 * Every factory is called at module load, never per declaration, so the closures
 * and tables they build are allocated once.
 */

import { isColor } from '../../utils/color.js'
import { isUnit } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'
import type { HandlerFn, ValueTable } from '../registry.js'

/** `[<property>:<value>]` — Tailwind's arbitrary property escape hatch. */
export const arbitrary = (property: string, value: string): string =>
  `[${property}:${toArbitrary(value)}]`

/**
 * A property with no Tailwind utility at all: emit it as an arbitrary property
 * whatever the value is.
 */
export const arbitraryProperty =
  (property: string): HandlerFn =>
  value =>
    arbitrary(property, value)

/** As {@link arbitraryProperty}, but only for values that are a CSS dimension. */
export const arbitraryLengthProperty =
  (property: string): HandlerFn =>
  value =>
    isUnit(value) ? arbitrary(property, value) : ''

/**
 * As {@link arbitraryProperty}, but only for colours.
 *
 * Gradients count as colours here, matching the `joinLinearGradient` argument the
 * original package passed at these call sites.
 */
export const arbitraryColorProperty =
  (property: string): HandlerFn =>
  value =>
    isColor(value, true) ? arbitrary(property, value) : ''

/**
 * A value table whose every entry maps a keyword to itself as an arbitrary
 * property: `{ 'ultra-condensed': '[font-stretch:ultra-condensed]' }`.
 *
 * Spelling those out by hand is how the original package ended up mapping
 * `box-align: start` to `[box-align:inherit]` — nothing checks that the key and
 * the value agree. Generating them makes that class of typo impossible.
 */
export const identityTable = (property: string, keys: readonly string[]): ValueTable =>
  Object.freeze(Object.fromEntries(keys.map(key => [key, `[${property}:${key}]`])))

/**
 * The keyword half of a colour property: `transparent` and both spellings of
 * `currentColor` map to named utilities, everything else is an arbitrary value.
 *
 * @param prefix Utility prefix, e.g. `bg` for `bg-transparent` / `bg-current`.
 * @param includeTransparent `fill` and `stroke` have no `-transparent` utility in
 *   the original package's mapping, so they opt out.
 */
export const colorKeywords = (prefix: string, includeTransparent = true): ValueTable =>
  Object.freeze({
    ...(includeTransparent ? { transparent: `${prefix}-transparent` } : {}),
    // Property names are lower-cased by the parser but values are not, so both
    // spellings of `currentColor` reach the handler verbatim.
    currentColor: `${prefix}-current`,
    currentcolor: `${prefix}-current`
  })

/**
 * A colour handler: keyword table first, then any colour as an arbitrary value.
 */
export const colorHandler = (prefix: string, keywords: ValueTable): HandlerFn => value =>
  keywords[value] ?? (isColor(value, true) ? `${prefix}-[${toArbitrary(value)}]` : '')

/**
 * A utility that only ever takes an arbitrary value: `text-[13px]`.
 *
 * @param guard Predicate the value must pass; a rejected value yields `''`,
 *   which the caller turns into a diagnostic.
 */
export const arbitraryValue =
  (utility: string, guard: (value: string) => boolean): HandlerFn =>
  value =>
    guard(value) ? `${utility}-[${toArbitrary(value)}]` : ''

/**
 * The most common non-trivial handler: look the value up in a table, and fall
 * back to an arbitrary value under `utility`.
 *
 * @param guard Optional predicate the value must pass before the fallback is
 *   used. A rejected value yields `''`, which the caller turns into a diagnostic.
 */
export const tableOrArbitrary = (
  utility: string,
  table: ValueTable,
  guard?: (value: string) => boolean
): HandlerFn => {
  if (guard) {
    return value =>
      table[value] ?? (guard(value) ? `${utility}-[${toArbitrary(value)}]` : '')
  }
  return value => table[value] ?? `${utility}-[${toArbitrary(value)}]`
}

/** Build a table by prefixing every entry of a shared keyword list. */
export const prefixedTable = (
  prefix: string,
  suffixes: readonly string[]
): ValueTable =>
  Object.freeze(Object.fromEntries(suffixes.map(name => [name, `${prefix}-${name}`])))

/**
 * The CSS blend modes, shared by `mix-blend-mode` and `background-blend-mode`.
 *
 * Both Tailwind families use the mode name verbatim as the class suffix, so the
 * two tables differ only by prefix and are generated rather than written twice.
 */
export const BLEND_MODES: readonly string[] = Object.freeze([
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
])
