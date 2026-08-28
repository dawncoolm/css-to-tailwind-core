/**
 * Border, border radius, border image and outline properties.
 *
 * Tailwind only names a handful of border widths, styles and radii; everything
 * else becomes an arbitrary value. The per-side shorthands (`border-top`, …) and
 * the whole `border-image` family have no utility at all, so they are emitted as
 * arbitrary *properties* (`[border-top:1px_solid_red]`), which is what the
 * original package did too.
 *
 * The `border-width` ladder (`1px` -> `border`, `2px` -> `border-2`, …) is not
 * here: it lives in the version preset's `defaults` table and is applied by
 * `convertDeclaration` before the handler is ever reached.
 */

import type { ConversionContext } from '../context.js'
import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'

import { isColor } from '../../utils/color.js'
import { isUnit } from '../../utils/unit.js'
import {
  compactBrackets,
  splitTopLevelWhitespace,
  toArbitrary
} from '../../utils/value.js'

/** `border-style` keywords that have a dedicated Tailwind utility. */
const BORDER_STYLE: ValueTable = Object.freeze({
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
  double: 'border-double',
  none: 'border-none'
})

/** Colour keywords with a named `border-*` utility rather than an arbitrary value. */
const BORDER_COLOR_KEYWORDS: ValueTable = Object.freeze({
  transparent: 'border-transparent',
  currentColor: 'border-current',
  currentcolor: 'border-current'
})

/**
 * `outline-style` keywords, minus `none` which is version dependent.
 *
 * Tailwind has no `outline-solid` in v3, and the original package chose the
 * arbitrary-property spelling for every style it could not name; that choice is
 * preserved here so output stays byte-identical.
 */
const OUTLINE_STYLE: ValueTable = Object.freeze({
  dotted: 'outline-dotted',
  dashed: 'outline-dashed',
  double: 'outline-double',
  solid: '[outline-style:solid]',
  groove: '[outline-style:groove]',
  ridge: '[outline-style:ridge]',
  inset: '[outline-style:inset]',
  outset: '[outline-style:outset]'
})

/** `[<property>:<value>]` — the arbitrary property escape hatch. */
const arbitraryProperty = (property: string, value: string): string =>
  `[${property}:${toArbitrary(value)}]`

/** A property with no utility of its own: always an arbitrary property. */
const asArbitraryProperty = (property: string): HandlerFn => value =>
  arbitraryProperty(property, value)

/** `border-<side>-color`: no per-side colour utility exists, so emit the property. */
const sideColor = (property: string): HandlerFn => value =>
  isColor(value, true) ? arbitraryProperty(property, value) : ''

/**
 * `border-<side>-style`: accepted only for the keywords Tailwind knows on the
 * shorthand, but still emitted as an arbitrary property because the utilities
 * (`border-solid` …) set all four sides.
 */
const sideStyle = (property: string): HandlerFn => value =>
  BORDER_STYLE[value] !== undefined ? `[${property}:${value}]` : ''

/** `border-<side>-width`: `border-t-[3px]` and friends. */
const sideWidth = (prefix: string): HandlerFn => value =>
  isUnit(value) ? `${prefix}-[${toArbitrary(value)}]` : ''

/**
 * Class suffix for one corner radius length.
 *
 * `ctx.theme.radius` maps `0.25rem` to `''`, meaning the bare `rounded` class.
 * The original encoded that case as the literal string `'null'` and stripped it
 * back off with `.replace(/null$/, '')`; here the sentinel is an empty string,
 * which is falsy, so the "is there a preset" test has to check for `undefined`
 * explicitly rather than relying on `||`.
 */
const radiusSuffix = (value: string, ctx: ConversionContext): string => {
  const preset = ctx.useAllDefaultValues ? ctx.theme.radius[value] : undefined
  return preset ?? `-[${toArbitrary(value)}]`
}

/** `border-<corner>-radius`, e.g. `rounded-tl-lg`. */
const cornerRadius = (corner: string): HandlerFn => (value, ctx) => {
  if (value === '0' || value === '0px') return `rounded-${corner}-none`
  return isUnit(value) ? `rounded-${corner}${radiusSuffix(value, ctx)}` : ''
}

/**
 * The `border` shorthand, split into one utility per component.
 *
 * `1px solid red` becomes `border-[1px] border-solid border-[red]`.
 *
 * Two faithful-to-the-original quirks are kept deliberately:
 * - the named-colour lookup is keyed by the *whole* declaration value, so
 *   `border: transparent` yields `border-transparent` while
 *   `border: 1px solid transparent` yields `border-[transparent]`;
 * - components that are neither a dimension, a colour, nor a known style are
 *   dropped rather than failing the whole declaration.
 *
 * Divergence: the original collapsed whitespace inside the *first* bracket group
 * only, using a non-greedy regex that mangled nested calls and quoted strings.
 * `compactBrackets` does the same job for every group and copes with both, so
 * `rgba(0, 0, 0, .5)` still becomes the single component `rgba(0,0,0,.5)` the
 * original produced. Note that this also strips the separators out of the
 * space-separated colour syntax (`rgb(0 0 0 / 50%)` -> `rgb(000/50%)`); the
 * original dropped that value entirely, since its `isColor` never matched it.
 */
