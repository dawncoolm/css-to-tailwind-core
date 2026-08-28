/**
 * Sizing utilities: `width`, `height`, and their min/max variants.
 *
 * `width`/`height` resolve in three steps, exactly as the original package did:
 * the shared rem ladder (only when `useAllDefaultValues` is on), then the
 * fraction/keyword table, then an arbitrary value. The min/max properties have no
 * rem ladder of their own in the handler — their preset tables live in
 * `theme.defaults` and are applied by `convertDeclaration` before we are called —
 * so they only need their handful of named values plus the arbitrary fallback.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'
import { SIZE_FRACTIONS } from '../../theme/scales.js'
import { isUnit } from '../../utils/unit.js'
import { normalizeFractionPercentage, toArbitrary } from '../../utils/value.js'
import { arbitraryLengthProperty as logicalSize } from './shared.js'

/**
 * {@link SIZE_FRACTIONS} without one viewport key.
 *
 * The shared table maps both `100vw` and `100vh` to `screen`, but only the axis
 * matching the property may use it: `width: 100vh` is not `w-screen`. The
 * original expressed this by deleting the key from a table it rebuilt per call;
 * the two resulting tables are built once here instead.
 */
const fractionsWithout = (excluded: string): Readonly<Record<string, string>> => {
  const table: Record<string, string> = {}
  for (const [value, suffix] of Object.entries(SIZE_FRACTIONS)) {
    if (value !== excluded) table[value] = suffix
  }
  return Object.freeze(table)
}

const WIDTH_FRACTIONS = fractionsWithout('100vh')
const HEIGHT_FRACTIONS = fractionsWithout('100vw')

/** Build the `width`/`height` handler for one axis. */
const axisSize = (prefix: string, fractions: Readonly<Record<string, string>>): HandlerFn =>
  (value, ctx) => {
    if (!isUnit(value)) return ''
    const laddered = ctx.useAllDefaultValues ? ctx.theme.spacing[value] : undefined
    const fraction = fractions[normalizeFractionPercentage(value)]
    // Unlike the original, the arbitrary form is encoded, so `calc(100% - 1rem)`
    // becomes a class name Tailwind can actually parse.
    return `${prefix}-${laddered ?? fraction ?? `[${toArbitrary(value)}]`}`
  }

const MIN_WIDTH_VALUES: ValueTable = Object.freeze({
  '0px': 'min-w-0',
  '100%': 'min-w-full',
  'min-content': 'min-w-min',
  'max-content': 'min-w-max'
})

const MIN_HEIGHT_VALUES: ValueTable = Object.freeze({
  '0px': 'min-h-0',
  '100%': 'min-h-full',
  '100vh': 'min-h-screen'
})

const MAX_WIDTH_VALUES: ValueTable = Object.freeze({
  none: 'max-w-none',
  '100%': 'max-w-full',
  'min-content': 'max-w-min',
  'max-content': 'max-w-max'
})

const MAX_HEIGHT_VALUES: ValueTable = Object.freeze({
  '0px': 'max-h-0',
  '100%': 'max-h-full',
  '100vh': 'max-h-screen'
})

/**
 * Build a min/max handler: a small table of named values, then an arbitrary
 * value. `isUnit` gates both, so `max-width: potato` now yields nothing instead
 * of the `max-w-[potato]` the original produced.
 */
const constraintSize = (prefix: string, named: ValueTable): HandlerFn => value => {
  if (!isUnit(value)) return ''
  return named[value] ?? `${prefix}-[${toArbitrary(value)}]`
}

export const sizingHandlers: HandlerGroup = {
  width: axisSize('w', WIDTH_FRACTIONS),
  height: axisSize('h', HEIGHT_FRACTIONS),
  'min-width': constraintSize('min-w', MIN_WIDTH_VALUES),
  'min-height': constraintSize('min-h', MIN_HEIGHT_VALUES),
  'max-width': constraintSize('max-w', MAX_WIDTH_VALUES),
  'max-height': constraintSize('max-h', MAX_HEIGHT_VALUES),
  'logical-width': logicalSize('logical-width'),
  'logical-height': logicalSize('logical-height')
}
