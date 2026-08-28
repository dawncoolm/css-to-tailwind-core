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

/** {@link UNSUPPORTED_AT_RULES} without the `@`, for a lookup with no allocation. */
const UNSUPPORTED_NAMES: ReadonlySet<string> = new Set(
  UNSUPPORTED_AT_RULES.map(name => name.slice(1))
)

/**
 * At-rules that are structurally transparent: they group rules without changing
 * how those rules apply, so their children are converted as if they were at the
 * top level.
 */
const TRANSPARENT: ReadonlySet<string> = new Set(['layer', 'scope', 'document'])

/**
 * Normalise an at-rule prelude the way the original package did, so that
 * `customTheme.media` keys written against it keep working:
 * whitespace inside parentheses is removed, whitespace before `(` is removed,
 * and every remaining run of whitespace becomes a single underscore.
 *
 * `@media not all and (min-width: 640px)` -> `@media_not_all_and(min-width:640px)`
 */
/** One pair of parentheses wrapping the whole `@supports` condition. */
const WRAPPING_PARENS_RE = /^\((.*)\)$/

/** Whitespace inside a parenthesised group, and before the opening parenthesis. */
const PAREN_GROUP_RE = /\(.+\)/g
const SPACE_BEFORE_PAREN_RE = /\s+\(/g

export const normalizeAtRulePrelude = (prelude: string): string =>
  toArbitrary(
    prelude
      .replace(PAREN_GROUP_RE, group => group.replace(/\s/g, ''))
      .replace(SPACE_BEFORE_PAREN_RE, '(')
  )

/**
 * What an at-rule contributes to its descendants: nothing at all because it
 * cannot be converted, nothing because it only groups, or exactly one variant.
 */
export type AtRuleVariant =
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'transparent' }
  | { readonly kind: 'variant'; readonly variant: string }

const UNSUPPORTED: AtRuleVariant = Object.freeze({ kind: 'unsupported' })
const TRANSPARENT_RESULT: AtRuleVariant = Object.freeze({ kind: 'transparent' })

/** Decide what variant, if any, an at-rule contributes to its descendants. */
export const resolveAtRule = (node: AtRule, ctx: ConversionContext): AtRuleVariant => {
  if (UNSUPPORTED_NAMES.has(node.name)) return UNSUPPORTED
  if (TRANSPARENT.has(node.name)) return TRANSPARENT_RESULT

  // Custom breakpoints are keyed on the prelude as the author wrote it, so this
  // runs before the prelude is normalised — normalising is four regex passes
  // that a custom hit would throw away.
  const custom = ctx.customTheme.media?.[node.prelude]
  if (custom) return { kind: 'variant', variant: custom }

  if (node.name === 'supports') {
    const condition = toArbitrary(node.params).replace(WRAPPING_PARENS_RE, '$1')
    return { kind: 'variant', variant: `supports-[${condition}]` }
  }

  const normalized = normalizeAtRulePrelude(node.prelude)

  if (node.name === 'media') {
    const preset = ctx.useAllDefaultValues ? ctx.theme.media[normalized] : undefined
    return { kind: 'variant', variant: preset ?? `[${normalized}]` }
  }

  // Anything else with a block becomes an arbitrary variant, which Tailwind
  // renders verbatim: `[@container(min-width:400px)]:flex`.
  return { kind: 'variant', variant: `[${normalized}]` }
}
