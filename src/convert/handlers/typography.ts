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

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'
import { isColor } from '../../utils/color.js'
import { isNumber, isUnit } from '../../utils/unit.js'
import { toArbitrary } from '../../utils/value.js'
import { FONT_SIZE_SCALE } from '../../theme/scales.js'

/* ------------------------------------------------------------------ *
 * Shared handler factories
 * ------------------------------------------------------------------ */

/**
 * Emit Tailwind's arbitrary *property* escape hatch, `[prop:value]`, for a CSS
 * property that has no utility at all.
 */
const arbitraryProperty =
  (property: string): HandlerFn =>
  value =>
    `[${property}:${toArbitrary(value)}]`

/**
 * Same as {@link arbitraryProperty} but guarded by {@link isUnit}, for the
 * properties whose value must be a length or a number.
 *
 * The original package guarded these too, but its `isUnit` returned `true` for
 * every non-empty string; the guard only starts rejecting garbage here.
 */
const arbitraryLengthProperty =
  (property: string): HandlerFn =>
  value =>
    isUnit(value) ? `[${property}:${toArbitrary(value)}]` : ''

/* ------------------------------------------------------------------ *
 * Hoisted lookup tables
 *
 * These are consulted from inside handler functions, so they must not be
 * re-allocated per call.
 * ------------------------------------------------------------------ */

