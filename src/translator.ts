/** Top level orchestration: parse, walk, convert, assemble. */

import { createContext, type ConversionContext } from './convert/context.js'
import { convertDeclaration, isKnownProperty } from './convert/declaration.js'
import { dedupe, formatClasses, splitClasses, variantPrefixOf } from './convert/format.js'
import { sortClassNames } from './sort.js'
import type { Declaration } from './parser/declarations.js'
import { parse, type AtRule, type Node, type Rule } from './parser/parse.js'
import { resolveAtRule, UNSUPPORTED_AT_RULES } from './selector/media.js'
import { parseSelector } from './selector/variants.js'
import type { ResultCode, TranslationResult, TranslatorConfig } from './types.js'

/**
 * At-rules with no Tailwind representation.
 *
 * Re-exported under the original package's name. Unlike there, encountering one
 * no longer discards the whole stylesheet: the at-rule is skipped, a diagnostic
 * is recorded, and every other rule still converts. `result.code` is still
 * `'SyntaxError'` so existing callers that branch on it keep working.
 */
export const specialAttribute = UNSUPPORTED_AT_RULES

interface WalkState {
  /** Variants contributed by enclosing at-rules, outermost first. */
  readonly variants: readonly string[]
  /** At-rule preludes, used to build the `@media …-->.selector` result key. */
  readonly path: readonly string[]
}

const ROOT_STATE: WalkState = { variants: [], path: [] }

/**
 * Convert CSS source into Tailwind utility classes.
 *
 * @param code Any CSS. Comments, nested at-rules and unbalanced braces are
 *   tolerated; nothing throws.
 * @param config See {@link TranslatorConfig}.
 */
export const CssToTailwindTranslator = (
  code: string,
  config: TranslatorConfig = {}
): TranslationResult => {
  const ctx = createContext(config)
  const sheet = parse(code)
  ctx.diagnostics.push(...sheet.diagnostics)

  const data: ResultCode[] = []

  const walk = (nodes: readonly Node[], state: WalkState): void => {
    for (const node of nodes) {
      if (node.kind === 'atrule') walkAtRule(node, state)
      else walkRule(node, state)
    }
  }

  const walkAtRule = (node: AtRule, state: WalkState): void => {
    const resolved = resolveAtRule(node, ctx)

    if (resolved.kind === 'unsupported') {
      ctx.diagnostics.push({
        level: 'warning',
        code: 'unsupported-at-rule',
        message: `"@${node.name}" has no Tailwind equivalent and was skipped.`,
        selector: node.prelude,
        start: node.start,
        end: node.end
      })
      return
    }

    const nested: WalkState =
      resolved.kind === 'transparent'
        ? state
        : {
            variants: [...state.variants, resolved.variant],
            path: [...state.path, node.prelude]
          }

    // Declarations sitting directly inside an at-rule have no selector of their
    // own; report them under the at-rule prelude.
    if (node.declarations.length > 0) {
      emit(node.prelude, node.declarations, nested)
    }

    walk(node.children, nested)
  }

  const walkRule = (node: Rule, state: WalkState): void => {
    const own = selectorVariants(node, ctx)
    emit(node.selector, node.declarations, {
      variants: own.length > 0 ? [...state.variants, ...own] : state.variants,
      path: state.path
    })

    // CSS nesting: children inherit this rule's variants but report their own
    // selector, which is what a preprocessor would have emitted.
    if (node.children.length > 0) {
      walk(node.children, {
        variants: [...state.variants, ...own],
        path: [...state.path, node.selector]
      })
    }
  }

  const emit = (
    selector: string,
    declarations: readonly Declaration[],
    state: WalkState
  ): void => {
    if (declarations.length === 0) return

    // Constant for every declaration in this rule, so it is built once.
    const variantPrefix = variantPrefixOf(state.variants)
    const classes: string[] = []

    for (const declaration of declarations) {
      const converted = convertDeclaration(declaration, ctx)
      if (converted === '') {
        pushUnconvertible(ctx, declaration, selector)
        continue
      }
      formatClasses(splitClasses(converted), classes, {
        variantPrefix,
        important: declaration.important,
        prefix: ctx.prefix,
        version: ctx.version
      })
    }

    const deduped = dedupe(classes)

    data.push({
      selectorName: [...state.path, selector].join('-->'),
      resultVal: (ctx.sortClasses
        ? sortClassNames(deduped, { prefix: ctx.prefix })
        : deduped
      ).join(' ')
    })
  }

  walk(sheet.nodes, ROOT_STATE)

  return {
    code: ctx.diagnostics.some(d => d.code === 'unsupported-at-rule')
      ? 'SyntaxError'
      : 'OK',
    data,
    diagnostics: ctx.diagnostics
  }
}

/**
 * Variants contributed by a rule's own selector.
 *
 * A selector list only yields variants when every selector in it agrees; a mixed
 * list such as `.a, .b:hover` cannot be expressed as one class list, so it
 * produces no variants and a diagnostic instead of the original package's
 * behaviour of applying `:hover` to both.
 */
const selectorVariants = (node: Rule, ctx: ConversionContext): string[] => {
  if (node.selectors.length === 0) return []

  const first = parseSelector(node.selectors[0] as string).variants
  const key = first.join(':')

  for (let i = 1; i < node.selectors.length; i++) {
    if (parseSelector(node.selectors[i] as string).variants.join(':') !== key) {
      ctx.diagnostics.push({
        level: 'warning',
        code: 'unsupported-value',
        message:
          `Selector list "${node.selector}" mixes different pseudo states; ` +
          'no variant was applied. Split it into one rule per state.',
        selector: node.selector,
        start: node.start,
        end: node.end
      })
      return []
    }
  }

  return first
}

const pushUnconvertible = (
  ctx: ConversionContext,
  declaration: Declaration,
  selector: string
): void => {
  const known = isKnownProperty(declaration.property, ctx)
  ctx.diagnostics.push({
    level: 'warning',
    code: known ? 'unsupported-value' : 'unknown-property',
    message: known
      ? `"${declaration.property}: ${declaration.value}" has no Tailwind equivalent.`
      : `"${declaration.property}" is not a known CSS property.`,
    selector,
    property: declaration.property,
    value: declaration.value,
    start: declaration.start,
    end: declaration.end
  })
}
