/**
 * Transform utilities: the `transform` function list plus the 3D presentation
 * properties that surround it.
 *
 * `transform` is the only composite here. It is decomposed into one Tailwind
 * utility per transform function; if any function in the list has no Tailwind
 * equivalent the whole declaration falls back to `[transform:…]`, because a
 * partial translation would silently drop part of the visual result.
 *
 * The remaining six properties have no Tailwind utility at all in either preset,
 * so they are emitted as arbitrary property declarations, exactly as the original
 * package did.
 */

import type { ConversionContext } from '../context.js'
import { resolveSubValue } from '../context.js'
import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'
import { isUnit } from '../../utils/unit.js'
import {
  hasNegative,
  splitTopLevel,
  normalizeFractionPercentage,
  parseFunctionCall,
  splitTopLevelWhitespace,
  toArbitrary
} from '../../utils/value.js'
import { identityTable } from './shared.js'

/* -------------------------------------------------------------------------- */
/* Shared value normalisation                                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* transform                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One transform function, already split into its comma separated arguments.
 *
 * @returns The space separated classes for the function, or `null` when it has
 *   no Tailwind spelling, which makes the whole declaration arbitrary.
 */
type TransformFn = (args: readonly string[], ctx: ConversionContext) => string | null

/** Safe indexed read under `noUncheckedIndexedAccess`. */
const at = (args: readonly string[], index: number): string => args[index] ?? ''

/**
 * `scale-…`, `scale-x-…` or `scale-y-…`. Scale has no negative Tailwind
 * spelling, so the sign stays inside the value, as in the original.
 */
const scaleClass = (ctx: ConversionContext, axis: '' | 'x-' | 'y-', value: string): string =>
  `scale-${axis}${resolveSubValue(ctx, 'scale', value, ctx.theme.scale)}`

/** `rotate-…`, with a leading minus moved in front of the class name. */
const rotateClass = (ctx: ConversionContext, value: string): string => {
  const [sign, magnitude] = hasNegative(value)
  return `${sign}rotate-${resolveSubValue(ctx, 'rotate', magnitude, ctx.theme.rotate)}`
}

/** `skew-x-…` / `skew-y-…`, with the sign moved in front of the class name. */
const skewClass = (ctx: ConversionContext, axis: 'x' | 'y', value: string): string => {
  const [sign, magnitude] = hasNegative(value)
  return `${sign}skew-${axis}-${resolveSubValue(ctx, 'skew', magnitude, ctx.theme.skew)}`
}

/**
 * `translate-x-…` / `translate-y-…`. The magnitude is normalised before both the
 * theme lookup and the arbitrary fallback, so `33.333333%` becomes `1/3` rather
 * than `[33.333333%]`.
 */
const translateClass = (
  ctx: ConversionContext,
  axis: 'x' | 'y',
  value: string
): string => {
  const [sign, raw] = hasNegative(value)
  const magnitude = normalizeFractionPercentage(raw)
  return `${sign}translate-${axis}-${resolveSubValue(ctx, 'translate', magnitude, ctx.theme.translate)}`
}

/**
 * Map a one-or-two argument function onto the x/y axis pair, the shape shared by
 * `translate()` and `skew()`. A third argument means the 3D variant, which has no
 * Tailwind utility.
 */
const axisPair = (
  build: (ctx: ConversionContext, axis: 'x' | 'y', value: string) => string
): TransformFn => (args, ctx) => {
  if (args.length < 1 || args.length > 2) return null
  const x = build(ctx, 'x', at(args, 0))
  return args.length === 1 ? x : `${x} ${build(ctx, 'y', at(args, 1))}`
}

/** A function taking exactly one argument. */
const single = (
  build: (ctx: ConversionContext, value: string) => string
): TransformFn => (args, ctx) => (args.length === 1 ? build(ctx, at(args, 0)) : null)

/** The two spellings of a zero rotation the original accepted. */
const isZeroAngle = (value: string): boolean => value === '0' || value === '0deg'

/**
 * The transform functions Tailwind can express, keyed by lower-cased name.
 *
 * Hoisted and frozen: the original rebuilt this record — and the four scale
 * tables it closed over — on every single `transform` declaration.
 *
 * Everything absent here (`matrix`, `translate3d`, `rotateX`, `perspective`, …)
 * returns `undefined` from the lookup and sends the declaration to the arbitrary
 * fallback, which is what the original did too.
 */
const TRANSFORM_FUNCTIONS: Readonly<Record<string, TransformFn>> = Object.freeze({
  scale: (args, ctx) => {
    if (args.length === 1) return scaleClass(ctx, '', at(args, 0))
    // Three arguments is `scale3d`-shaped and has no utility; the original
    // rejected exactly that case. Anything above two is not valid CSS either, so
    // it is rejected here as well rather than mapped onto the y axis twice.
    if (args.length !== 2) return null
    const x = at(args, 0)
    const y = at(args, 1)
    // A uniform scale collapses to the single-axis utility.
    if (x === y) return scaleClass(ctx, '', x)
    return `${scaleClass(ctx, 'x-', x)} ${scaleClass(ctx, 'y-', y)}`
  },
  scalex: single((ctx, value) => scaleClass(ctx, 'x-', value)),
  scaley: single((ctx, value) => scaleClass(ctx, 'y-', value)),

  rotate: (args, ctx) => {
    if (args.length === 1) return rotateClass(ctx, at(args, 0))
    // `rotate(0, 0, Xdeg)` is a rotation about the z axis written in the
    // three-argument form, which Tailwind's `rotate-*` covers. Any other
    // multi-argument rotation is a real 3D rotation and has no utility.
    if (args.length !== 3) return null
    if (!isZeroAngle(at(args, 0)) || !isZeroAngle(at(args, 1))) return null
    return rotateClass(ctx, at(args, 2))
  },
  rotatez: single(rotateClass),

  translate: axisPair(translateClass),
  translatex: single((ctx, value) => translateClass(ctx, 'x', value)),
  translatey: single((ctx, value) => translateClass(ctx, 'y', value)),

  skew: axisPair(skewClass),
  skewx: single((ctx, value) => skewClass(ctx, 'x', value)),
  skewy: single((ctx, value) => skewClass(ctx, 'y', value))
})

