/** At-rule prelude -> Tailwind variant. */

import type { ConversionContext } from '../convert/context.js'
import type { AtRule } from '../parser/parse.js'
import { toArbitrary } from '../utils/value.js'

/**
 * At-rules that have no Tailwind representation and whose contents cannot be
 * expressed as utilities. Kept as an exported constant because the original
 * package exposed the same list under the name `specialAttribute`.
 */
export const UNSUPPORTED_AT_RULES: readonly string[] = Object.freeze([
  '@charset',
  '@font-face',
  '@import',
  '@keyframes'
])

/**
 * At-rules that are structurally transparent: they group rules without changing
 * how those rules apply, so their children are converted as if they were at the
 * top level.
 */
const TRANSPARENT = new Set(['layer', 'scope', 'document'])

/**
 * Normalise an at-rule prelude the way the original package did, so that
 * `customTheme.media` keys written against it keep working:
 * whitespace inside parentheses is removed, whitespace before `(` is removed,
 * and every remaining run of whitespace becomes a single underscore.
 *
 * `@media not all and (min-width: 640px)` -> `@media_not_all_and(min-width:640px)`
 */
export const normalizeAtRulePrelude = (prelude: string): string =>
  toArbitrary(
    prelude.replace(/\(.+\)/g, group => group.replace(/\s/g, '')).replace(/\s+\(/g, '(')
  )

export interface AtRuleVariant {
  /** Variant to prepend, or `null` when the at-rule contributes none. */
  variant: string | null
  /** True when the at-rule cannot be converted and its contents must be skipped. */
  unsupported: boolean
  /** True when the at-rule only groups rules and adds no variant. */
  transparent: boolean
}

/** Decide what variant, if any, an at-rule contributes to its descendants. */
export const resolveAtRule = (node: AtRule, ctx: ConversionContext): AtRuleVariant => {
  if (UNSUPPORTED_AT_RULES.includes(`@${node.name}`)) {
    return { variant: null, unsupported: true, transparent: false }
  }

  if (TRANSPARENT.has(node.name)) {
    return { variant: null, unsupported: false, transparent: true }
  }

  const normalized = normalizeAtRulePrelude(node.prelude)

  // Custom breakpoints are keyed on the prelude as the author wrote it.
  const custom = ctx.customTheme.media?.[node.prelude]
  if (custom) return { variant: custom, unsupported: false, transparent: false }

  if (node.name === 'media') {
    const preset = ctx.useAllDefaultValues ? ctx.theme.media[normalized] : undefined
    return {
      variant: preset ?? `[${normalized}]`,
      unsupported: false,
      transparent: false
    }
  }

  if (node.name === 'supports') {
    return {
      variant: `supports-[${toArbitrary(node.params).replace(/^\((.*)\)$/, '$1')}]`,
      unsupported: false,
      transparent: false
    }
  }

  // Anything else with a block becomes an arbitrary variant, which Tailwind
  // renders verbatim: `[@container(min-width:400px)]:flex`.
  return { variant: `[${normalized}]`, unsupported: false, transparent: false }
}
