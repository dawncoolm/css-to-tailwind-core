/**
 * Typography handlers.
 *
 * Fonts, text decoration, lists, and the writing-direction properties. Most of
 * these are closed keyword sets and are expressed as static tables; only the
 * handful that take a length, a colour or a free-form value need a function.
 *
 * Note on `initial` / `inherit`: `convertDeclaration` consults the handler first
 * and falls back to `[property:value]` when it yields nothing, so the tables
 * below only spell those keywords out where the original package did.
 */

import type { HandlerGroup, ValueTable } from '../registry.js'
import { isNumber, isUnit } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'
import { LINE_HEIGHT_RATIOS } from '../../theme/scales.js'
import {
  arbitraryColorProperty,
  arbitraryLengthProperty,
  arbitraryProperty,
  arbitraryValue,
  colorHandler,
  colorKeywords,
  identityTable
} from './shared.js'

/* ------------------------------------------------------------------ *
 * Shared handler factories
 * ------------------------------------------------------------------ */

/**
 * Emit Tailwind's arbitrary *property* escape hatch, `[prop:value]`, for a CSS
 * property that has no utility at all.
 */
/**
 * Same as {@link arbitraryProperty} but guarded by {@link isUnit}, for the
 * properties whose value must be a length or a number.
 *
 * The original package guarded these too, but its `isUnit` returned `true` for
 * every non-empty string; the guard only starts rejecting garbage here.
 */
/* ------------------------------------------------------------------ *
 * Hoisted lookup tables
 *
 * These are consulted from inside handler functions, so they must not be
 * re-allocated per call.
 * ------------------------------------------------------------------ */

/** Colour keywords with a dedicated `text-*` utility. */
const TEXT_COLOR_KEYWORDS = colorKeywords('text')

/** `letter-spacing` ladder. Applies regardless of `useAllDefaultValues`, as in the original. */
const LETTER_SPACING_SCALE: ValueTable = Object.freeze({
  '-0.05em': 'tracking-tighter',
  '-0.025em': 'tracking-tight',
  '0em': 'tracking-normal',
  '0.025em': 'tracking-wide',
  '0.05em': 'tracking-wider',
  '0.1em': 'tracking-widest'
})

/**
 * Unitless `line-height` ratios. The rem-valued `leading-3` … `leading-10`
 * steps live in the version preset and are applied by `convertDeclaration`.
 */

/**
 * `font-weight` keywords CSS accepts alongside the numeric scale.
 *
 * Divergence from the original: it relied on its always-true `isUnit` to let
 * these through. The real `isUnit` only knows `normal`, so `bold` / `bolder` /
 * `lighter` would now be dropped as garbage. They are legal CSS, so they are
 * listed explicitly instead. (`normal` and `bold` normally never reach the
 * handler — the preset maps them to `font-normal` / `font-bold` — but they do
 * when `useAllDefaultValues` is off, which is exactly the case being preserved.)
 */
const FONT_WEIGHT_KEYWORDS: ReadonlySet<string> = new Set([
  'normal',
  'bold',
  'bolder',
  'lighter'
])

const LIST_STYLE_POSITIONS: ValueTable = Object.freeze({
  inside: 'list-inside',
  outside: 'list-outside'
})

const LIST_STYLE_TYPES: ValueTable = Object.freeze({
  none: 'list-none',
  disc: 'list-disc',
  decimal: 'list-decimal'
})

/**
 * Tailwind v3's `text-overflow` utilities.
 *
 * Kept at the v3 spelling for both target versions, matching the original.
 * Tailwind renamed these to `text-ellipsis` / `text-clip` in 3.3 and dropped the
 * `overflow-*` aliases in v4, but that rename is out of scope here.
 */
const TEXT_OVERFLOWS: ValueTable = Object.freeze({
  ellipsis: 'overflow-ellipsis',
  clip: 'overflow-clip'
})

const OVERFLOW_WRAPS: ValueTable = Object.freeze({
  'break-word': 'break-words'
})

