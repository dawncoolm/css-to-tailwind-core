/**
 * css-to-tailwind-core
 *
 * Convert CSS into Tailwind utility classes.
 *
 * @example
 * ```ts
 * import { CssToTailwindTranslator } from 'css-to-tailwind-core'
 *
 * CssToTailwindTranslator('body { width: 100%; margin: 0 !important; }')
 * // { code: 'OK', data: [{ selectorName: 'body', resultVal: 'w-full !m-0' }], diagnostics: [] }
 * ```
 */

export { CssToTailwindTranslator, specialAttribute } from './translator.js'
export { defaultTranslatorConfig } from './convert/context.js'
export type { ConversionContext } from './convert/context.js'
export type { ResolvedTheme } from './theme/index.js'
export type { PropertyHandler, ValueTable, HandlerFn } from './convert/registry.js'
export type {
  CustomTheme,
  Diagnostic,
  DiagnosticCode,
  ResultCode,
  TailwindVersion,
  TranslationResult,
  TranslatorConfig
} from './types.js'
