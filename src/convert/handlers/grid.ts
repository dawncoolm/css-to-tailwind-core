/**
 * CSS Grid handlers: track definition, item placement, and gutters.
 *
 * Three shapes recur here and each gets one hoisted factory rather than a
 * closure that rebuilds its lookup table per call (registry rule 4):
 *
 * - `tableOrArbitrary` — a closed set of well known values, falling back to a
 *   `utility-[…]` arbitrary value (`grid-column`, `grid-auto-rows`, …).
 * - `arbitraryProperty` — no Tailwind utility exists at all, so the declaration
 *   is reproduced verbatim as `[property:value]` (`grid`, `grid-template`, …).
 * - `gapHandler` — a length, guarded by `isUnit`.
 *
 * The spacing ladders for `gap` / `column-gap` / `row-gap` live in the version
 * preset (`theme.defaults`) and are consulted by `convertDeclaration` before any
 * handler runs, so the handlers below only cover what the ladder misses.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'
import { isUnit } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'
import { arbitraryProperty } from './shared.js'

/**
 * Collapse internal whitespace so a lookup key matches however the author spaced
 * the declaration. The original package compared against the raw value and so
 * missed `span  2 / span  2`; canonical values resolve identically either way,
 * and the arbitrary fallback is unaffected because `toArbitrary` collapses
 * whitespace runs too.
 */
const normalizeSpace = (value: string): string => value.replace(/\s+/g, ' ').trim()

/** `grid-auto-columns` / `grid-auto-rows` — the four named track sizes. */
const buildAutoTrackTable = (utility: string): ValueTable =>
  Object.freeze({
    auto: `${utility}-auto`,
    'min-content': `${utility}-min`,
    'max-content': `${utility}-max`,
    'minmax(0, 1fr)': `${utility}-fr`
  })

/**
 * `grid-column` / `grid-row` — the `span n / span n` shorthand Tailwind emits for
 * `col-span-*` and `row-span-*`, plus `auto` and the full-width `1 / -1`.
 */
const buildSpanTable = (utility: string, maxSpan: number): ValueTable => {
  const table: Record<string, string> = { auto: `${utility}-auto` }
  for (let span = 1; span <= maxSpan; span++) {
    table[`span ${span} / span ${span}`] = `${utility}-span-${span}`
  }
  table['1 / -1'] = `${utility}-span-full`
  return Object.freeze(table)
}

/** `grid-column-start` and friends — numbered grid lines plus `auto`. */
const buildLineTable = (utility: string, maxLine: number): ValueTable => {
  const table: Record<string, string> = {}
  for (let line = 1; line <= maxLine; line++) {
    table[String(line)] = `${utility}-${line}`
  }
  table['auto'] = `${utility}-auto`
  return Object.freeze(table)
}

/**
 * `grid-template-columns` / `grid-template-rows` — the `repeat(n, minmax(0, 1fr))`
 * form Tailwind's `grid-cols-*` / `grid-rows-*` expand to. Keys are stored
 * whitespace-free because the handler strips whitespace before looking up.
 */
const buildRepeatTable = (utility: string, maxTracks: number): ValueTable => {
  const table: Record<string, string> = {}
  for (let tracks = 1; tracks <= maxTracks; tracks++) {
    table[`repeat(${tracks},minmax(0,1fr))`] = `${utility}-${tracks}`
  }
  table['none'] = `${utility}-none`
  return Object.freeze(table)
}

const AUTO_COLS_TABLE = buildAutoTrackTable('auto-cols')
const AUTO_ROWS_TABLE = buildAutoTrackTable('auto-rows')

/** Tailwind ships `col-span-1` … `col-span-12` but only `row-span-1` … `row-span-6`. */
const COLUMN_SPAN_TABLE = buildSpanTable('col', 12)
const ROW_SPAN_TABLE = buildSpanTable('row', 6)

/** Line numbers run one past the span count: 13 columns lines, 7 row lines. */
const COLUMN_START_TABLE = buildLineTable('col-start', 13)
const COLUMN_END_TABLE = buildLineTable('col-end', 13)
const ROW_START_TABLE = buildLineTable('row-start', 7)
const ROW_END_TABLE = buildLineTable('row-end', 7)

