/**
 * Tailwind v4 preset, expressed as a delta over v3.
 *
 * v4 renamed a number of scales rather than redesigning them, so only the tables
 * that actually changed are restated here. Anything not mentioned is inherited
 * from {@link V3_PRESET}.
 *
 * Covered renames:
 * - `flex-grow`/`flex-shrink` -> `grow`/`shrink` (see the flexbox handlers)
 * - shadow scale shifted down one step, `shadow-2xs` added
 * - radius scale shifted down one step, `rounded-4xl` added
 * - blur scale shifted down one step, `blur-xs` added
 * - `outline-none` -> `outline-hidden`
 * - `overflow-ellipsis`/`overflow-clip` -> `text-ellipsis`/`text-clip` (renamed in
 *   3.3, the `overflow-*` aliases dropped in v4)
 * - `decoration-slice`/`decoration-clone` -> `box-decoration-slice`/`box-decoration-clone`
 * - the bare `transform` / `filter` / `backdrop-filter` marker classes are gone
 */

import { BOX_SHADOW_SCALE_V4, RADIUS_SCALE_V4 } from './scales.js'
import { DEFAULT_VALUES_V3, FILTER_SCALE_V3, V3_PRESET } from './v3.js'

/** v4 shifted every blur name down one step and added `blur-xs`. */
export const FILTER_SCALE_V4: Readonly<Record<string, string>> = Object.freeze({
  ...FILTER_SCALE_V3,
  'blur(0)': 'blur-none',
  'blur(4px)': 'blur-xs',
  'blur(8px)': 'blur-sm',
  'blur(12px)': 'blur-md',
  'blur(16px)': 'blur-lg',
  'blur(24px)': 'blur-xl',
  'blur(40px)': 'blur-2xl',
  'blur(64px)': 'blur-3xl',
  'drop-shadow(0 1px 1px rgba(0,0,0,0.05))': 'drop-shadow-xs',
  'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.06))':
    'drop-shadow-sm'
})

/**
 * v4 renamed the container-scale `max-w-screen-*` utilities to `max-w-{size}`
 * and dropped the separate screen namespace.
 */
const MAX_WIDTH_V4: Readonly<Record<string, string>> = Object.freeze({
  '0rem': 'max-w-0',
  '16rem': 'max-w-xs',
  '20rem': 'max-w-sm',
  '24rem': 'max-w-md',
  '28rem': 'max-w-lg',
  '32rem': 'max-w-xl',
  '36rem': 'max-w-2xl',
  '42rem': 'max-w-3xl',
  '48rem': 'max-w-4xl',
  '56rem': 'max-w-5xl',
  '64rem': 'max-w-6xl',
  '72rem': 'max-w-7xl',
  '80rem': 'max-w-screen-2xl',
  '65ch': 'max-w-prose',
  '640px': 'max-w-sm',
  '768px': 'max-w-md',
  '1024px': 'max-w-lg',
  '1280px': 'max-w-xl',
  '1536px': 'max-w-2xl'
})

export const DEFAULT_VALUES_V4: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = Object.freeze({
  ...DEFAULT_VALUES_V3,
  'max-width': MAX_WIDTH_V4,
  'box-shadow': BOX_SHADOW_SCALE_V4
})

export const V4_PRESET = Object.freeze({
  ...V3_PRESET,
  defaults: DEFAULT_VALUES_V4,
  radius: RADIUS_SCALE_V4,
  filter: FILTER_SCALE_V4,
  utilities: Object.freeze({
    grow: 'grow',
    shrink: 'shrink',
    outlineNone: 'outline-hidden',
    textEllipsis: 'text-ellipsis',
    textClip: 'text-clip',
    decorationSlice: 'box-decoration-slice',
    decorationClone: 'box-decoration-clone'
  }),
  filterMarker: false
})
