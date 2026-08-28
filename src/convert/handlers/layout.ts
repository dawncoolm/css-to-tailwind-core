/**
 * Layout properties: display, positioning, insets, overflow, columns and the
 * multi-column / fragmentation family.
 *
 * Anything Tailwind has no utility for is emitted as an arbitrary property
 * (`[column-span:all]`), which is what the original package did too.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'

import { isNumber, isUnit, isVar } from '../../utils/unit.js'
import {
  hasNegative,
  normalizeFractionPercentage,
  toArbitrary
} from '../../utils/value.js'
import { sizeFractionsWithout } from '../../theme/scales.js'
import {
  arbitraryColorProperty,
  arbitraryLengthProperty as arbitraryLength,
  arbitraryProperty,
  identityTable
} from './shared.js'

/* -------------------------------------------------------------------------- */
/* Shared handler shapes                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Emit `[property:value]` unconditionally.
 *
 * Built once per property at module scope; the original allocated the closure
 * and the arbitrary string on every call.
 */
/**
 * Emit `[property:value]` only for values that read as a dimension.
 *
 * The original guarded these with `isUnit`, which always returned `true`. The
 * guard is real now, so `column-width: potato` correctly yields nothing.
 */
/* -------------------------------------------------------------------------- */
/* Insets                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Keyword and fraction suffixes accepted by the inset utilities.
 *
 * This is the sizing fraction table minus `100vw` / `100vh`: the original
 * excluded both from `top`/`right`/`bottom`/`left` because `top-screen` is not a
 * Tailwind class.
 */
const INSET_KEYWORDS = sizeFractionsWithout('100vw', '100vh')

/**
 * Build the handler for one inset property.
 *
 * The spacing ladder itself lives in the version preset (`theme.defaults.top`)
 * and is consulted before the handler runs, so this only has to cover the
 * fractions, the keywords and the arbitrary fallback.
 *
 * Diverges from the original by routing the arbitrary value through
 * `toArbitrary`, so `top: calc(100% - 1rem)` produces a class name without
 * spaces in it.
 */
const insetHandler =
  (property: string): HandlerFn =>
  (value: string): string => {
    if (!isUnit(value)) return ''
    const [sign, magnitude] = hasNegative(value)
    const suffix = INSET_KEYWORDS[normalizeFractionPercentage(magnitude)]
    return `${sign}${property}-${suffix ?? `[${toArbitrary(magnitude)}]`}`
  }

/* -------------------------------------------------------------------------- */
/* Lookup tables                                                               */
/* -------------------------------------------------------------------------- */

/** `object-position`, keyed by the arbitrary-encoded value (`left bottom` -> `left_bottom`). */
const OBJECT_POSITIONS: ValueTable = Object.freeze({
  bottom: 'object-bottom',
  center: 'object-center',
  left: 'object-left',
  left_bottom: 'object-left-bottom',
  left_top: 'object-left-top',
  right: 'object-right',
  right_bottom: 'object-right-bottom',
  right_top: 'object-right-top',
  top: 'object-top'
})

/** The only `z-index` values with a named utility. */
const Z_INDEX_VALUES: ValueTable = Object.freeze({
  '0': 'z-0',
  '10': 'z-10',
  '20': 'z-20',
  '30': 'z-30',
  '40': 'z-40',
  '50': 'z-50',
  auto: 'z-auto'
})

/** `display` values, exported because the class sorter needs the utility names. */
export const DISPLAY_VALUES: ValueTable = Object.freeze({
  block: 'block',
  'inline-block': 'inline-block',
  inline: 'inline',
  flex: 'flex',
  'inline-flex': 'inline-flex',
  table: 'table',
  'inline-table': 'inline-table',
  'table-caption': 'table-caption',
  'table-cell': 'table-cell',
  'table-column': 'table-column',
  'table-column-group': 'table-column-group',
  'table-footer-group': 'table-footer-group',
  'table-header-group': 'table-header-group',
  'table-row-group': 'table-row-group',
  'table-row': 'table-row',
  'flow-root': 'flow-root',
  grid: 'grid',
  'inline-grid': 'inline-grid',
  contents: 'contents',
  'list-item': 'list-item',
  none: 'hidden'
})

/* -------------------------------------------------------------------------- */
/* Group                                                                       */
/* -------------------------------------------------------------------------- */

