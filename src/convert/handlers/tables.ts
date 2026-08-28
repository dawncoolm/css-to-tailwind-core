/**
 * Table properties.
 *
 * Tailwind only has utility families for `border-collapse` and `table-layout`.
 * The rest are emitted as arbitrary properties (`[caption-side:top]`), which is
 * what the original package did.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'

import { isUnit } from '../../utils/unit.js'
import { splitTopLevelWhitespace, toArbitrary } from '../../utils/value.js'

const BORDER_COLLAPSE: ValueTable = Object.freeze({
  collapse: 'border-collapse',
  separate: 'border-separate'
})

/**
 * The original listed exactly these four values. `inline-start` / `inline-end`
 * and the other CSS-wide keywords are not included, so they fall through to a
 * diagnostic as before.
 */
const CAPTION_SIDE: ValueTable = Object.freeze({
  top: '[caption-side:top]',
  bottom: '[caption-side:bottom]',
  inherit: '[caption-side:inherit]',
  initial: '[caption-side:initial]'
})

const EMPTY_CELLS: ValueTable = Object.freeze({
  hide: '[empty-cells:hide]',
  show: '[empty-cells:show]',
  inherit: '[empty-cells:inherit]',
  initial: '[empty-cells:initial]'
})

const TABLE_LAYOUT: ValueTable = Object.freeze({
  auto: 'table-auto',
  fixed: 'table-fixed'
})

/**
 * `border-spacing` takes one length (both axes) or two (horizontal, then
 * vertical), so the `isUnit` guard the original wrapped around the whole value
 * is applied per component instead.
 *
 * The original's `isUnit` accepted every non-empty string, so its single
 * whole-value check let `2px 4px` through by accident. Running the real
 * predicate over the whole string would now reject that legitimate declaration;
 * checking each component keeps it while still rejecting garbage.
 *
 * Tailwind's `border-spacing-*` scale is not consulted: the original emitted the
 * arbitrary property form for every value, including the ones on the scale.
 */
const borderSpacing: HandlerFn = (value: string): string => {
  const parts = splitTopLevelWhitespace(value)
  if (parts.length === 0 || parts.length > 2) return ''
  if (!parts.every(part => isUnit(part))) return ''
  return `[border-spacing:${toArbitrary(parts.join(' '))}]`
}

export const tableHandlers: HandlerGroup = {
  'border-collapse': BORDER_COLLAPSE,
  'border-spacing': borderSpacing,
  'caption-side': CAPTION_SIDE,
  'empty-cells': EMPTY_CELLS,
  'table-layout': TABLE_LAYOUT
}