const GRID_COLS_TABLE = buildRepeatTable('grid-cols', 12)
const GRID_ROWS_TABLE = buildRepeatTable('grid-rows', 6)

/**
 * `grid-auto-flow` has a closed set of legal values and no arbitrary form, so an
 * unrecognised value yields `''` and the caller raises a diagnostic.
 *
 * The bare `dense` keyword is absent here because the original package did not
 * map it either; it is a genuine upstream gap, not an oversight in this port.
 */
const AUTO_FLOW_TABLE: ValueTable = Object.freeze({
  row: 'grid-flow-row',
  column: 'grid-flow-col',
  'row dense': 'grid-flow-row-dense',
  'column dense': 'grid-flow-col-dense'
})

/** Look the value up in `table`, else emit `utility-[value]`. */
const tableOrArbitrary =
  (utility: string, table: ValueTable): HandlerFn =>
  value =>
    table[normalizeSpace(value)] ?? `${utility}-[${toArbitrary(value)}]`

/**
 * `grid-template-*`: match after removing *all* whitespace, so
 * `repeat(3, minmax(0, 1fr))` and `repeat(3,minmax(0,1fr))` both reach
 * `grid-cols-3`. The arbitrary fallback keeps the underscores.
 */
const templateHandler =
  (utility: string, table: ValueTable): HandlerFn =>
  value => {
    const arbitrary = toArbitrary(value)
    return table[arbitrary.replace(/_/g, '')] ?? `${utility}-[${arbitrary}]`
  }

/** No utility exists: reproduce the declaration as an arbitrary property. */
/**
 * Gutter length. Unitless `0` is spelled `gap-0` rather than `gap-[0]`; anything
 * that is not a dimension is rejected, which is where the now-real `isUnit`
 * earns its keep.
 */
const gapHandler =
  (utility: string): HandlerFn =>
  value =>
    value === '0'
      ? `${utility}-0`
      : isUnit(value)
        ? `${utility}-[${toArbitrary(value)}]`
        : ''

const gapAll = gapHandler('gap')
const gapX = gapHandler('gap-x')
const gapY = gapHandler('gap-y')

export const gridHandlers: HandlerGroup = {
  // Whole-grid shorthands with no Tailwind equivalent.
  grid: arbitraryProperty('grid'),
  'grid-area': arbitraryProperty('grid-area'),
  'grid-template': arbitraryProperty('grid-template'),
  'grid-template-areas': arbitraryProperty('grid-template-areas'),
  // Not a real CSS property; carried over from the original package, which
  // emitted `[grid-rows:…]` for it.
  'grid-rows': arbitraryProperty('grid-rows'),

  // Implicit track sizing.
  'grid-auto-columns': tableOrArbitrary('auto-cols', AUTO_COLS_TABLE),
  'grid-auto-rows': tableOrArbitrary('auto-rows', AUTO_ROWS_TABLE),
  'grid-auto-flow': value => AUTO_FLOW_TABLE[normalizeSpace(value)] ?? '',

  // Explicit track definition.
  'grid-template-columns': templateHandler('grid-cols', GRID_COLS_TABLE),
  'grid-template-rows': templateHandler('grid-rows', GRID_ROWS_TABLE),

  // Item placement.
  'grid-column': tableOrArbitrary('col', COLUMN_SPAN_TABLE),
  'grid-row': tableOrArbitrary('row', ROW_SPAN_TABLE),
  'grid-column-start': tableOrArbitrary('col-start', COLUMN_START_TABLE),
  'grid-column-end': tableOrArbitrary('col-end', COLUMN_END_TABLE),
  'grid-row-start': tableOrArbitrary('row-start', ROW_START_TABLE),
  'grid-row-end': tableOrArbitrary('row-end', ROW_END_TABLE),

  // Gutters. The `grid-`prefixed spellings are the deprecated aliases; like the
  // original they skip the spacing ladder, which only covers `gap`/`column-gap`/
  // `row-gap` in the version preset.
  gap: gapAll,
  'column-gap': gapX,
  'row-gap': gapY,
  'grid-gap': gapAll,
  'grid-column-gap': gapX,
  'grid-row-gap': gapY
}
