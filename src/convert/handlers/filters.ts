/**
 * Filters: `filter` and `backdrop-filter`.
 *
 * Both properties take a space separated list of filter function calls, and both
 * are converted the same way: split the list, map each call to a utility, and
 * join. The two differ only in the utility prefix (`blur-sm` vs
 * `backdrop-blur-sm`), the `customTheme` group consulted (`blur` vs
 * `backdrop-blur`), and the fact that `opacity()` is a real backdrop utility but
 * has no `filter` counterpart in Tailwind.
 *
 * A call is resolved in two steps, exactly as the original package did:
 *
 * 1. When `useAllDefaultValues` is on, the *whole call* is looked up in
 *    `ctx.theme.filter` (`blur(4px)` -> `blur-sm` in v3, `blur-xs` in v4). The
 *    version rename lives in the preset, so nothing here branches on the version
 *    for the scale itself.
 * 2. Otherwise the call is decomposed into `name(amount)` and the amount is
 *    resolved against `customTheme[group]`, falling back to an arbitrary value.
 *
 * If any call in the list cannot be mapped, the whole declaration degrades to the
 * arbitrary property form `[filter:…]` rather than emitting a partial result.
 *
 * Tailwind v4 dropped the bare `filter` / `backdrop-filter` marker classes that
 * v3 needed to enable the filter variable chain, so those are emitted for v3
 * only.
 */

import type { ConversionContext } from '../context.js'
import { resolveSubValue } from '../context.js'
import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'
import {
  collapseWhitespace as collapse,
  hasNegative,
  parseFunctionCall,
  splitTopLevelWhitespace,
  toArbitrary
} from '../../utils/value.js'

/**
 * No filter sub-function has a default ladder of its own — the built-in scale is
 * keyed on the whole call (`blur(4px)`), not on the bare amount (`4px`). Passing
 * this empty table to `resolveSubValue` reduces it to the original's
 * `customTheme[group]?.[v] ?? '[v]'` lookup.
 */
const NO_SUB_DEFAULTS: ValueTable = Object.freeze({})

/**
 * `backdrop-filter: opacity(…)` defaults.
 *
 * `opacity()` is the one function that is a backdrop utility without being a
 * `filter` utility, so it is not part of `ctx.theme.filter`. Keys are the exact
 * spellings the original shipped; `opacity(.5)` is deliberately absent there and
 * stays absent here, falling through to `backdrop-opacity-[.5]`.
 */
const BACKDROP_OPACITY_VALUES: ValueTable = Object.freeze({
  'opacity(0)': 'backdrop-opacity-0',
  'opacity(0.05)': 'backdrop-opacity-5',
  'opacity(0.1)': 'backdrop-opacity-10',
  'opacity(0.2)': 'backdrop-opacity-20',
  'opacity(0.25)': 'backdrop-opacity-25',
  'opacity(0.3)': 'backdrop-opacity-30',
  'opacity(0.4)': 'backdrop-opacity-40',
  'opacity(0.5)': 'backdrop-opacity-50',
  'opacity(0.6)': 'backdrop-opacity-60',
  'opacity(0.7)': 'backdrop-opacity-70',
  'opacity(0.75)': 'backdrop-opacity-75',
  'opacity(0.8)': 'backdrop-opacity-80',
  'opacity(0.9)': 'backdrop-opacity-90',
  'opacity(0.95)': 'backdrop-opacity-95',
  'opacity(1)': 'backdrop-opacity-100'
})

/**
 * Filter functions that have a `filter` utility family.
 *
 * `drop-shadow` is absent on purpose: Tailwind's `drop-shadow-*` scale is a fixed
 * ladder with no arbitrary amount spelling in the original, so a drop shadow that
 * is not one of the presets degrades to `[filter:…]` — the original's behaviour.
 * `opacity` is absent because `filter: opacity()` has no utility at all.
 */
const FILTER_FUNCTIONS: ReadonlySet<string> = new Set([
  'blur',
  'brightness',
  'contrast',
  'grayscale',
  'hue-rotate',
  'invert',
  'saturate',
  'sepia'
])

/** The same set plus `opacity`, which only exists on the backdrop side. */
const BACKDROP_FILTER_FUNCTIONS: ReadonlySet<string> = new Set([
  ...FILTER_FUNCTIONS,
  'opacity'
])

/** `name(argument)`, anchored so a trailing comment or garbage is rejected. */
/**
 * Look a whole filter call up in the built-in scale.
 *
 * The spaced spelling is tried first because that is how `ctx.theme.filter` keys
 * its `drop-shadow(…)` entries. The space-free spelling is tried second only to
 * stay compatible with the original, which stripped all whitespace inside
 * brackets before matching and so still resolved `blur( 4px )`.
 *
 * Divergence from the original: because it stripped that whitespace *before*
 * matching, every `drop-shadow(…)` key — all of which contain spaces — was
 * unreachable. Keeping the spaced form makes them resolve, per the port's
 * "drop-shadow reads ctx.theme.filter" rule.
 *
 * `backdrop` widens the search to {@link BACKDROP_OPACITY_VALUES}, which the
 * shared filter scale cannot carry.
 */
