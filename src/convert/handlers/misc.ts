/**
 * Properties with no Tailwind utility family of their own.
 *
 * Each is emitted as an arbitrary property (`[icon:…]`), which is what the
 * original package did. They are grouped together because that fallback is the
 * only thing they share.
 */

import type { HandlerFn, HandlerGroup, ValueTable } from '../registry.js'

import { toArbitrary } from '../../utils/value.js'

/**
 * Emit `[property:value]` unconditionally.
 *
 * The closure is built once per property at module scope; the original allocated
 * a fresh closure and template string on every call.
 */
const arbitraryProperty =
  (property: string): HandlerFn =>
  (value: string): string =>
    `[${property}:${toArbitrary(value)}]`

/**
 * `all` accepts only the CSS-wide keywords. The original's table listed three of
 * them; `revert` and `revert-layer` stay absent, so they fall through to a
 * diagnostic as before rather than silently gaining support.
 */
const ALL: ValueTable = Object.freeze({
  initial: '[all:initial]',
  inherit: '[all:inherit]',
  unset: '[all:unset]'
})

export const miscHandlers: HandlerGroup = {
  all: ALL,

  /**
   * Tailwind v4 added a `scheme-*` family for this property. It is not used
   * here: the v4 rename list for this rewrite does not cover `color-scheme`, so
   * both versions keep the original's arbitrary property form.
   */
  'color-scheme': arbitraryProperty('color-scheme'),

  /**
   * Deliberate divergence from the original, which emitted
   * `[content-increment:…]` — a property that does not exist, so every
   * `counter-increment` declaration produced a class Tailwind could not compile.
   * The property name is spelled correctly here.
   */
  'counter-increment': arbitraryProperty('counter-increment'),

  'counter-reset': arbitraryProperty('counter-reset'),
  'counter-set': arbitraryProperty('counter-set'),
  icon: arbitraryProperty('icon'),
  'image-orientation': arbitraryProperty('image-orientation')
}