/** Colour keywords with a dedicated `text-*` utility. */
const TEXT_COLOR_KEYWORDS: ValueTable = Object.freeze({
  transparent: 'text-transparent',
  // The declaration parser lower-cases property names but not values, so both
  // spellings of `currentColor` reach the handler verbatim.
  currentColor: 'text-current',
  currentcolor: 'text-current'
})

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
const LINE_HEIGHT_RATIOS: ValueTable = Object.freeze({
  '1': 'leading-none',
  '2': 'leading-loose',
  '1.25': 'leading-tight',
  '1.375': 'leading-snug',
  '1.5': 'leading-normal',
  '1.625': 'leading-relaxed'
})

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
  color: value =>
    TEXT_COLOR_KEYWORDS[value] ??
    (isColor(value, true) ? `text-[${toArbitrary(value)}]` : ''),

  /** The `font` shorthand has no Tailwind equivalent; pass it through whole. */
  font: arbitraryProperty('font'),

  /**
   * `font-[…]` takes a whole family list. The three default stacks are matched
   * by the version preset before the handler runs.
   */
  'font-family': value => `font-[${toArbitrary(value)}]`,

  /**
   * The original always emitted `text-[…]` and never looked at Tailwind's own
   * size ladder (issue #12). `convertDeclaration` now resolves the ladder from
   * the preset first; the check is repeated here so a direct call behaves the
   * same way.
   */
  'font-size': (value, ctx) => {
    if (ctx.useAllDefaultValues) {
      const preset = FONT_SIZE_SCALE[value]
      if (preset) return preset
    }
    return isUnit(value) ? `text-[${toArbitrary(value)}]` : ''
  },

  'font-size-adjust': arbitraryLengthProperty('font-size-adjust'),

  '-webkit-font-smoothing': {
    antialiased: 'antialiased',
    auto: 'subpixel-antialiased'
  },

  '-moz-osx-font-smoothing': {
    grayscale: 'antialiased',
    auto: 'subpixel-antialiased'
  },

  'font-stretch': {
    wider: '[font-stretch:wider]',
    narrower: '[font-stretch:narrower]',
    'ultra-condensed': '[font-stretch:ultra-condensed]',
    'extra-condensed': '[font-stretch:extra-condensed]',
    condensed: '[font-stretch:condensed]',
    'semi-condensed': '[font-stretch:semi-condensed]',
    normal: '[font-stretch:normal]',
    'semi-expanded': '[font-stretch:semi-expanded]',
    expanded: '[font-stretch:expanded]',
    'extra-expanded': '[font-stretch:extra-expanded]',
    'ultra-expanded': '[font-stretch:ultra-expanded]',
    inherit: '[font-stretch:inherit]',
    initial: '[font-stretch:initial]'
  },

  'font-style': {
    italic: 'italic',
    normal: 'not-italic'
  },

  'font-variant': {
    normal: '[font-variant:normal]',
    'small-caps': '[font-variant:small-caps]',
    inherit: '[font-variant:inherit]',
    initial: '[font-variant:initial]'
  },

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

  'text-align-last': {
    auto: '[text-align-last:auto]',
    left: '[text-align-last:left]',
    right: '[text-align-last:right]',
    center: '[text-align-last:center]',
    justify: '[text-align-last:justify]',
    start: '[text-align-last:start]',
    end: '[text-align-last:end]',
    initial: '[text-align-last:initial]',
    inherit: '[text-align-last:inherit]'
  },

  /** Only the single-keyword shorthands map; `underline dotted red` does not. */
  'text-decoration': {
    underline: 'underline',
    'line-through': 'line-through',
    none: 'no-underline'
  },

  'text-decoration-color': value =>
    isColor(value, true) ? `[text-decoration-color:${toArbitrary(value)}]` : '',

  'text-decoration-line': {
    none: '[text-decoration-line:none]',
    underline: '[text-decoration-line:underline]',
    overline: '[text-decoration-line:overline]',
    'line-through': '[text-decoration-line:line-through]',
    initial: '[text-decoration-line:initial]',
    inherit: '[text-decoration-line:inherit]'
  },

  'text-decoration-skip-ink': arbitraryProperty('text-decoration-skip-ink'),

  'text-decoration-style': {
    solid: '[text-decoration-style:solid]',
    double: '[text-decoration-style:double]',
    dotted: '[text-decoration-style:dotted]',
    dashed: '[text-decoration-style:dashed]',
    wavy: '[text-decoration-style:wavy]',
    initial: '[text-decoration-style:initial]',
    inherit: '[text-decoration-style:inherit]'
  },

  'text-emphasis-color': value =>
    isColor(value, true) ? `[text-emphasis-color:${toArbitrary(value)}]` : '',

  'text-emphasis-position': arbitraryProperty('text-emphasis-position'),

  'text-emphasis-style': arbitraryProperty('text-emphasis-style'),

  'text-indent': arbitraryLengthProperty('text-indent'),

  'text-justify': {
    auto: '[text-justify:auto]',
    none: '[text-justify:none]',
    'inter-word': '[text-justify:inter-word]',
    'inter-ideograph': '[text-justify:inter-ideograph]',
    'inter-cluster': '[text-justify:inter-cluster]',
    distribute: '[text-justify:distribute]',
    kashida: '[text-justify:kashida]',
    initial: '[text-justify:initial]'
  },

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
  'text-wrap': {
    normal: '[text-wrap:normal]',
    none: '[text-wrap:none]',
    unrestricted: '[text-wrap:unrestricted]',
    suppress: '[text-wrap:suppress]',
    initial: '[text-wrap:initial]'
  },

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

  'word-wrap': {
    normal: '[word-wrap:normal]',
    'break-word': '[word-wrap:break-word]',
    initial: '[word-wrap:initial]'
  },

  'overflow-wrap': value =>
    OVERFLOW_WRAPS[value] ?? `[overflow-wrap:${toArbitrary(value)}]`,

  'writing-mode': arbitraryProperty('writing-mode'),

  'hanging-punctuation': {
    none: '[hanging-punctuation:none]',
    first: '[hanging-punctuation:first]',
    last: '[hanging-punctuation:last]',
    'allow-end': '[hanging-punctuation:allow-end]',
    'force-end': '[hanging-punctuation:force-end]',
    initial: '[hanging-punctuation:initial]'
  },

  /** Dropped from CSS Text 3; kept because the original mapped it. */
  'punctuation-trim': {
    none: '[punctuation-trim:none]',
    start: '[punctuation-trim:start]',
    end: '[punctuation-trim:end]',
    'allow-end': '[punctuation-trim:allow-end]',
    adjacent: '[punctuation-trim:adjacent]',
    initial: '[punctuation-trim:initial]'
  },

  'direction': {
    ltr: '[direction:ltr]',
    rtl: '[direction:rtl]',
    inherit: '[direction:inherit]',
    initial: '[direction:initial]'
  },

  'unicode-bidi': {
    normal: '[unicode-bidi:normal]',
    embed: '[unicode-bidi:embed]',
    'bidi-override': '[unicode-bidi:bidi-override]',
    initial: '[unicode-bidi:initial]',
    inherit: '[unicode-bidi:inherit]'
  },

  'quotes': arbitraryProperty('quotes'),

  /** `content-[…]` keeps the quotes, which is what Tailwind's utility expects. */
  'content': value => `content-[${toArbitrary(value)}]`,

  'tab-size': arbitraryLengthProperty('tab-size')
}
