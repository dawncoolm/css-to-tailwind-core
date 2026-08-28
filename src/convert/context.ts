/**
 * Conversion context.
 *
 * The original package kept `useAllDefaultValues` and `customTheme` in
 * module-level `let` bindings that `CssToTailwindTranslator` reassigned on every
 * call, while `getResultCode` read the same settings off its `config` argument.
 * Two translations running against different configs — a watcher, a test suite,
 * anything concurrent — would read each other's settings.
 *
 * Everything mutable now lives on a context object created once per call and
 * passed down explicitly. No module-level state remains.
 */

import type { CustomTheme, Diagnostic, TailwindVersion, TranslatorConfig } from '../types.js'
import { getPreset, type ResolvedTheme } from '../theme/index.js'
import { toArbitrary } from '../utils/value.js'

export interface ConversionContext {
  readonly version: TailwindVersion
  readonly prefix: string
  readonly useAllDefaultValues: boolean
  /** Raw user overrides. Consulted before `theme`, and regardless of `useAllDefaultValues`. */
  readonly customTheme: CustomTheme
  readonly theme: ResolvedTheme
  /** Collected as conversion proceeds; surfaced on the result. */
  readonly diagnostics: Diagnostic[]
/**
   * `property -> value -> class list`, so a declaration that appears in many
   * rules is resolved once. Nested rather than keyed on a joined string, which
   * would allocate one key per declaration even on a cache miss.
   */
  readonly memo: Map<string, Map<string, string>>
}

export const defaultTranslatorConfig: Required<
  Pick<TranslatorConfig, 'prefix' | 'useAllDefaultValues' | 'customTheme' | 'tailwindVersion'>
> = {
  prefix: '',
  useAllDefaultValues: true,
  customTheme: {},
  tailwindVersion: 3
}

export const createContext = (config: TranslatorConfig = {}): ConversionContext => {
  const version = config.tailwindVersion ?? defaultTranslatorConfig.tailwindVersion
  return {
    version,
    prefix: config.prefix ?? defaultTranslatorConfig.prefix,
    useAllDefaultValues:
      config.useAllDefaultValues ?? defaultTranslatorConfig.useAllDefaultValues,
    customTheme: config.customTheme ?? defaultTranslatorConfig.customTheme,
    theme: getPreset(version),
    diagnostics: [],
    memo: new Map()
  }
}

/**
 * Resolve one sub-value of a composite property (a `transform` function argument,
 * a `filter` amount, …) against the user's theme and then the built-in scale.
 *
 * Mirrors the lookup the original package inlined at ~30 call sites:
 * `customTheme[group]?.[value] || (useAllDefaultValues && defaults[value]) || '[value]'`.
 *
 * @param group `customTheme` key, e.g. `rotate` or `backdrop-blur`.
 * @param defaults Built-in scale for the group, e.g. `theme.rotate`. Omitted by
 *   the filter handlers, which have no per-group scale of their own.
 * @returns A class *suffix*, already wrapped in brackets when it is arbitrary.
 */
export const resolveSubValue = (
  ctx: ConversionContext,
  group: string,
  value: string,
  defaults: Readonly<Record<string, string>> = {}
): string =>
  ctx.customTheme[group]?.[value] ||
  (ctx.useAllDefaultValues ? defaults[value] : undefined) ||
  `[${toArbitrary(value)}]`
