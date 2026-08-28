/**
 * Transition and animation utilities.
 *
 * Tailwind only ships utilities for four of these fourteen properties —
 * `transition`, `transition-delay`, `transition-duration` and
 * `transition-timing-function`. The rest have no utility at any version, so they
 * are emitted as arbitrary property declarations (`[animation-name:fade]`),
 * exactly as the original package did.
 *
 * The shorthand `transition` is largely resolved before this module runs:
 * `theme.defaults.transition` maps Tailwind's own six shorthand values
 * (`transition-all`, `transition-colors`, …) and `convertDeclaration` consults it
 * first. Only `none` and the arbitrary fallback are left here.
 *
 * None of the v4 renames touch this group: `delay-*`, `duration-*`, `ease-*` and
 * `animate-*` are spelled the same in v3 and v4.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'
import { isNumber, isTime } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'
import { arbitraryProperty } from './shared.js'

/* -------------------------------------------------------------------------- */
/* Durations                                                                  */
/* -------------------------------------------------------------------------- */

/** Millisecond steps shared by `transition-delay` and `transition-duration`. */
const DURATION_LADDER: readonly string[] = ['75', '100', '150', '200', '300', '500', '700', '1000']

/**
 * Build a `<time> -> class` table for one duration-driven property.
 *
 * The original package spelled both tables out inline, inside the handler body,
 * so each was rebuilt on every declaration. They are built once here.
 */
const buildDurationTable = (prefix: string): ValueTable => {
  const table: Record<string, string> = {}
  for (const step of DURATION_LADDER) {
    table[`${step}ms`] = `${prefix}-${step}`
  }
  return Object.freeze(table)
}

const DELAY_VALUES = buildDurationTable('delay')
const DURATION_VALUES = buildDurationTable('duration')

/** A duration written in seconds, e.g. `.3s`, `1s`, `1.5s`. */
const SECONDS_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))s$/

/** Trailing zeros (and a now-empty fractional part) left by `toFixed`. */
const TRAILING_ZEROS_RE = /\.?0+$/

/**
 * Restate a duration in milliseconds so the scale above can be keyed on one unit.
 *
 * `.15s` and `150ms` are the same duration but only the latter is a table key,
 * so seconds are converted before the lookup. Six decimal places then stripping
 * trailing zeros reproduces the original's rounding, which keeps sub-millisecond
 * values such as `.0755s` from turning into floating point noise.
 *
 * Anything that is not a plain number of seconds passes through untouched.
 */
const toMilliseconds = (value: string): string => {
  const match = SECONDS_RE.exec(value)
  if (!match) return value
  const milliseconds = Number(match[1]) * 1000
  if (!Number.isFinite(milliseconds)) return value
  return `${milliseconds.toFixed(6).replace(TRAILING_ZEROS_RE, '')}ms`
}

/**
 * Whether a value is usable as a CSS `<time>`.
 *
 * `isTime` accepts a bare `0` because that is how lengths behave, but the `<time>`
 * grammar makes the unit mandatory, so a unitless number is rejected here.
 *
 * This replaces the original's `/^[.\d]+[ms]{1,2}$/`, which accepted `1.2.3sm`
 * and rejected both `var(--delay)` and negative delays. The accepted set is
 * unchanged for every well-formed duration.
 */
const isDuration = (value: string): boolean => isTime(value) && !isNumber(value)

/**
 * Build the `transition-delay` / `transition-duration` handler: normalise to
 * milliseconds, consult the scale, then fall back to an arbitrary value.
 */
const durationProperty = (prefix: string, scale: ValueTable): HandlerFn => value => {
  const normalized = toMilliseconds(value.trim())
  const scaled = scale[normalized]
  if (scaled) return scaled
  return isDuration(normalized) ? `${prefix}-[${toArbitrary(normalized)}]` : ''
}

/* -------------------------------------------------------------------------- */
/* Timing functions                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Easing curves that have a named utility, keyed on the whitespace-free form.
 *
 * `ease` is the CSS initial value and has no Tailwind name of its own, so the
 * original passed the keyword straight through as `ease-[ease]`; that is kept.
 */
const TIMING_FUNCTIONS: ValueTable = Object.freeze({
  linear: 'ease-linear',
  'cubic-bezier(0.4,0,1,1)': 'ease-in',
  'cubic-bezier(0,0,0.2,1)': 'ease-out',
  'cubic-bezier(0.4,0,0.2,1)': 'ease-in-out',
  ease: 'ease-[ease]',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out'
})

/**
 * A `cubic-bezier()` call, the only curve Tailwind will take as an arbitrary
 * easing. `steps()` and `linear()` have no `ease-*` spelling, so they yield a
 * diagnostic instead of a broken class.
 *
 * The original tested `startsWith('cubic-bezier')`, which also let the bare word
 * `cubic-bezier` through and produced the invalid `ease-[cubic-bezier]`; the
 * opening parenthesis is required here.
 */
const CUBIC_BEZIER_RE = /^cubic-bezier\(/

/**
 * `transition-timing-function`.
 *
 * All whitespace is dropped first, so `cubic-bezier(0.4, 0, 0.2, 1)` and
 * `cubic-bezier(0.4,0,0.2,1)` both reach the table as the same key.
 */
const transitionTimingFunction: HandlerFn = value => {
  const compact = value.replace(/\s+/g, '')
  const named = TIMING_FUNCTIONS[compact]
  if (named) return named
  return CUBIC_BEZIER_RE.test(compact) ? `ease-[${toArbitrary(compact)}]` : ''
}

/* -------------------------------------------------------------------------- */
/* Properties with no utility                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Emit `[property:value]` for a property Tailwind has no utility for.
 *
 * The original applied no validation to these at all; the only added guard is on
 * an empty value, which could only ever produce the malformed `[animation-name:]`.
 */
/* -------------------------------------------------------------------------- */
/* Shorthands                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `transition` shorthand. Tailwind's six named shorthands are matched earlier by
 * `theme.defaults.transition`, leaving `none` and the arbitrary form.
 */
const transition: HandlerFn = value => {
  const trimmed = value.trim()
  if (trimmed === 'none') return 'transition-none'
  return trimmed === '' ? '' : `[transition:${toArbitrary(trimmed)}]`
}

/**
 * `animation` shorthand.
 *
 * Tailwind's four keyframe utilities (`animate-spin`, `-ping`, `-pulse`,
 * `-bounce`) are not matched: the CSS that produces them names a keyframes rule
 * this converter cannot see, so any non-`none` value becomes `animate-[…]`, as in
 * the original.
 */
const animation: HandlerFn = value => {
  const trimmed = value.trim()
  if (trimmed === 'none') return 'animate-none'
  return trimmed === '' ? '' : `animate-[${toArbitrary(trimmed)}]`
}

export const transitionHandlers: HandlerGroup = {
  transition,
  'transition-delay': durationProperty('delay', DELAY_VALUES),
  'transition-duration': durationProperty('duration', DURATION_VALUES),
  'transition-property': arbitraryProperty('transition-property'),
  'transition-timing-function': transitionTimingFunction,
  animation,
  'animation-delay': arbitraryProperty('animation-delay'),
  'animation-direction': arbitraryProperty('animation-direction'),
  'animation-duration': arbitraryProperty('animation-duration'),
  'animation-fill-mode': arbitraryProperty('animation-fill-mode'),
  'animation-iteration-count': arbitraryProperty('animation-iteration-count'),
  'animation-name': arbitraryProperty('animation-name'),
  'animation-play-state': arbitraryProperty('animation-play-state'),
  'animation-timing-function': arbitraryProperty('animation-timing-function')
}
