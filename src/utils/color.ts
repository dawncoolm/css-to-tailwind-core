/**
 * Colour detection.
 *
 * The original package matched colours with a single regular expression that only
 * knew 3 and 6 digit hex, plus the comma separated `rgb()/rgba()/hsl()/hsla()`
 * forms. Anything else — `#11223344`, `rgb(0 0 0 / 50%)`, `oklch(…)` — was not a
 * colour, so `color: #11223344` silently produced nothing. This module accepts
 * the full CSS Color 4 surface.
 */

import { parseFunctionCall } from './value.js'

/** CSS named colours, plus the wide keywords that may appear in their place. */
const NAMED_COLORS: ReadonlySet<string> = new Set([
  'initial', 'inherit', 'unset', 'revert', 'currentcolor', 'transparent',
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque',
  'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood',
  'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk',
  'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray',
  'darkgrey', 'darkgreen', 'darkkhaki', 'darkmagenta', 'darkolivegreen',
  'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
  'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
  'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite',
  'gold', 'goldenrod', 'gray', 'grey', 'green', 'greenyellow', 'honeydew',
  'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush',
  'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgrey', 'lightgreen', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
  'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
  'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid',
  'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen',
  'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose',
  'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise',
  'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink', 'plum',
  'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue',
  'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna',
  'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
  'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise',
  'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen',
  // System colours that still resolve to a paint value.
  'canvas', 'canvastext', 'linktext', 'visitedtext', 'activetext', 'buttonface',
  'buttontext', 'buttonborder', 'field', 'fieldtext', 'highlight',
  'highlighttext', 'selecteditem', 'selecteditemtext', 'mark', 'marktext',
  'graytext', 'accentcolor', 'accentcolortext'
])

/** `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`. */
const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** Colour functions that always produce a colour, whatever their arguments. */
const COLOR_FUNCTIONS = new Set([
  'rgb', 'rgba', 'hsl', 'hsla', 'hwb',
  'lab', 'lch', 'oklab', 'oklch',
  'color', 'color-mix', 'device-cmyk', 'light-dark'
])

/** Gradient functions, recognised only when the caller opts in. */
const GRADIENT_FUNCTIONS = new Set([
  'linear-gradient', 'radial-gradient', 'conic-gradient',
  'repeating-linear-gradient', 'repeating-radial-gradient',
  'repeating-conic-gradient'
])


/**
 * Whether `value` denotes a colour.
 *
 * @param value Raw declaration value, whitespace is trimmed but not collapsed.
 * @param allowGradient Also accept gradient functions. `background-color` style
 *   properties pass `true` because Tailwind renders them through the same
 *   `bg-[…]` arbitrary value.
 */
export const isColor = (value: string, allowGradient = false): boolean => {
  const trimmed = value.trim()
  if (trimmed === '') return false
  if (NAMED_COLORS.has(trimmed.toLowerCase())) return true
  if (HEX_RE.test(trimmed)) return true

  const fn = parseFunctionCall(trimmed)
  if (!fn) return false
  if (COLOR_FUNCTIONS.has(fn[0])) return true
  return allowGradient && GRADIENT_FUNCTIONS.has(fn[0])
}

/** Whether `value` is one of the CSS gradient functions. */
export const isGradient = (value: string): boolean => {
  const fn = parseFunctionCall(value.trim())
  return fn !== null && GRADIENT_FUNCTIONS.has(fn[0])
}

/**
 * Whether `value` is a bare colour keyword (`transparent`, `currentColor`, …)
 * rather than a numeric colour. Handlers map these to dedicated Tailwind classes
 * such as `bg-transparent` and `text-current`.
 */
export const isColorKeyword = (value: string): boolean =>
  NAMED_COLORS.has(value.trim().toLowerCase())