const border: HandlerFn = value => {
  const compacted = compactBrackets(value)
  const wholeValueKeyword = BORDER_COLOR_KEYWORDS[compacted]

  return splitTopLevelWhitespace(compacted)
    .map(part =>
      isUnit(part) || isColor(part)
        ? (wholeValueKeyword ?? BORDER_STYLE[part] ?? `border-[${toArbitrary(part)}]`)
        : (BORDER_STYLE[part] ?? '')
    )
    .filter(part => part !== '')
    .join(' ')
}

/** `border-color`: gradients are not accepted here, only real colours. */
const borderColor: HandlerFn = value =>
  BORDER_COLOR_KEYWORDS[value] ?? (isColor(value) ? `border-[${toArbitrary(value)}]` : '')

/**
 * The `border-radius` shorthand, expanded to per-corner utilities.
 *
 * CSS orders the corners top-left, top-right, bottom-right, bottom-left and
 * fills the missing ones from the opposite corner; the branches below reproduce
 * that for the one, two, three and four value forms.
 */
const borderRadius: HandlerFn = (value, ctx) => {
  if (value === '0' || value === '0px') return 'rounded-none'

  // The elliptical form (`10px / 20px`) has no per-corner spelling in Tailwind.
  if (value.includes('/')) return `rounded-[${toArbitrary(value)}]`

  const parts = splitTopLevelWhitespace(value)
  if (parts.some(part => !isUnit(part))) return ''

  const suffixes = parts.map(part => radiusSuffix(part, ctx))
  const [tl = '', tr = '', br = '', bl = ''] = suffixes

  switch (suffixes.length) {
    case 1:
      return `rounded${tl}`
    case 2:
      return `rounded-tl${tl} rounded-br${tl} rounded-tr${tr} rounded-bl${tr}`
    case 3:
      return `rounded-tl${tl} rounded-br${br} rounded-tr${tr} rounded-bl${tr}`
    case 4:
      return `rounded-tl${tl} rounded-br${br} rounded-tr${tr} rounded-bl${bl}`
    default:
      return ''
  }
}

/**
 * `outline-style`.
 *
 * Divergence from the original, which emitted `outline-[none]` for `none`:
 * Tailwind names that state, and the name changed between majors — `outline-none`
 * in v3, `outline-hidden` in v4.
 */
const outlineStyle: HandlerFn = (value, ctx) => {
  if (value === 'none') return ctx.version === 4 ? 'outline-hidden' : 'outline-none'
  return OUTLINE_STYLE[value] ?? ''
}

export const borderHandlers: HandlerGroup = {
  border,
  'border-bottom': asArbitraryProperty('border-bottom'),
  'border-bottom-color': sideColor('border-bottom-color'),
  'border-bottom-left-radius': cornerRadius('bl'),
  'border-bottom-right-radius': cornerRadius('br'),
  'border-bottom-style': sideStyle('border-bottom-style'),
  'border-bottom-width': sideWidth('border-b'),
  'border-color': borderColor,
  'border-image': asArbitraryProperty('border-image'),
  'border-image-outset': asArbitraryProperty('border-image-outset'),
  'border-image-repeat': asArbitraryProperty('border-image-repeat'),
  'border-image-slice': asArbitraryProperty('border-image-slice'),
  'border-image-source': asArbitraryProperty('border-image-source'),
  // The only member of the family the original guarded with `isUnit`.
  'border-image-width': value =>
    isUnit(value) ? arbitraryProperty('border-image-width', value) : '',
  'border-left': asArbitraryProperty('border-left'),
  'border-left-color': sideColor('border-left-color'),
  'border-left-style': sideStyle('border-left-style'),
  'border-left-width': sideWidth('border-l'),
  'border-radius': borderRadius,
  'border-right': asArbitraryProperty('border-right'),
  'border-right-color': sideColor('border-right-color'),
  'border-right-style': sideStyle('border-right-style'),
  'border-right-width': sideWidth('border-r'),
  'border-style': BORDER_STYLE,
  'border-top': asArbitraryProperty('border-top'),
  'border-top-color': sideColor('border-top-color'),
  'border-top-left-radius': cornerRadius('tl'),
  'border-top-right-radius': cornerRadius('tr'),
  'border-top-style': sideStyle('border-top-style'),
  'border-top-width': sideWidth('border-t'),
  'border-width': sideWidth('border'),
  // No `isColor` guard: the original accepted any `outline` shorthand verbatim.
  outline: value => `outline-[${toArbitrary(value)}]`,
  'outline-color': value => (isColor(value, true) ? `outline-[${toArbitrary(value)}]` : ''),
  // The original interpolated the raw value here; `toArbitrary` keeps a
  // `calc(1px + 2px)` from producing a class name with spaces in it.
  'outline-offset': value =>
    isUnit(value) ? `outline-offset-[${toArbitrary(value)}]` : '',
  'outline-style': outlineStyle,
  'outline-width': value => (isUnit(value) ? `outline-[${toArbitrary(value)}]` : '')
}
