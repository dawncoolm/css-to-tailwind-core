/**
 * Interactivity handlers.
 *
 * Two very different populations live here.
 *
 * The first is the handful of properties Tailwind actually owns — `cursor`,
 * `pointer-events`, `resize`, `user-select`, and `appearance: none`. Each has a
 * closed set of legal values, so each is a plain lookup table.
 *
 * The second is a tail of properties Tailwind has no utility for at all: the
 * scroll-snap family, `scrollbar-width`, the CSS3 UI `nav-*` directional focus
 * properties, and the CSS3 Hyperlink Presentation `target*` properties (both of
 * the latter groups were dropped from their specifications and ship in no
 * browser). For those the only faithful output is Tailwind's arbitrary-property
 * escape hatch, `[property:value]`.
 *
 * Tailwind v4 renamed nothing in this group, so no handler branches on
 * `ctx.version`.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'
import { isUnit } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'

/**
 * Build a handler that always falls back to the arbitrary-property syntax.
 *
 * The factory runs once per property at module load, never per conversion, so
 * no allocation happens inside the returned handler.
 */
const arbitraryProperty =
  (property: string): HandlerFn =>
  value =>
    `[${property}:${toArbitrary(value)}]`

/**
 * As {@link arbitraryProperty}, but rejects values that are not dimensions.
 *
 * The original package guarded these properties with an `isUnit` that returned
 * `true` for every non-empty string, so the guard never fired. `isUnit` is a real
 * predicate now and the guard is kept deliberately: it is what stops
 * `scrollbar-width: potato` from becoming `[scrollbar-width:potato]`.
 */
const arbitraryUnitProperty =
  (property: string): HandlerFn =>
  value =>
    isUnit(value) ? `[${property}:${toArbitrary(value)}]` : ''

/**
 * Only `appearance: none` has a utility; `auto` and anything else fall through
 * to `[appearance:…]`. This matches the original, which never emitted
 * `appearance-auto`.
 */
const appearance: HandlerFn = value =>
  value === 'none' ? 'appearance-none' : `[appearance:${toArbitrary(value)}]`

/**
 * The eight cursors the original package knew.
 *
 * Tailwind ships far more (`grab`, `zoom-in`, the `*-resize` family, …), but
 * adding them would change output for values the original deliberately left
 * unconverted, so the table stays as it was. Values outside it produce no class
 * and therefore a diagnostic.
 */
const CURSOR: ValueTable = Object.freeze({
  auto: 'cursor-auto',
  default: 'cursor-default',
  pointer: 'cursor-pointer',
  wait: 'cursor-wait',
  text: 'cursor-text',
  move: 'cursor-move',
  help: 'cursor-help',
  'not-allowed': 'cursor-not-allowed'
})

const POINTER_EVENTS: ValueTable = Object.freeze({
  none: 'pointer-events-none',
  auto: 'pointer-events-auto'
})

/** Tailwind spells the two single-axis values `resize-x` / `resize-y`. */
const RESIZE: ValueTable = Object.freeze({
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize'
})

/** Tailwind's `user-select` utilities drop the property name entirely. */
const USER_SELECT: ValueTable = Object.freeze({
  none: 'select-none',
  text: 'select-text',
  all: 'select-all',
  auto: 'select-auto'
})

/** `target-new` from CSS3 Hyperlink Presentation: no Tailwind utility exists. */
const TARGET_NEW: ValueTable = Object.freeze({
  window: '[target-new:window]',
  tab: '[target-new:tab]',
  none: '[target-new:none]',
  initial: '[target-new:initial]'
})

/** `target-position`, likewise arbitrary-only. */
const TARGET_POSITION: ValueTable = Object.freeze({
  above: '[target-position:above]',
  behind: '[target-position:behind]',
  front: '[target-position:front]',
  back: '[target-position:back]',
  initial: '[target-position:initial]'
})

export const interactivityHandlers: HandlerGroup = Object.freeze({
  appearance,
  cursor: CURSOR,
  'pointer-events': POINTER_EVENTS,
  resize: RESIZE,

  // Scroll snapping: Tailwind's `snap-*` utilities cover only a subset of the
  // grammar (`snap-x`, `snap-start`, …) and the original never used them, so the
  // whole family goes through the arbitrary-property syntax unfiltered — the
  // values are keyword pairs such as `x mandatory`, not dimensions.
  'scroll-snap-align': arbitraryProperty('scroll-snap-align'),
  'scroll-snap-stop': arbitraryProperty('scroll-snap-stop'),
  'scroll-snap-type': arbitraryProperty('scroll-snap-type'),

  // `auto | thin | none`, all three of which `isUnit` accepts as size keywords.
  'scrollbar-width': arbitraryUnitProperty('scrollbar-width'),

  'user-select': USER_SELECT,

  // CSS3 UI directional focus navigation. The original guarded four of the five
  // with `isUnit` but left `nav-down` unguarded; that asymmetry is preserved
  // rather than "fixed", because tightening `nav-down` and loosening the other
  // four would both change output. Note the practical consequence now that
  // `isUnit` is real: an id target such as `#next` passes through `nav-down` but
  // is rejected by `nav-up` / `nav-left` / `nav-right`.
  'nav-down': arbitraryProperty('nav-down'),
  'nav-index': arbitraryUnitProperty('nav-index'),
  'nav-left': arbitraryUnitProperty('nav-left'),
  'nav-right': arbitraryUnitProperty('nav-right'),
  'nav-up': arbitraryUnitProperty('nav-up'),

  // CSS3 Hyperlink Presentation.
  target: arbitraryProperty('target'),
  'target-name': arbitraryProperty('target-name'),
  'target-new': TARGET_NEW,
  'target-position': TARGET_POSITION
})
