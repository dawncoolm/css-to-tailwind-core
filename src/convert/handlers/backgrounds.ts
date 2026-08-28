/**
 * `background-*` handlers.
 *
 * Tailwind funnels almost the whole background shorthand through one `bg-`
 * namespace, so nearly every table here shares that prefix. Anything that is not
 * a named Tailwind keyword falls through to an arbitrary class — `bg-[…]` for the
 * properties Tailwind owns, `[background-size:…]` for the one it does not.
 *
 * Tailwind v4 renamed nothing in this group, so no handler branches on
 * `ctx.version`.
 */

import type { HandlerGroup, ValueTable } from '../registry.js'
import { isColor } from '../../utils/color.js'
import { toArbitrary } from '../../utils/value.js'
import { BLEND_MODES, colorKeywords, prefixedTable } from './shared.js'

/**
 * `transparent` and `currentColor` get dedicated utilities; every other colour
 * becomes an arbitrary value. Both spellings of `currentColor` are listed
 * because declaration values reach handlers with their original casing.
 */
const COLOR_KEYWORDS = colorKeywords('bg')

const BACKGROUND_ATTACHMENT: ValueTable = Object.freeze({
  fixed: 'bg-fixed',
  local: 'bg-local',
  scroll: 'bg-scroll'
})

const BACKGROUND_BLEND_MODE = prefixedTable('bg-blend', BLEND_MODES)

const BACKGROUND_CLIP: ValueTable = Object.freeze({
  'border-box': 'bg-clip-border',
  'padding-box': 'bg-clip-padding',
  'content-box': 'bg-clip-content',
  text: 'bg-clip-text'
})

const BACKGROUND_ORIGIN: ValueTable = Object.freeze({
  'border-box': 'bg-origin-border',
  'padding-box': 'bg-origin-padding',
  'content-box': 'bg-origin-content'
})

/**
 * Only the single-keyword and two-keyword corner forms have utilities. A length
 * pair such as `10px 20px` has none and becomes `bg-[10px_20px]`.
 */
const BACKGROUND_POSITION: ValueTable = Object.freeze({
  bottom: 'bg-bottom',
  center: 'bg-center',
  left: 'bg-left',
  'left bottom': 'bg-left-bottom',
  'left top': 'bg-left-top',
  right: 'bg-right',
  'right bottom': 'bg-right-bottom',
  'right top': 'bg-right-top',
  top: 'bg-top'
})

const BACKGROUND_REPEAT: ValueTable = Object.freeze({
  repeat: 'bg-repeat',
  'no-repeat': 'bg-no-repeat',
  'repeat-x': 'bg-repeat-x',
  'repeat-y': 'bg-repeat-y',
  round: 'bg-repeat-round',
  space: 'bg-repeat-space'
})

const BACKGROUND_SIZE: ValueTable = Object.freeze({
  auto: 'bg-auto',
  cover: 'bg-cover',
  contain: 'bg-contain'
})

/**
 * Keywords the `background` shorthand accepts, gathered from every longhand it
 * can carry. A shorthand value is matched as a whole: `background: no-repeat`
 * resolves, `background: #fff url(a.png) no-repeat` does not and is emitted as
 * one arbitrary class, exactly as the original package did.
 */
const BACKGROUND_SHORTHAND: ValueTable = Object.freeze({
  ...BACKGROUND_ATTACHMENT,
  ...BACKGROUND_REPEAT,
  ...COLOR_KEYWORDS,
  none: 'bg-none',
  ...BACKGROUND_POSITION,
  ...BACKGROUND_SIZE
})

export const backgroundHandlers: HandlerGroup = {
  background: value => BACKGROUND_SHORTHAND[value] ?? `bg-[${toArbitrary(value)}]`,

  'background-attachment': BACKGROUND_ATTACHMENT,

  'background-blend-mode': BACKGROUND_BLEND_MODE,

  'background-clip': BACKGROUND_CLIP,

  /**
   * Gradients are allowed through `isColor`'s gradient opt-in because Tailwind
   * renders `background-color` and `background-image` from the same `bg-[…]`
   * arbitrary value. A value that is not a colour at all yields `''`, which the
   * caller reports as a diagnostic instead of inventing a class.
   */
  'background-color': value =>
    COLOR_KEYWORDS[value] ?? (isColor(value, true) ? `bg-[${toArbitrary(value)}]` : ''),

  'background-image': value => (value === 'none' ? 'bg-none' : `bg-[${toArbitrary(value)}]`),

  'background-origin': BACKGROUND_ORIGIN,

  'background-position': value => BACKGROUND_POSITION[value] ?? `bg-[${toArbitrary(value)}]`,

  'background-repeat': BACKGROUND_REPEAT,

  /**
   * `bg-` is already taken by colour and position, so an explicit size has to be
   * written as an arbitrary *property* rather than an arbitrary value.
   */
  'background-size': value =>
    BACKGROUND_SIZE[value] ?? `[background-size:${toArbitrary(value)}]`
}
