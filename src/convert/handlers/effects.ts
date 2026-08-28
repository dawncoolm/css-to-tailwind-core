/**
 * Effects: shadows, opacity, blending, masking and shapes.
 *
 * Only three of these properties have real Tailwind utilities — `box-shadow`
 * (`shadow-*`), `opacity` (`opacity-*`) and `mix-blend-mode` (`mix-blend-*`).
 * The masking and CSS-Shapes families have none in either v3 or v4's default
 * theme as far as this translator is concerned, so they are emitted as arbitrary
 * *property* declarations (`[mask-image:url(a.svg)]`), which is what the original
 * package did.
 *
 * Tailwind v4 renamed the shadow scale (`shadow-sm` -> `shadow-xs`, and so on).
 * That rename lives in the version preset, so `box-shadow` reads the preset's
 * table rather than branching on `ctx.version` itself.
 */

import type { HandlerGroup, ValueTable } from '../registry.js'
import { OPACITY_STEPS } from '../../theme/scales.js'
import { isUnit } from '../../utils/unit.js'
import { collapseWhitespace, toArbitrary } from '../../utils/value.js'
import {
  arbitrary as arbitraryProperty,
  arbitraryProperty as asArbitraryProperty,
  BLEND_MODES,
  prefixedTable
} from './shared.js'


/**
 * Canonical spelling of a shadow list, used only as a lookup key.
 *
 * The shadow scale is keyed on Tailwind's own generated CSS, which writes one
 * space between components and `, ` between layers. Authors copy those values
 * back in with arbitrary whitespace, so normalising here is what lets
 * `0  1px  2px  0  rgb(0 0 0 / 0.05)` still find `shadow-sm`.
 */
const normalizeShadow = (value: string): string =>
  collapseWhitespace(value).replace(/\s*,\s*/g, ', ')

/**
 * `opacity` values with a named utility.
 *
 * Deliberately not gated on `useAllDefaultValues`: the original inlined this
 * table in the handler and consulted it unconditionally, and the sibling
 * handlers in this package keep that behaviour. Only the *preset* tables in
 * `theme.defaults` respond to that flag.
 *
 * The keys are the exact strings Tailwind's own output uses. `.5` is absent
 * because the original had no entry for it; such a value falls through to
 * `opacity-[.5]`.
 */
const OPACITY_VALUES: ValueTable = Object.freeze(
  Object.fromEntries(
    Object.entries(OPACITY_STEPS).map(([value, step]) => [value, `opacity-${step}`])
  )
)

const MIX_BLEND_MODE = prefixedTable('mix-blend', BLEND_MODES)

export const effectHandlers: HandlerGroup = {
  /**
   * The original always emitted `[box-shadow:…]`, so a value that Tailwind ships
   * a name for still came out as an unreadable arbitrary property (upstream
   * issue #1). The named scale is consulted first now, on both the raw and the
   * whitespace-normalised spelling.
   *
   * The preset table carries the version-appropriate names, so v4 yields
   * `shadow-xs` where v3 yields `shadow-sm` for the same CSS.
   */
  'box-shadow': (value, ctx) => {
    if (ctx.useAllDefaultValues) {
      // Only the normalised spelling can add anything: `convertDeclaration` has
      // already tried this table with the value exactly as written.
      const named = ctx.theme.defaults['box-shadow']?.[normalizeShadow(value)]
      if (named !== undefined) return named
    }
    return arbitraryProperty('box-shadow', value)
  },

  /**
   * `isUnit` gates the arbitrary fallback, so `opacity: potato` now yields
   * nothing (and a diagnostic) where the original produced `opacity-[potato]`.
   */
  opacity: value =>
    OPACITY_VALUES[value] ?? (isUnit(value) ? `opacity-[${toArbitrary(value)}]` : ''),

  'mix-blend-mode': MIX_BLEND_MODE,

  // Masking. Tailwind's default theme names none of these, so every value is an
  // arbitrary property, including the ones that look like keywords
  // (`mask-repeat: no-repeat` -> `[mask-repeat:no-repeat]`).
  mask: asArbitraryProperty('mask'),
  'mask-clip': asArbitraryProperty('mask-clip'),
  'mask-composite': asArbitraryProperty('mask-composite'),
  'mask-image': asArbitraryProperty('mask-image'),
  'mask-origin': asArbitraryProperty('mask-origin'),
  'mask-position': asArbitraryProperty('mask-position'),
  'mask-repeat': asArbitraryProperty('mask-repeat'),
  'mask-size': asArbitraryProperty('mask-size'),

  // Clipping. `clip` is the deprecated `rect()` form; `clip-path` is the modern
  // one. Neither has a utility, and `toArbitrary` is what keeps the spaces in
  // `rect(0, 0, 0, 0)` from breaking the class name.
  clip: asArbitraryProperty('clip'),
  'clip-path': asArbitraryProperty('clip-path'),

  // CSS Shapes. No Tailwind utilities exist for any of them.
  'shape-image-threshold': asArbitraryProperty('shape-image-threshold'),
  'shape-margin': asArbitraryProperty('shape-margin'),
  'shape-outside': asArbitraryProperty('shape-outside')
}
