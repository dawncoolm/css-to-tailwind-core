/**
 * CSS structure parser.
 *
 * Produces a small AST from the token stream. Unlike the original package this
 * parser is recursive, so `@media` inside `@supports` inside `@layer` all work,
 * and it never throws: malformed input is recorded as a diagnostic and parsing
 * continues with whatever is left.
 */

import type { Diagnostic } from '../types.js'
import { splitTopLevel } from '../utils/value.js'
import { parseDeclaration, type Declaration } from './declarations.js'
import { tokenize } from './tokenizer.js'

export interface Rule {
  kind: 'rule'
  /** The prelude exactly as written, whitespace collapsed. */
  selector: string
  /** The prelude split on top level commas. */
  selectors: string[]
  declarations: Declaration[]
  /** Nested rules and at-rules, for CSS nesting and preprocessed input. */
  children: Node[]
  start: number
  end: number
}

export interface AtRule {
  kind: 'atrule'
  /** Lower-cased name without the `@`, e.g. `media`. */
  name: string
  /** Everything after the name, e.g. `(min-width: 640px)`. */
  params: string
  /** The full prelude including `@name`, used for `customTheme.media` lookups. */
  prelude: string
  /** False for statement at-rules such as `@import url(a.css);`. */
  hasBlock: boolean
  declarations: Declaration[]
  children: Node[]
  start: number
  end: number
}

export type Node = Rule | AtRule

export interface StyleSheet {
  nodes: Node[]
  diagnostics: Diagnostic[]
}

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim()

const makeRule = (prelude: string, start: number): Rule => ({
  kind: 'rule',
  selector: collapse(prelude),
  selectors: splitTopLevel(prelude, ',')
    .map(collapse)
    .filter(v => v !== ''),
  declarations: [],
  children: [],
  start,
  end: start
})

const makeAtRule = (prelude: string, start: number, hasBlock: boolean): AtRule => {
  const collapsed = collapse(prelude)
  const match = /^@([\w-]*)\s*([\s\S]*)$/.exec(collapsed)
  return {
    kind: 'atrule',
    name: (match?.[1] ?? '').toLowerCase(),
    params: match?.[2] ?? '',
    prelude: collapsed,
    hasBlock,
    declarations: [],
    children: [],
    start,
    end: start
  }
}

/**
 * Parse a stylesheet.
 *
 * Recovery rules:
 * - A `}` with no matching `{` is ignored.
 * - Blocks still open at end of input are closed implicitly.
 * - An unterminated comment or string ends the input and reports `unexpected-eof`.
 */
export const parse = (input: string): StyleSheet => {
  const diagnostics: Diagnostic[] = []
  const { tokens, truncated, truncatedAt } = tokenize(input)

  if (truncated) {
    diagnostics.push({
      level: 'warning',
      code: 'unexpected-eof',
      message: 'Unterminated comment or string; the rest of the stylesheet was skipped.',
      start: truncatedAt,
      end: input.length
    })
  }

  const root: Node[] = []
  /** Innermost block first. */
  const stack: Node[] = []
  let buffer = ''
  let bufferStart = 0

  const currentChildren = (): Node[] => {
    const top = stack[0]
    return top ? top.children : root
  }

  const takeBuffer = (): string => {
    const value = buffer
    buffer = ''
    return value
  }

  for (const token of tokens) {
    if (token.type === 'text') {
      if (buffer === '') bufferStart = token.start
      buffer += token.value
      continue
    }

    if (token.type === 'block-start') {
      const prelude = takeBuffer()
      const trimmed = prelude.trim()
      const node = trimmed.startsWith('@')
        ? makeAtRule(trimmed, bufferStart, true)
        : makeRule(trimmed, bufferStart)
      currentChildren().push(node)
      stack.unshift(node)
      continue
    }

    if (token.type === 'block-end') {
      const trailing = takeBuffer()
      const open = stack[0]
      if (!open) {
        // Stray `}`: nothing to close, and the text before it is not a declaration
        // in any block. Drop both and carry on.
        continue
      }
      if (trailing.trim() !== '') {
        pushDeclaration(open, trailing, bufferStart, diagnostics)
      }
      open.end = token.end
      stack.shift()
      continue
    }

    // token.type === 'semicolon'
    const statement = takeBuffer()
    const trimmed = statement.trim()
    if (trimmed === '') continue

    const open = stack[0]
    if (!open) {
      if (trimmed.startsWith('@')) {
        // A statement at-rule such as `@import url(a.css);`.
        root.push(makeAtRule(trimmed, bufferStart, false))
      }
      // Anything else at the top level is not valid CSS; ignore it silently
      // because it is most often a stray semicolon.
      continue
    }

    if (trimmed.startsWith('@')) {
      open.children.push(makeAtRule(trimmed, bufferStart, false))
      continue
    }

    pushDeclaration(open, statement, bufferStart, diagnostics)
  }

  // Trailing text outside any block is discarded; an unterminated block keeps the
  // declarations it already collected.
  const leftover = buffer.trim()
  const open = stack[0]
  if (leftover !== '' && open) {
    pushDeclaration(open, buffer, bufferStart, diagnostics)
  }
  if (stack.length > 0) {
    diagnostics.push({
      level: 'warning',
      code: 'unexpected-eof',
      message: `${stack.length} block(s) were never closed; they were closed implicitly at end of input.`,
      start: (stack[stack.length - 1] as Node).start,
      end: input.length
    })
    for (const node of stack) node.end = input.length
  }

  return { nodes: root, diagnostics }
}

const pushDeclaration = (
  node: Node,
  raw: string,
  start: number,
  diagnostics: Diagnostic[]
): void => {
  const declaration = parseDeclaration(raw, start)
  if (declaration) {
    node.declarations.push(declaration)
    return
  }
  diagnostics.push({
    level: 'warning',
    code: 'malformed-declaration',
    message: `Skipped "${raw.trim()}": not a "property: value" pair.`,
    selector: node.kind === 'rule' ? node.selector : node.prelude,
    start,
    end: start + raw.length
  })
}
