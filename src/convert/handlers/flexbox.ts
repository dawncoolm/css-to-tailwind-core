/**
 * Flexbox and box alignment handlers.
 *
 * Two families live here:
 *
 * - The modern flexbox / box-alignment properties (`flex*`, `order`, `align-*`,
 *   `justify-*`, `place-*`), most of which have a closed set of legal values and
 *   are therefore plain lookup tables.
 * - The obsolete `-webkit-box` family (`box-align`, `box-orient`, …). Tailwind
 *   has no utilities for these at all, so every one of them is emitted as an
 *   arbitrary property declaration, exactly as the original package did.
 *
 * Version differences handled here: Tailwind v4 dropped the `flex-grow-*` /
 * `flex-shrink-*` spellings in favour of `grow-*` / `shrink-*`, including the
 * arbitrary forms. Nothing else in this group was renamed.
 */

import type { ConversionContext } from '../context.js'
import type { HandlerFn, HandlerGroup } from '../registry.js'
import { isUnit } from '../../utils/unit.js'
import { collapseWhitespace, toArbitrary } from '../../utils/value.js'
import { identityTable } from './shared.js'

/* ------------------------------------------------------------------------- *
 * Lookup tables. All hoisted to module scope and frozen so that no handler
 * allocates a table per call — the original rebuilt these on every invocation.
 * ------------------------------------------------------------------------- */

/** `flex` shorthands Tailwind ships a named utility for. */
const FLEX_SHORTHAND: Readonly<Record<string, string>> = Object.freeze({
  '1 1 0%': 'flex-1',
  '1 1 auto': 'flex-auto',
  '0 1 auto': 'flex-initial',
  none: 'flex-none'
})

/** v3 keeps the legacy `flex-grow` name; v4 only knows `grow`. */
const FLEX_GROW_V3: Readonly<Record<string, string>> = Object.freeze({
  '0': 'flex-grow-0',
  '1': 'flex-grow'
})

const FLEX_GROW_V4: Readonly<Record<string, string>> = Object.freeze({
  '0': 'grow-0',
  '1': 'grow'
})

const FLEX_SHRINK_V3: Readonly<Record<string, string>> = Object.freeze({
  '0': 'flex-shrink-0',
  '1': 'flex-shrink'
})

const FLEX_SHRINK_V4: Readonly<Record<string, string>> = Object.freeze({
  '0': 'shrink-0',
  '1': 'shrink'
})

/**
 * `order`. Tailwind models the two sentinel positions as `order-first` /
 * `order-last`, which compile to `order: -9999` / `order: 9999`, and `order: 0`
 * as `order-none`.
 */
const ORDER_VALUES: Readonly<Record<string, string>> = Object.freeze({
  '0': 'order-none',
  '1': 'order-1',
  '2': 'order-2',
  '3': 'order-3',
  '4': 'order-4',
  '5': 'order-5',
  '6': 'order-6',
  '7': 'order-7',
  '8': 'order-8',
  '9': 'order-9',
  '10': 'order-10',
  '11': 'order-11',
  '12': 'order-12',
  '9999': 'order-last',
  '-9999': 'order-first'
})

const ALIGN_CONTENT: Readonly<Record<string, string>> = Object.freeze({
  center: 'content-center',
  'flex-start': 'content-start',
  'flex-end': 'content-end',
  'space-between': 'content-between',
  'space-around': 'content-around',
  'space-evenly': 'content-evenly'
})

const ALIGN_ITEMS: Readonly<Record<string, string>> = Object.freeze({
  'flex-start': 'items-start',
  'flex-end': 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch'
})

const ALIGN_SELF: Readonly<Record<string, string>> = Object.freeze({
  auto: 'self-auto',
  'flex-start': 'self-start',
  'flex-end': 'self-end',
  center: 'self-center',
  stretch: 'self-stretch',
  baseline: 'self-baseline'
})

const JUSTIFY_CONTENT: Readonly<Record<string, string>> = Object.freeze({
  'flex-start': 'justify-start',
  'flex-end': 'justify-end',
  center: 'justify-center',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
  'space-evenly': 'justify-evenly'
})

const JUSTIFY_ITEMS: Readonly<Record<string, string>> = Object.freeze({
  start: 'justify-items-start',
  end: 'justify-items-end',
  center: 'justify-items-center',
  stretch: 'justify-items-stretch'
})

const JUSTIFY_SELF: Readonly<Record<string, string>> = Object.freeze({
  auto: 'justify-self-auto',
  start: 'justify-self-start',
  end: 'justify-self-end',
  center: 'justify-self-center',
  stretch: 'justify-self-stretch'
})

const PLACE_CONTENT: Readonly<Record<string, string>> = Object.freeze({
  center: 'place-content-center',
  start: 'place-content-start',
  end: 'place-content-end',
  'space-between': 'place-content-between',
  'space-around': 'place-content-around',
  'space-evenly': 'place-content-evenly',
  stretch: 'place-content-stretch'
})

const PLACE_ITEMS: Readonly<Record<string, string>> = Object.freeze({
  start: 'place-items-start',
  end: 'place-items-end',
  center: 'place-items-center',
  stretch: 'place-items-stretch'
})

const PLACE_SELF: Readonly<Record<string, string>> = Object.freeze({
  auto: 'place-self-auto',
  start: 'place-self-start',
  end: 'place-self-end',
  center: 'place-self-center',
  stretch: 'place-self-stretch'
})