/* ------------------------------------------------------------------ *
 * Handlers
 * ------------------------------------------------------------------ */

export const typographyHandlers: HandlerGroup = {
  /**
   * Text colour. Gradients are accepted because `text-[…]` renders them the same
   * way; `isColor` now also covers `#RGBA`, `rgb(0 0 0 / 50%)`, `oklch()` and
   * `color-mix()`, which the original's single regexp rejected (issue #16).
   */
  color: colorHandler('text', TEXT_COLOR_KEYWORDS),

  /** The `font` shorthand has no Tailwind equivalent; pass it through whole. */
  font: arbitraryProperty('font'),

  /**
   * `font-[…]` takes a whole family list. The three default stacks are matched
   * by the version preset before the handler runs.
   */
  'font-family': value => `font-[${toArbitrary(value)}]`,

  /**
   * The named size ladder lives in the version preset and is resolved by
   * `convertDeclaration` before this runs (issue #12, which the original never
   * addressed), so only the arbitrary fallback is left here.
   */
  'font-size': arbitraryValue('text', isUnit),

  'font-size-adjust': arbitraryLengthProperty('font-size-adjust'),

  '-webkit-font-smoothing': {
    antialiased: 'antialiased',
    auto: 'subpixel-antialiased'
  },

  '-moz-osx-font-smoothing': {
    grayscale: 'antialiased',
    auto: 'subpixel-antialiased'
  },

  'font-stretch': identityTable('font-stretch', [
    'wider', 'narrower', 'ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed',
    'normal', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded', 'inherit', 'initial'
  ]),

  'font-style': {
    italic: 'italic',
    normal: 'not-italic'
  },

  'font-variant': identityTable('font-variant', ['normal', 'small-caps', 'inherit', 'initial']),

  /** Only the single-keyword forms have utilities; combinations fall through. */
  'font-variant-numeric': {
    normal: 'normal-nums',
    ordinal: 'ordinal',
    'slashed-zero': 'slashed-zero',
    'lining-nums': 'lining-nums',
    'oldstyle-nums': 'oldstyle-nums',
    'proportional-nums': 'proportional-nums',
    'tabular-nums': 'tabular-nums',
    'diagonal-fractions': 'diagonal-fractions',
    'stacked-fractions': 'stacked-fractions'
  },

  'font-variation-settings': arbitraryProperty('font-variation-settings'),

  /**
   * Numeric weights and the CSS weight keywords. The named steps (`400` ->
   * `font-normal`, …) come from the version preset; anything else becomes
   * `font-[…]`.
   */
  'font-weight': value =>
    isNumber(value) || FONT_WEIGHT_KEYWORDS.has(value)
      ? `font-[${toArbitrary(value)}]`
      : '',

  'letter-spacing': value =>
    LETTER_SPACING_SCALE[value] ??
    (isUnit(value) ? `tracking-[${toArbitrary(value)}]` : ''),

  'line-height': value =>
    LINE_HEIGHT_RATIOS[value] ??
    (isUnit(value) ? `leading-[${toArbitrary(value)}]` : ''),

  /** The `list-style` shorthand spans three properties; no utility covers it. */
  'list-style': arbitraryProperty('list-style'),

  'list-style-image': arbitraryProperty('list-style-image'),

  'list-style-position': value =>
    LIST_STYLE_POSITIONS[value] ?? `[list-style-position:${toArbitrary(value)}]`,

  /** Unknown markers use the `list-[…]` utility rather than the property escape. */
  'list-style-type': value => LIST_STYLE_TYPES[value] ?? `list-[${toArbitrary(value)}]`,

  /** `start` / `end` have no v3 utility and are deliberately left unmapped. */
  'text-align': {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  },

  'text-align-last': identityTable('text-align-last', [
    'auto', 'left', 'right', 'center', 'justify', 'start', 'end', 'initial', 'inherit'
  ]),

  /** Only the single-keyword shorthands map; `underline dotted red` does not. */
  'text-decoration': {
    underline: 'underline',
    'line-through': 'line-through',
    none: 'no-underline'
  },

  'text-decoration-color': arbitraryColorProperty('text-decoration-color'),

  'text-decoration-line': identityTable('text-decoration-line', [
    'none', 'underline', 'overline', 'line-through', 'initial', 'inherit'
  ]),

  'text-decoration-skip-ink': arbitraryProperty('text-decoration-skip-ink'),

  'text-decoration-style': identityTable('text-decoration-style', [
    'solid', 'double', 'dotted', 'dashed', 'wavy', 'initial', 'inherit'
  ]),

  'text-emphasis-color': arbitraryColorProperty('text-emphasis-color'),

  'text-emphasis-position': arbitraryProperty('text-emphasis-position'),

  'text-emphasis-style': arbitraryProperty('text-emphasis-style'),

  'text-indent': arbitraryLengthProperty('text-indent'),

  'text-justify': identityTable('text-justify', [
    'auto', 'none', 'inter-word', 'inter-ideograph', 'inter-cluster', 'distribute', 'kashida',
    'initial'
  ]),

  'text-orientation': arbitraryProperty('text-orientation'),

  /** Non-standard, long-dead property; kept because the original mapped it. */
  'text-outline': arbitraryProperty('text-outline'),

  'text-overflow': value =>
    TEXT_OVERFLOWS[value] ?? `[text-overflow:${toArbitrary(value)}]`,

  'text-shadow': arbitraryProperty('text-shadow'),

  'text-transform': {
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
    none: 'normal-case'
  },

  'text-underline-offset': arbitraryProperty('text-underline-offset'),

  'text-underline-position': arbitraryProperty('text-underline-position'),

  /** The CSS Text 4 draft keywords the original recognised, not the shipped ones. */
  'text-wrap': identityTable('text-wrap', [
    'normal', 'none', 'unrestricted', 'suppress', 'initial'
  ]),

  'vertical-align': {
    baseline: 'align-baseline',
    top: 'align-top',
    middle: 'align-middle',
    bottom: 'align-bottom',
    'text-top': 'align-text-top',
    'text-bottom': 'align-text-bottom'
  },

  'white-space': {
    normal: 'whitespace-normal',
    nowrap: 'whitespace-nowrap',
    pre: 'whitespace-pre',
    'pre-line': 'whitespace-pre-line',
    'pre-wrap': 'whitespace-pre-wrap'
  },

  /** Only `break-all` has a utility; the rest fall back to the property escape. */
  'word-break': {
    'break-all': 'break-all',
    normal: '[word-break:normal]',
    'keep-all': '[word-break:keep-all]',
    initial: '[word-break:initial]'
  },

  'word-spacing': arbitraryLengthProperty('word-spacing'),

  'word-wrap': identityTable('word-wrap', ['normal', 'break-word', 'initial']),

  'overflow-wrap': value =>
    OVERFLOW_WRAPS[value] ?? `[overflow-wrap:${toArbitrary(value)}]`,

  'writing-mode': arbitraryProperty('writing-mode'),

  'hanging-punctuation': identityTable('hanging-punctuation', [
    'none', 'first', 'last', 'allow-end', 'force-end', 'initial'
  ]),

  /** Dropped from CSS Text 3; kept because the original mapped it. */
  'punctuation-trim': identityTable('punctuation-trim', [
    'none', 'start', 'end', 'allow-end', 'adjacent', 'initial'
  ]),

  'direction': identityTable('direction', ['ltr', 'rtl', 'inherit', 'initial']),

  'unicode-bidi': identityTable('unicode-bidi', [
    'normal', 'embed', 'bidi-override', 'initial', 'inherit'
  ]),

  'quotes': arbitraryProperty('quotes'),

  /** `content-[…]` keeps the quotes, which is what Tailwind's utility expects. */
  'content': value => `content-[${toArbitrary(value)}]`,

  'tab-size': arbitraryLengthProperty('tab-size')
}
