/**
 * Margin and padding.
 *
 * Both families share one shape: a value resolves against the spacing ladder
 * when `useAllDefaultValues` is on and falls back to an arbitrary value
 * otherwise. The shorthands additionally fold the 1-to-4 component CSS syntax
 * into the smallest set of axis utilities Tailwind can express.
 */

import type { ConversionContext } from '../context.js'
import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'

import { isUnit } from '../../utils/unit.js'
import {
  compactBrackets,
  hasNegative,
  splitTopLevelWhitespace,
  toArbitrary
} from '../../utils/value.js'

/** One resolved shorthand component. */
interface Component {
  /** `'-'` when the source value was negative, `''` otherwise. */
  readonly sign: '-' | ''
  /** Class suffix: a scale step (`4`, `px`) or a bracketed arbitrary value. */
  readonly suffix: string
}

/**
 * Resolve one component of a `margin` / `padding` shorthand.
 *
 * The scale lookup uses the *signed* value, exactly as the original did, so a
 * negative component never matches the ladder (which holds no negative keys) and
 * always ends up arbitrary: `margin: -1rem` stays `-m-[1rem]` rather than
 * collapsing to `-m-4` the way the `margin-top` longhand does.
 */
const resolveComponent = (value: string, ctx: ConversionContext): Component => {
  const [sign, magnitude] = hasNegative(value)
  const scaled = ctx.useAllDefaultValues ? ctx.theme.spacing[value] : undefined
  return { sign, suffix: scaled ?? `[${toArbitrary(magnitude)}]` }
}

/** `-` + base + side + `-` + suffix, e.g. `-mx-[10px]`. */
const emit = (base: string, side: string, component: Component): string =>
  `${component.sign}${base}${side}-${component.suffix}`

/**
 * Build the `margin` / `padding` shorthand handler.
 *
 * The original compared the *resolved* suffixes rather than the raw values when
 * deciding whether opposite edges can share an axis utility; that is preserved
 * here by comparing `sign + suffix` tokens.
 *
 * @param base `m` or `p`.
 * @param keywords Values answered before any parsing (`0`, `0px`, `auto`).
 */
const createShorthandHandler = (base: 'm' | 'p', keywords: ValueTable): HandlerFn =>
  (value, ctx) => {
    const keyword = keywords[value]
    if (keyword !== undefined) return keyword

    // Whitespace inside `calc()` / `clamp()` is dropped first so a function call
    // survives as a single component; the spaces that remain are separators.
    const parts = splitTopLevelWhitespace(compactBrackets(value))
    if (parts.length === 0 || parts.length > 4) return ''
    if (parts.some(part => !isUnit(part))) return ''

    const components = parts.map(part => resolveComponent(part, ctx))
    const tokens = components.map(component => `${component.sign}${component.suffix}`)

    const top = components[0]
    if (!top) return ''

    // One value, or several that resolve identically, collapse to the base class.
    if (new Set(tokens).size === 1) return emit(base, '', top)

    const right = components[1]
    if (!right) return ''
    if (components.length === 2) {
      return `${emit(base, 'x', right)} ${emit(base, 'y', top)}`
    }

    const bottom = components[2]
    if (!bottom) return ''
    if (components.length === 3) {
      if (tokens[0] === tokens[2]) {
        return `${emit(base, 'x', right)} ${emit(base, 'y', top)}`
      }
      return `${emit(base, 't', top)} ${emit(base, 'x', right)} ${emit(base, 'b', bottom)}`
    }

    const left = components[3]
    if (!left) return ''
    if (tokens[0] === tokens[2] && tokens[1] === tokens[3]) {
      return `${emit(base, 'x', right)} ${emit(base, 'y', top)}`
    }
    // Quirk carried over from css-to-tailwind-translator@1.2.8: when only the
    // horizontal pair matches it still emits a `y` utility built from the top
    // value, so the differing bottom value is lost. Left as-is because the
    // rewrite's parity suite pins the original output for this branch.
    if (tokens[0] === tokens[2] || tokens[1] === tokens[3]) {
      return `${emit(base, 'l', left)} ${emit(base, 'r', right)} ${emit(base, 'y', top)}`
    }
    return [
      emit(base, 't', top),
      emit(base, 'r', right),
      emit(base, 'b', bottom),
      emit(base, 'l', left)
    ].join(' ')
  }

/**
 * Build a `margin-*` longhand handler.
 *
 * Unlike the shorthand, the longhand strips the sign before consulting the
 * ladder, so `margin-top: -1rem` becomes `-mt-4`.
 */
const createMarginSideHandler = (side: 't' | 'r' | 'b' | 'l'): HandlerFn => {
  const keywords: ValueTable = Object.freeze({
    '0': `m${side}-0`,
    '0px': `m${side}-0`,
    auto: `m${side}-auto`
  })

  return (value, ctx) => {
    const keyword = keywords[value]
    if (keyword !== undefined) return keyword

    const normalized = compactBrackets(value)
    if (!isUnit(normalized)) return ''

    const [sign, magnitude] = hasNegative(normalized)
    const scaled = ctx.useAllDefaultValues ? ctx.theme.spacing[magnitude] : undefined
    return `${sign}m${side}-${scaled ?? `[${toArbitrary(magnitude)}]`}`
  }
}

/**
 * Build a `padding-*` longhand handler.
 *
 * No sign handling: padding cannot be negative, and the original never looked
 * for one here, so `padding-top: -1rem` stays the literal `pt-[-1rem]`.
 */
const createPaddingSideHandler = (side: 't' | 'r' | 'b' | 'l'): HandlerFn => {
  const keywords: ValueTable = Object.freeze({
    '0': `p${side}-0`,
    '0px': `p${side}-0`
  })

  return (value, ctx) => {
    const keyword = keywords[value]
    if (keyword !== undefined) return keyword

    const normalized = compactBrackets(value)
    if (!isUnit(normalized)) return ''

    const scaled = ctx.useAllDefaultValues ? ctx.theme.spacing[normalized] : undefined
    return `p${side}-${scaled ?? `[${toArbitrary(normalized)}]`}`
  }
}

/** `margin` answers `auto`; `padding` has no auto utility. */
const MARGIN_KEYWORDS: ValueTable = Object.freeze({
  '0': 'm-0',
  '0px': 'm-0',
  auto: 'm-auto'
})

const PADDING_KEYWORDS: ValueTable = Object.freeze({
  '0': 'p-0',
  '0px': 'p-0'
})

export const spacingHandlers: HandlerGroup = {
  margin: createShorthandHandler('m', MARGIN_KEYWORDS),
  'margin-top': createMarginSideHandler('t'),
  'margin-right': createMarginSideHandler('r'),
  'margin-bottom': createMarginSideHandler('b'),
  'margin-left': createMarginSideHandler('l'),

  padding: createShorthandHandler('p', PADDING_KEYWORDS),
  'padding-top': createPaddingSideHandler('t'),
  'padding-right': createPaddingSideHandler('r'),
  'padding-bottom': createPaddingSideHandler('b'),
  'padding-left': createPaddingSideHandler('l')
}