const FLEX_DIRECTION: Readonly<Record<string, string>> = Object.freeze({
  row: 'flex-row',
  'row-reverse': 'flex-row-reverse',
  column: 'flex-col',
  'column-reverse': 'flex-col-reverse'
})

const FLEX_WRAP: Readonly<Record<string, string>> = Object.freeze({
  wrap: 'flex-wrap',
  'wrap-reverse': 'flex-wrap-reverse',
  nowrap: 'flex-nowrap'
})

/* ------------------------------------------------------------------------- *
 * Legacy `-webkit-box` family. No Tailwind utility exists, so each legal value
 * round-trips through an arbitrary property declaration.
 * ------------------------------------------------------------------------- */

/**
 * DIVERGENCE FROM THE ORIGINAL: upstream's `box-align` table was mis-transcribed
 * — `start` produced `[box-align:inherit]` and `end`/`center`/`baseline`/
 * `stretch` all produced `[box-align:unset]`, i.e. the emitted CSS did not match
 * the input value. Every sibling `box-*` table maps a value to itself, so the
 * intent is unambiguous and the values are corrected here. The key set is
 * unchanged.
 */
const BOX_ALIGN = identityTable('box-align', [
  'initial', 'start', 'end', 'center', 'baseline', 'stretch'
])

const BOX_DIRECTION = identityTable('box-direction', [
  'initial', 'normal', 'reverse', 'inherit'
])

const BOX_LINES = identityTable('box-lines', ['single', 'multiple', 'initial'])

const BOX_ORIENT = identityTable('box-orient', [
  'horizontal', 'vertical', 'inline-axis', 'block-axis', 'inherit', 'initial'
])

const BOX_PACK = identityTable('box-pack', ['start', 'end', 'center', 'justify', 'initial'])

/* ------------------------------------------------------------------------- *
 * Handlers
 * ------------------------------------------------------------------------- */

/**
 * `flex` shorthand.
 *
 * The named table is keyed on the canonical single-space spelling, so internal
 * whitespace is collapsed before the lookup. Upstream compared the raw value and
 * so fell through to an arbitrary class for `flex:  1  1  0%`; the arbitrary
 * output is identical either way because {@link toArbitrary} collapses runs too.
 */
const flex: HandlerFn = value => {
  const normalized = collapseWhitespace(value)
  return FLEX_SHORTHAND[normalized] ?? `flex-[${toArbitrary(value)}]`
}

/**
 * `flex-basis`.
 *
 * Emitted as an arbitrary property rather than a `basis-*` utility, matching the
 * original. The `isUnit` guard is upstream's; it now actually rejects garbage.
 */
const flexBasis: HandlerFn = value =>
  isUnit(value) ? `[flex-basis:${toArbitrary(value)}]` : ''

/** `flex-flow` has no Tailwind utility; upstream emitted the raw declaration. */
const flexFlow: HandlerFn = value => `[flex-flow:${toArbitrary(value)}]`

/** `flex-grow`, using the v4 `grow-*` names when targeting v4. */
const flexGrow: HandlerFn = (value, ctx: ConversionContext) => {
  if (!isUnit(value)) return ''
  const isV4 = ctx.version === 4
  const named = (isV4 ? FLEX_GROW_V4 : FLEX_GROW_V3)[value]
  if (named) return named
  return `${isV4 ? 'grow' : 'flex-grow'}-[${toArbitrary(value)}]`
}

/** `flex-shrink`, using the v4 `shrink-*` names when targeting v4. */
const flexShrink: HandlerFn = (value, ctx: ConversionContext) => {
  if (!isUnit(value)) return ''
  const isV4 = ctx.version === 4
  const named = (isV4 ? FLEX_SHRINK_V4 : FLEX_SHRINK_V3)[value]
  if (named) return named
  return `${isV4 ? 'shrink' : 'flex-shrink'}-[${toArbitrary(value)}]`
}

/** `order`, falling back to an arbitrary value for positions off the scale. */
const order: HandlerFn = value =>
  ORDER_VALUES[value] ?? (isUnit(value) ? `order-[${toArbitrary(value)}]` : '')

/** `box-flex`, `box-flex-group` and `box-ordinal-group` take a bare number. */
const boxFlex: HandlerFn = value => `[box-flex:${toArbitrary(value)}]`
const boxFlexGroup: HandlerFn = value => `[box-flex-group:${toArbitrary(value)}]`
const boxOrdinalGroup: HandlerFn = value => `[box-ordinal-group:${toArbitrary(value)}]`

export const flexboxHandlers: HandlerGroup = {
  flex,
  'flex-basis': flexBasis,
  'flex-direction': FLEX_DIRECTION,
  'flex-flow': flexFlow,
  'flex-grow': flexGrow,
  'flex-shrink': flexShrink,
  'flex-wrap': FLEX_WRAP,
  order,
  'align-content': ALIGN_CONTENT,
  'align-items': ALIGN_ITEMS,
  'align-self': ALIGN_SELF,
  'justify-content': JUSTIFY_CONTENT,
  'justify-items': JUSTIFY_ITEMS,
  'justify-self': JUSTIFY_SELF,
  'place-content': PLACE_CONTENT,
  'place-items': PLACE_ITEMS,
  'place-self': PLACE_SELF,
  'box-align': BOX_ALIGN,
  'box-direction': BOX_DIRECTION,
  'box-flex': boxFlex,
  'box-flex-group': boxFlexGroup,
  'box-lines': BOX_LINES,
  'box-ordinal-group': boxOrdinalGroup,
  'box-orient': BOX_ORIENT,
  'box-pack': BOX_PACK
}
