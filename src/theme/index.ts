/** Theme resolution: exposes the built-in preset for a Tailwind major version. */

import type { TailwindVersion } from '../types.js'
import { V3_PRESET } from './v3.js'
import { V4_PRESET } from './v4.js'

export interface ResolvedTheme {
  /** Per-CSS-property default value tables (`{ width: { '100%': 'w-full' } }`). */
  readonly defaults: Readonly<Record<string, Readonly<Record<string, string>>>>
  /** At-rule prelude (whitespace removed) -> variant name. */
  readonly media: Readonly<Record<string, string>>
  /** Border radius length -> class suffix, `''` for the bare `rounded`. */
  readonly radius: Readonly<Record<string, string>>
  /** Whole `filter()` call -> utility class. */
  readonly filter: Readonly<Record<string, string>>
  readonly spacing: Readonly<Record<string, string>>
  readonly scale: Readonly<Record<string, string>>
  readonly rotate: Readonly<Record<string, string>>
  readonly skew: Readonly<Record<string, string>>
  readonly translate: Readonly<Record<string, string>>
}

const PRESETS: Readonly<Record<TailwindVersion, ResolvedTheme>> = Object.freeze({
  3: V3_PRESET,
  4: V4_PRESET
})

/** Return the built-in preset for a Tailwind major version. */
export const getPreset = (version: TailwindVersion): ResolvedTheme => PRESETS[version]