const lookupNamedUtility = (
  ctx: ConversionContext,
  call: string,
  backdrop: boolean
): string => {
  const compact = call.replace(/\s+/g, '')
  const named = ctx.theme.filter[call] ?? ctx.theme.filter[compact]
  if (named !== undefined) return named
  if (!backdrop) return ''
  return BACKDROP_OPACITY_VALUES[call] ?? BACKDROP_OPACITY_VALUES[compact] ?? ''
}

/**
 * Move a `filter` utility onto the backdrop family.
 *
 * The sign is re-hoisted to the front of the class name. The original prefixed
 * blindly and so turned the `hue-rotate(-180deg)` default into the unusable
 * `backdrop--hue-rotate-180`; this produces `-backdrop-hue-rotate-180`, which is
 * also what the non-default path has always produced.
 */
const toBackdropUtility = (utility: string): string => {
  const [sign, name] = hasNegative(utility)
  return name.startsWith('backdrop-') ? utility : `${sign}backdrop-${name}`
}

/**
 * Map one `name(amount)` call to a utility, or `''` when the function has no
 * Tailwind equivalent on this side.
 *
 * Divergence from the original: its `hue-rotate` arms read `customTheme` group
 * `grayscale` / `backdrop-grayscale` — a copy-paste slip that made the declared
 * `hue-rotate` / `backdrop-hue-rotate` groups unreachable. They are read here.
 */
const utilityForCall = (
  name: string,
  amount: string,
  ctx: ConversionContext,
  backdrop: boolean
): string => {
  const allowed = backdrop ? BACKDROP_FILTER_FUNCTIONS : FILTER_FUNCTIONS
  if (!allowed.has(name)) return ''

  // The utility family and the customTheme group share one name on both sides.
  const group = backdrop ? `backdrop-${name}` : name

  if (name === 'hue-rotate') {
    // Tailwind spells a negative rotation by hoisting the sign to the front.
    const [sign, magnitude] = hasNegative(amount)
    return `${sign}${group}-${resolveSubValue(ctx, group, magnitude, NO_SUB_DEFAULTS)}`
  }

  return `${group}-${resolveSubValue(ctx, group, amount, NO_SUB_DEFAULTS)}`
}

/** Shared implementation of `filter` and `backdrop-filter`. */
const convertFilterList = (
  value: string,
  ctx: ConversionContext,
  backdrop: boolean
): string => {
  const property = backdrop ? 'backdrop-filter' : 'filter'
  const arbitrary = `[${property}:${toArbitrary(value)}]`
  const normalized = collapse(value)

  if (normalized === 'none') return `${property}-none`

  // v3 needed the marker class to switch the filter variable chain on; v4 does not.
  const marker = ctx.version === 3 ? `${property} ` : ''

  // A few scale entries are multi-call values (`drop-shadow(…) drop-shadow(…)`),
  // so the list as a whole gets one chance to match before it is split apart.
  // Backdrop is excluded: Tailwind has no `backdrop-drop-shadow-*` family.
  if (!backdrop && ctx.useAllDefaultValues) {
    const whole = lookupNamedUtility(ctx, normalized, false)
    if (whole) return `${marker}${whole}`
  }

  const calls = splitTopLevelWhitespace(normalized)
  if (calls.length === 0) return arbitrary

  const utilities: string[] = []
  for (const call of calls) {
    const named = ctx.useAllDefaultValues ? lookupNamedUtility(ctx, call, backdrop) : ''
    if (named !== '') {
      utilities.push(backdrop ? toBackdropUtility(named) : named)
      continue
    }

    const parsed = parseFunctionCall(call)
    const args = parsed?.[1].trim() ?? ''
    // Divergence from the original: a list entry that is not a function call at
    // all (`inherit`, a stray token) used to yield the bare marker class with a
    // trailing space. It now degrades to the arbitrary property like any other
    // unmappable entry.
    const utility = parsed && args !== '' ? utilityForCall(parsed[0], args, ctx, backdrop) : ''
    if (utility === '') return arbitrary
    utilities.push(utility)
  }

  // A repeated call (`blur(4px) blur(4px)`) collapses to one utility.
  return `${marker}${[...new Set(utilities)].join(' ')}`
}

const filter: HandlerFn = (value, ctx) => convertFilterList(value, ctx, false)

const backdropFilter: HandlerFn = (value, ctx) => convertFilterList(value, ctx, true)

export const filterHandlers: HandlerGroup = {
  filter,
  'backdrop-filter': backdropFilter
}
