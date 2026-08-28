/**
 * Property handler registry.
 *
 * A handler is either a static `value -> class` table or a function. Functions
 * return an empty string when the value cannot be expressed in Tailwind; the
 * translator turns that into a diagnostic rather than dropping it silently.
 */

import type { ConversionContext } from './context.js'

/** Static lookup table for properties with a closed set of legal values. */
export type ValueTable = Readonly<Record<string, string>>

/** Dynamic handler for properties whose values need parsing. */
export type HandlerFn = (value: string, ctx: ConversionContext) => string

export type PropertyHandler = ValueTable | HandlerFn

/** A group module contributes its properties as a plain object. */
export type HandlerGroup = Readonly<Record<string, PropertyHandler>>

/** Build the registry from the handler groups, failing loudly on duplicates. */
export const buildRegistry = (groups: readonly HandlerGroup[]): Map<string, PropertyHandler> => {
  const registry = new Map<string, PropertyHandler>()
  for (const group of groups) {
    for (const [property, handler] of Object.entries(group)) {
      if (registry.has(property)) {
        throw new Error(`Duplicate handler registered for CSS property "${property}"`)
      }
      registry.set(property, handler)
    }
  }
  return registry
}

/** Apply a handler to a value. */
export const runHandler = (
  handler: PropertyHandler,
  value: string,
  ctx: ConversionContext
): string => (typeof handler === 'function' ? handler(value, ctx) : (handler[value] ?? ''))
