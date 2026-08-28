/**
 * SVG paint properties: `fill`, `stroke`, `stroke-width`.
 *
 * Tailwind exposes `fill-*` and `stroke-*` colour utilities plus a `stroke-*`
 * width scale. The two `stroke` families share a single prefix, so `stroke: red`
 * and `stroke-width: 2px` both emit `stroke-[…]`; Tailwind disambiguates them
 * from the value, and the original package relied on the same thing.
 */

import type { HandlerGroup } from '../registry.js'

import { isUnit } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'
import { colorHandler, colorKeywords } from './shared.js'

/**
 * `currentColor` is the only paint keyword with a dedicated utility. Both
 * spellings are listed because declaration values reach handlers with their
 * original casing.
 *
 * `transparent` and `none` are deliberately absent even though `fill-none` and
 * `stroke-none` exist: the original mapped neither, and `isColor` does not accept
 * `none` either, so `fill: none` degrades to a diagnostic rather than silently
 * changing meaning.
 */
const FILL_KEYWORDS = colorKeywords('fill', false)
const STROKE_KEYWORDS = colorKeywords('stroke', false)

export const svgHandlers: HandlerGroup = {
  fill: colorHandler('fill', FILL_KEYWORDS),

  stroke: colorHandler('stroke', STROKE_KEYWORDS),

  /**
   * Stroke widths reuse the `stroke-` prefix. The original interpolated the raw
   * value; it goes through `toArbitrary` here so a spaced `calc()` cannot
   * produce a class name containing a space.
   */
  'stroke-width': (value: string): string =>
    isUnit(value) ? `stroke-[${toArbitrary(value)}]` : ''
}