/** The whole declaration as one arbitrary property, used when anything fails. */
const arbitraryTransform = (value: string): string => `[transform:${toArbitrary(value)}]`

/**
 * `transform: translateX(1rem) rotate(45deg)` -> `translate-x-4 rotate-45`.
 *
 * No bare `transform` marker class is emitted. Every Tailwind v3 transform
 * utility already writes the full `transform` property itself, and
 * `css-to-tailwind-translator@1.2.8` does not emit one either — the marker in its
 * README is left over from an older release.
 *
 * Two deliberate differences from the original:
 * - Components are split with {@link splitTopLevelWhitespace} and arguments with
 *   {@link splitTopLevel} rather than by stripping underscores inside brackets
 *   and splitting on `)_` / `,`. The original mangled nested calls such as
 *   `translate(calc(1px + 2px), 3px)`; bracket-aware splitting does not.
 * - Empty results are filtered out, so a trailing component the original could
 *   not read no longer leaves a stray separator in the class list.
 */
const transform: HandlerFn = (value, ctx) => {
  if (value === 'none') return 'transform-none'

  const classes: string[] = []

  for (const component of splitTopLevelWhitespace(value)) {
    const call = parseFunctionCall(component)
    // Not functional notation. The original dropped such a component silently
    // rather than treating the declaration as arbitrary; that is preserved.
    if (!call) continue

    const rawArgs = call[1]
    if (rawArgs.trim() === '') continue

    const fn = TRANSFORM_FUNCTIONS[call[0]]
    if (!fn) return arbitraryTransform(value)

    const args = splitTopLevel(rawArgs, ',')
      .map(argument => argument.trim())
      .filter(argument => argument !== '')

    const produced = fn(args, ctx)
    if (produced === null) return arbitraryTransform(value)

    classes.push(...produced.split(' '))
  }

  const unique = [...new Set(classes)].filter(className => className !== '')
  return unique.join(' ')
}

/* -------------------------------------------------------------------------- */
/* The remaining transform properties                                          */
/* -------------------------------------------------------------------------- */

/**
 * `transform-origin` keywords, keyed on the encoded value so `top right`
 * matches `top_right`. Tailwind has no utility for the two-value forms written
 * the other way round (`right top`), and neither did the original — those land
 * on `origin-[…]`, which is still correct CSS.
 */
const TRANSFORM_ORIGIN_VALUES: ValueTable = Object.freeze({
  center: 'origin-center',
  top: 'origin-top',
  top_right: 'origin-top-right',
  right: 'origin-right',
  bottom_right: 'origin-bottom-right',
  bottom: 'origin-bottom',
  bottom_left: 'origin-bottom-left',
  left: 'origin-left',
  top_left: 'origin-top-left'
})

const transformOrigin: HandlerFn = value => {
  const encoded = toArbitrary(value)
  if (encoded === '') return ''
  return TRANSFORM_ORIGIN_VALUES[encoded] ?? `origin-[${encoded}]`
}

/**
 * Tailwind has no `transform-style` utility in either preset, so the declaration
 * is reproduced verbatim. `initial` is listed explicitly because the caller only
 * synthesises `[property:initial]` when the handler declines the value, and
 * keeping it here matches the original byte for byte.
 */
const TRANSFORM_STYLE_VALUES = identityTable('transform-style', [
  'flat', 'preserve-3d', 'initial'
])

const BACKFACE_VISIBILITY_VALUES: ValueTable = Object.freeze({
  visible: '[backface-visibility:visible]',
  hidden: '[backface-visibility:hidden]'
})

/**
 * The standalone `rotate` property (the individual transform, not the function).
 * Tailwind's `rotate-*` utilities compile to `transform`, not to `rotate`, so the
 * two are not interchangeable and the declaration stays arbitrary.
 */
const rotate: HandlerFn = value => (value === '' ? '' : `[rotate:${toArbitrary(value)}]`)

/**
 * `perspective` takes a length. `isUnit` gates it as in the original, where the
 * guard was inert because `isUnit` returned true for everything.
 *
 * Unlike the original the value is encoded, so `perspective: calc(50px + 1rem)`
 * produces a class name Tailwind can parse instead of one containing spaces.
 */
const perspective: HandlerFn = value =>
  isUnit(value) ? `[perspective:${toArbitrary(value)}]` : ''

const perspectiveOrigin: HandlerFn = value =>
  value === '' ? '' : `[perspective-origin:${toArbitrary(value)}]`

export const transformHandlers: HandlerGroup = {
  transform,
  'transform-origin': transformOrigin,
  'transform-style': TRANSFORM_STYLE_VALUES,
  rotate,
  perspective,
  'perspective-origin': perspectiveOrigin,
  'backface-visibility': BACKFACE_VISIBILITY_VALUES
}
