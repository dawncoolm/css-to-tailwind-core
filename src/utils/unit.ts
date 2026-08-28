/**
 * Value classification.
 *
 * The original package shipped an `isUnit` whose first statement was
 * `if (str.length > 0) return true`, which made the whole unit table below it
 * unreachable: every non-empty string was accepted as a length. As a result
 * `height: potato` happily produced `h-[potato]`. This module is a real
 * implementation of the same predicate.
 */

import { parseFunctionCall } from './value.js'

const LENGTH_UNITS = new Set([
  // Font relative
  'em', 'rem', 'ex', 'rex', 'ch', 'rch', 'ic', 'ric', 'cap', 'rcap', 'lh', 'rlh',
  // Viewport relative
  'vw', 'vh', 'vi', 'vb', 'vmin', 'vmax',
  'svw', 'svh', 'svi', 'svb', 'svmin', 'svmax',
  'lvw', 'lvh', 'lvi', 'lvb', 'lvmin', 'lvmax',
  'dvw', 'dvh', 'dvi', 'dvb', 'dvmin', 'dvmax',
  // Container relative
  'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax',
  // Absolute
  'cm', 'mm', 'q', 'in', 'pt', 'pc', 'px'
])

const ANGLE_UNITS = new Set(['deg', 'grad', 'rad', 'turn'])
const TIME_UNITS = new Set(['s', 'ms'])
const FREQUENCY_UNITS = new Set(['hz', 'khz'])
const RESOLUTION_UNITS = new Set(['dpi', 'dpcm', 'dppx', 'x'])
const FLEX_UNITS = new Set(['fr'])

const DIMENSION_UNITS = new Set([
  ...LENGTH_UNITS,
  ...ANGLE_UNITS,
  ...TIME_UNITS,
  ...FREQUENCY_UNITS,
  ...RESOLUTION_UNITS,
  ...FLEX_UNITS
])

/**
 * Global CSS keywords plus the sizing keywords Tailwind understands. These are
 * accepted anywhere a dimension is accepted, because CSS accepts them there too.
 */
const SIZE_KEYWORDS = new Set([
  'auto', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
  'none', 'normal',
  'min-content', 'max-content', 'fit-content', 'stretch',
  'available', 'fill', 'fill-available', 'content',
  'thin', 'medium', 'thick'
])

/** Math and substitution functions whose result is a valid dimension. */
const VALUE_FUNCTIONS = new Set([
  'var', 'env', 'attr', 'calc', 'min', 'max', 'clamp',
  'round', 'mod', 'rem', 'abs', 'sign',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'pow', 'sqrt', 'hypot', 'log', 'exp',
  'fit-content', 'minmax', 'anchor-size', 'anchor'
])

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/
const DIMENSION_RE = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-Z%]+)$/

/** A plain number with no unit, e.g. `1.5`, `-2`, `.5`, `1e3`. */
export const isNumber = (value: string): boolean => NUMBER_RE.test(value.trim())

/** A percentage, e.g. `50%`. */
export const isPercentage = (value: string): boolean => {
  const trimmed = value.trim()
  return trimmed.endsWith('%') && isNumber(trimmed.slice(0, -1))
}

/** A custom property reference: `var(` followed by a `--` name. */
const VAR_REFERENCE_RE = /^var\(\s*--/

/** A CSS custom property reference, e.g. `var(--gap)`. */
export const isVar = (value: string): boolean => VAR_REFERENCE_RE.test(value.trim())

/**
 * A call to a function whose result can stand in for a dimension, e.g.
 * `calc(100% - 1rem)` or `clamp(1rem, 2vw, 3rem)`. Bracket balance is checked so
 * a truncated `calc(100%` is rejected.
 */
export const isValueFunction = (value: string): boolean => {
  const call = parseFunctionCall(value.trim())
  return call !== null && VALUE_FUNCTIONS.has(call[0])
}

/**
 * Whether `value` is a number immediately followed by one of `units`.
 *
 * `%` is only accepted when `allowPercentage` is set, because a percentage is a
 * length but never an angle or a duration.
 */
const hasDimensionUnit = (
  value: string,
  units: ReadonlySet<string>,
  allowPercentage: boolean
): boolean => {
  const match = DIMENSION_RE.exec(value)
  if (!match) return false
  const unit = (match[2] as string).toLowerCase()
  return unit === '%' ? allowPercentage : units.has(unit)
}

/** A length such as `12px`, `1.5rem`, `50%`, or a unitless `0`. */
export const isLength = (value: string): boolean => {
  const trimmed = value.trim()
  if (trimmed === '') return false
  // Only zero may omit its unit.
  if (isNumber(trimmed)) return Number(trimmed) === 0
  if (hasDimensionUnit(trimmed, LENGTH_UNITS, true)) return true
  return isValueFunction(trimmed)
}

/** An angle such as `45deg` or `.25turn`. */
export const isAngle = (value: string): boolean => {
  const trimmed = value.trim()
  if (trimmed === '0') return true
  return hasDimensionUnit(trimmed, ANGLE_UNITS, false) || isValueFunction(trimmed)
}

/** A duration such as `150ms` or `.3s`. */
export const isTime = (value: string): boolean => {
  const trimmed = value.trim()
  if (trimmed === '0') return true
  return hasDimensionUnit(trimmed, TIME_UNITS, false) || isValueFunction(trimmed)
}

/**
 * Whether a value can be placed where a dimension is expected.
 *
 * Accepts numbers, any CSS dimension unit, percentages, the global and sizing
 * keywords, `var()`, and the math functions. This is the replacement for the
 * original package's always-true `isUnit`.
 */
export const isUnit = (value: string): boolean => {
  const trimmed = value.trim()
  if (trimmed === '') return false
  if (SIZE_KEYWORDS.has(trimmed.toLowerCase())) return true
  if (isNumber(trimmed)) return true
  if (hasDimensionUnit(trimmed, DIMENSION_UNITS, true)) return true
  return isValueFunction(trimmed)
}
