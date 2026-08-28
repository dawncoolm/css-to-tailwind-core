/**
 * Public type surface of the translator.
 *
 * The shapes here are intentionally compatible with `css-to-tailwind-translator`
 * so that this package can be dropped in without touching call sites. Everything
 * that goes beyond that package is additive: new optional config fields and the
 * `diagnostics` array on the result.
 */

/** One converted CSS rule. */
export interface ResultCode {
  /**
   * The selector the declarations belonged to. Rules nested inside an at-rule
   * are reported as `<at-rule prelude>-->{selector}`, matching the original
   * package's format (e.g. `@media (min-width: 640px)-->.card`).
   */
  selectorName: string
  /** Space separated Tailwind class list. Empty when nothing could be converted. */
  resultVal: string
}

/** Tailwind major version whose class names should be emitted. */
export type TailwindVersion = 3 | 4

/**
 * Per-property overrides applied before any built-in mapping.
 *
 * Two different key conventions exist, inherited from the original package:
 *
 * - `media` maps a raw at-rule prelude to a variant name, e.g.
 *   `{ '@media (min-width: 1800px)': '3xl' }`.
 * - `filter` / `backdrop-filter` / `transform` sub-functions (`blur`, `rotate`,
 *   `scale`, …) map a raw argument to the *suffix* only, without the utility
 *   prefix, e.g. `{ rotate: { '99deg': 'crooked' } }` yields `rotate-crooked`.
 * - Every other key is a CSS property name and maps a raw declaration value to a
 *   complete class name, prefix included, e.g. `{ width: { '288px': 'w-custom' } }`.
 */
export interface CustomTheme extends Record<string, undefined | Record<string, string>> {
  media?: Record<string, string>
  'backdrop-blur'?: Record<string, string>
  'backdrop-brightness'?: Record<string, string>
  'backdrop-contrast'?: Record<string, string>
  'backdrop-grayscale'?: Record<string, string>
  'backdrop-hue-rotate'?: Record<string, string>
  'backdrop-invert'?: Record<string, string>
  'backdrop-opacity'?: Record<string, string>
  'backdrop-saturate'?: Record<string, string>
  'backdrop-sepia'?: Record<string, string>
  blur?: Record<string, string>
  brightness?: Record<string, string>
  contrast?: Record<string, string>
  grayscale?: Record<string, string>
  'hue-rotate'?: Record<string, string>
  invert?: Record<string, string>
  saturate?: Record<string, string>
  sepia?: Record<string, string>
  scale?: Record<string, string>
  rotate?: Record<string, string>
  translate?: Record<string, string>
  skew?: Record<string, string>
}

export interface TranslatorConfig {
  /**
   * Tailwind's `prefix` option. Applied to every generated class, after variants
   * and before any leading minus sign is restored (`-tw-mt-4`, `hover:tw-flex`).
   */
  prefix?: string
  /**
   * Resolve values against Tailwind's default scales (`1rem` -> `p-4`) instead of
   * always emitting arbitrary values (`p-[1rem]`).
   *
   * @default true
   */
  useAllDefaultValues?: boolean
  /** Value overrides that win over every built-in mapping. */
  customTheme?: CustomTheme
  /**
   * Which Tailwind major version the emitted class names target.
   *
   * @default 3
   */
  tailwindVersion?: TailwindVersion
}

/** Why a declaration, rule or at-rule could not be converted. */
export type DiagnosticCode =
  /** The property has no mapping in the registry at all. */
  | 'unknown-property'
  /** The property is known but this particular value could not be expressed. */
  | 'unsupported-value'
  /** An at-rule that has no Tailwind equivalent (`@font-face`, `@keyframes`, …). */
  | 'unsupported-at-rule'
  /** A declaration that is not `property: value`. */
  | 'malformed-declaration'
  /** Braces or comments that never closed; the parser recovered at end of input. */
  | 'unexpected-eof'

export interface Diagnostic {
  level: 'warning' | 'error'
  code: DiagnosticCode
  /** Human readable, already includes the offending property/value. */
  message: string
  /** Selector the problem was found under, when applicable. */
  selector?: string
  property?: string
  value?: string
  /** Byte offset into the input where the problem starts. */
  start?: number
  /** Byte offset into the input where the problem ends. */
  end?: number
}

export interface TranslationResult {
  /**
   * `'SyntaxError'` when the sheet contained at least one construct from
   * {@link specialAttribute}. Unlike the original package, `data` is still fully
   * populated in that case: one bad at-rule no longer discards the whole sheet.
   */
  code: 'OK' | 'SyntaxError'
  data: ResultCode[]
  /** Every declaration that was dropped, and why. Empty on a clean conversion. */
  diagnostics: Diagnostic[]
}
