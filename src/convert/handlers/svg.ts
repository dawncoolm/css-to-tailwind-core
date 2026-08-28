/**
 * SVG paint properties: `fill`, `stroke`, `stroke-width`.
 *
 * Tailwind exposes `fill-*` and `stroke-*` colour utilities plus a `stroke-*`
 * width scale. The two `stroke` families share a single prefix, so `stroke: red`
 * and `stroke-width: 2px` both emit `stroke-[…]`; Tailwind disambiguates them
 * from the value, and the original package relied on the same thing.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'

import { isColor } from '../../utils/color.js'
import { isUnit } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'

/**
 * `currentColor` is the only paint keyword with a dedicated utility. Both
 * spellings are listed because declaration values reach handlers with their
 * original casing.
 *
 * `none` is deliberately absent even though `fill-none` and `stroke-none` exist:
 * the original never mapped it, and `isColor` does not accept `none` either, so
 * `fill: none` degrades to a diagnostic rather than silently changing meaning.
 */
const FILL_KEYWORDS: ValueTable = Object.freeze({
  currentColor: 'fill-current',
  currentcolor: 'fill-current'
})

const STROKE_KEYWORDS: ValueTable = Object.freeze({
  currentColor: 'stroke-current',
  currentcolor: 'stroke-current'
})

/**
 * Build a paint handler: keyword lookup first, then anything `isColor` accepts,
 * as an arbitrary value.
 *
 * Gradients are allowed because the original passed `joinLinearGradient` here.
 * A paint server reference (`url(#grad)`) is not a colour and so still yields a
 * diagnostic, which is also the original's behaviour.
 */
const paintHandler =
  (keywords: ValueTable, prefix: string): HandlerFn =>
  (value: string): string =>
    keywords[value] ?? (isColor(value, true) ? `${prefix}-[${toArbitrary(value)}]` : '')

export const svgHandlers: HandlerGroup = {
  fill: paintHandler(FILL_KEYWORDS, 'fill'),

  stroke: paintHandler(STROKE_KEYWORDS, 'stroke'),

  /**
   * Stroke widths reuse the `stroke-` prefix. The original interpolated the raw
   * value; it goes through `toArbitrary` here so a spaced `calc()` cannot
   * produce a class name containing a space.
   */
  'stroke-width': (value: string): string =>
    isUnit(value) ? `stroke-[${toArbitrary(value)}]` : ''
}