export const layoutHandlers: HandlerGroup = {
  'aspect-ratio': arbitraryProperty('aspect-ratio'),

  /** v4 renamed both to `box-decoration-*`, so the class comes from the preset. */
  'box-decoration-break': (value, ctx) => {
    if (value === 'slice') return ctx.theme.utilities.decorationSlice
    if (value === 'clone') return ctx.theme.utilities.decorationClone
    return ''
  },

  'box-sizing': {
    'border-box': 'box-border',
    'content-box': 'box-content'
  },

  clear: {
    left: 'clear-left',
    right: 'clear-right',
    both: 'clear-both',
    none: 'clear-none'
  },

  // Tailwind's `columns-*` utilities were not wired up by the original package;
  // every multi-column property falls through to an arbitrary property.
  columns: arbitraryProperty('columns'),
  'column-count': arbitraryProperty('column-count'),

  'column-fill': identityTable('column-fill', ['balance', 'auto', 'initial']),

  'column-span': arbitraryProperty('column-span'),
  'column-width': arbitraryLength('column-width'),
  'column-rule': arbitraryProperty('column-rule'),

  'column-rule-color': arbitraryColorProperty('column-rule-color'),

  'column-rule-style': identityTable('column-rule-style', [
    'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset',
    'initial'
  ]),

  'column-rule-width': arbitraryLength('column-rule-width'),

  'contain-intrinsic-size': arbitraryProperty('contain-intrinsic-size'),
  'content-visibility': arbitraryProperty('content-visibility'),

  display: DISPLAY_VALUES,

  float: {
    right: 'float-right',
    left: 'float-left',
    none: 'float-none'
  },

  isolation: {
    isolate: 'isolate',
    auto: 'isolation-auto'
  },

  'object-fit': {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down'
  },

  // Keyed on the encoded value so `left bottom` and `left  bottom` both match.
  'object-position': (value: string): string => OBJECT_POSITIONS[toArbitrary(value)] ?? '',

  overflow: {
    auto: 'overflow-auto',
    hidden: 'overflow-hidden',
    visible: 'overflow-visible',
    scroll: 'overflow-scroll'
  },

  'overflow-anchor': arbitraryProperty('overflow-anchor'),

  'overflow-x': {
    auto: 'overflow-x-auto',
    hidden: 'overflow-x-hidden',
    visible: 'overflow-x-visible',
    scroll: 'overflow-x-scroll'
  },

  'overflow-y': {
    auto: 'overflow-y-auto',
    hidden: 'overflow-y-hidden',
    visible: 'overflow-y-visible',
    scroll: 'overflow-y-scroll'
  },

  'overscroll-behavior': {
    auto: 'overscroll-auto',
    contain: 'overscroll-contain',
    none: 'overscroll-none'
  },

  'overscroll-behavior-x': {
    auto: 'overscroll-x-auto',
    contain: 'overscroll-x-contain',
    none: 'overscroll-x-none'
  },

  'overscroll-behavior-y': {
    auto: 'overscroll-y-auto',
    contain: 'overscroll-y-contain',
    none: 'overscroll-y-none'
  },

  position: {
    static: 'static',
    fixed: 'fixed',
    absolute: 'absolute',
    relative: 'relative',
    sticky: 'sticky'
  },

  top: insetHandler('top'),
  right: insetHandler('right'),
  bottom: insetHandler('bottom'),
  left: insetHandler('left'),

  visibility: {
    visible: 'visible',
    hidden: 'invisible'
  },

  /**
   * Diverges from the original, which guarded the arbitrary branch with
   * `typeof val === 'number'`. Handler values are always strings, so that branch
   * was unreachable and every off-scale `z-index` silently vanished. The guard
   * now tests what it meant to test.
   */
  'z-index': (value: string): string =>
    Z_INDEX_VALUES[value] ?? (isNumber(value) || isVar(value) ? `z-[${toArbitrary(value)}]` : ''),

  'page-break-after': identityTable('page-break-after', [
    'auto', 'always', 'avoid', 'left', 'right', 'inherit', 'initial'
  ]),

  'page-break-before': identityTable('page-break-before', [
    'auto', 'always', 'avoid', 'left', 'right', 'inherit', 'initial'
  ]),

  'page-break-inside': identityTable('page-break-inside', [
    'auto', 'avoid', 'inherit', 'initial'
  ]),
}
