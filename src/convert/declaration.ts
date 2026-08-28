/** Turning a single CSS declaration into Tailwind classes. */

import type { Declaration } from '../parser/declarations.js'
import type { ConversionContext } from './context.js'
import { registry } from './handlers/index.js'
import { runHandler } from './registry.js'

/**
 * Look up the classes for `property: value`.
 *
 * Resolution order, unchanged from the original package:
 * 1. `customTheme[property][value]` wins, even with `useAllDefaultValues: false`.
 * 2. The version preset's default table for the property, when
 *    `useAllDefaultValues` is on.
 * 3. The property handler.
 *
 * @returns A space separated class list, or an empty string when nothing applies.
 */
export const convertDeclaration = (
  declaration: Declaration,
  ctx: ConversionContext
): string => {
  const { property, value } = declaration

  let byValue = ctx.memo.get(property)
  if (byValue === undefined) {
    byValue = new Map()
    ctx.memo.set(property, byValue)
  } else {
    const cached = byValue.get(value)
    if (cached !== undefined) return cached
  }

  const result = resolve(property, value, ctx)
  byValue.set(value, result)
  return result
}

const resolve = (property: string, value: string, ctx: ConversionContext): string => {
  const custom = ctx.customTheme[property]?.[value]
  if (custom) return custom

  if (ctx.useAllDefaultValues) {
    const preset = ctx.theme.defaults[property]?.[value]
    if (preset) return preset
  }

  // `initial` and `inherit` are always emitted as an arbitrary property, ahead of
  // the handler. Tailwind names very few of them, and resolving them per property
  // would silently change output for callers migrating from the original package,
  // which short-circuited here as well.
  if (value === 'initial' || value === 'inherit') {
    return `[${property}:${value}]`
  }

  const handler = registry.get(property)
  if (!handler) return ''
  return runHandler(handler, value, ctx)
}

/** Whether the registry knows the property at all; picks the diagnostic code. */
export const isKnownProperty = (property: string): boolean => registry.has(property)
