/** Tailwind v3 default value tables. */

import {
  BOX_SHADOW_SCALE_V3,
  FONT_SIZE_SCALE,
  FONT_WEIGHT_SCALE,
  LINE_HEIGHT_RATIOS,
  INSET_FRACTIONS,
  MEDIA_BREAKPOINTS,
  RADIUS_SCALE_V3,
  ROTATE_VALUES,
  SCALE_VALUES,
  SKEW_VALUES,
  SPACING_SCALE,
  TRANSLATE_VALUES,
  buildBorderWidthScale,
  buildSpacingScale
} from './scales.js'

const insetOptions = { negative: true, auto: true, fractions: INSET_FRACTIONS } as const

/** `filter` / `backdrop-filter` function calls that map to a named utility. */
export const FILTER_SCALE_V3: Readonly<Record<string, string>> = Object.freeze({
  'blur(0)': 'blur-none',
  'blur(4px)': 'blur-sm',
  'blur(8px)': 'blur',
  'blur(12px)': 'blur-md',
  'blur(16px)': 'blur-lg',
  'blur(24px)': 'blur-xl',
  'blur(40px)': 'blur-2xl',
  'blur(64px)': 'blur-3xl',
  'brightness(0)': 'brightness-0',
  'brightness(.5)': 'brightness-50',
  'brightness(.75)': 'brightness-75',
  'brightness(.9)': 'brightness-90',
  'brightness(.95)': 'brightness-95',
  'brightness(1)': 'brightness-100',
  'brightness(1.05)': 'brightness-105',
  'brightness(1.1)': 'brightness-110',
  'brightness(1.25)': 'brightness-125',
  'brightness(1.5)': 'brightness-150',
  'brightness(2)': 'brightness-200',
  'contrast(0)': 'contrast-0',
  'contrast(.5)': 'contrast-50',
  'contrast(.75)': 'contrast-75',
  'contrast(1)': 'contrast-100',
  'contrast(1.25)': 'contrast-125',
  'contrast(1.5)': 'contrast-150',
  'contrast(2)': 'contrast-200',
  'drop-shadow(0 1px 1px rgba(0,0,0,0.05))': 'drop-shadow-sm',
  'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.06))':
    'drop-shadow',
  'drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06))':
    'drop-shadow-md',
  'drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04)) drop-shadow(0 4px 3px rgba(0, 0, 0, 0.1))':
    'drop-shadow-lg',
  'drop-shadow(0 20px 13px rgba(0, 0, 0, 0.03)) drop-shadow(0 8px 5px rgba(0, 0, 0, 0.08))':
    'drop-shadow-xl',
  'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15))': 'drop-shadow-2xl',
  'drop-shadow(0 0 #0000)': 'drop-shadow-none',
  'grayscale(0)': 'grayscale-0',
  'grayscale(1)': 'grayscale',
  'hue-rotate(-180deg)': '-hue-rotate-180',
  'hue-rotate(-90deg)': '-hue-rotate-90',
  'hue-rotate(-60deg)': '-hue-rotate-60',
  'hue-rotate(-30deg)': '-hue-rotate-30',
  'hue-rotate(-15deg)': '-hue-rotate-15',
  'hue-rotate(0deg)': 'hue-rotate-0',
  'hue-rotate(15deg)': 'hue-rotate-15',
  'hue-rotate(30deg)': 'hue-rotate-30',
  'hue-rotate(60deg)': 'hue-rotate-60',
  'hue-rotate(90deg)': 'hue-rotate-90',
  'hue-rotate(180deg)': 'hue-rotate-180',
  'invert(0)': 'invert-0',
  'invert(1)': 'invert',
  'saturate(0)': 'saturate-0',
  'saturate(.5)': 'saturate-50',
  'saturate(1)': 'saturate-100',
  'saturate(1.5)': 'saturate-150',
  'saturate(2)': 'saturate-200',
  'sepia(0)': 'sepia-0',
  'sepia(1)': 'sepia'
})

/**
 * Per-property default value tables.
 *
 * Consulted before the property handler runs, and only when
 * `useAllDefaultValues` is on. Keys are raw CSS values, values are complete class
 * names.
 */
export const DEFAULT_VALUES_V3: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = Object.freeze({
  top: buildSpacingScale('top', insetOptions),
  bottom: buildSpacingScale('bottom', insetOptions),
  left: buildSpacingScale('left', insetOptions),
  right: buildSpacingScale('right', insetOptions),
  inset: buildSpacingScale('inset', insetOptions),
  gap: buildSpacingScale('gap'),
  'column-gap': buildSpacingScale('gap-x'),
  'row-gap': buildSpacingScale('gap-y'),
  'max-width': Object.freeze({
    '0rem': 'max-w-0',
    '20rem': 'max-w-xs',
    '24rem': 'max-w-sm',
    '28rem': 'max-w-md',
    '32rem': 'max-w-lg',
    '36rem': 'max-w-xl',
    '42rem': 'max-w-2xl',
    '48rem': 'max-w-3xl',
    '56rem': 'max-w-4xl',
    '64rem': 'max-w-5xl',
    '72rem': 'max-w-6xl',
    '80rem': 'max-w-7xl',
    '65ch': 'max-w-prose',
    '640px': 'max-w-screen-sm',
    '768px': 'max-w-screen-md',
    '1024px': 'max-w-screen-lg',
    '1280px': 'max-w-screen-xl',
    '1536px': 'max-w-screen-2xl'
  }),
  'max-height': buildSpacingScale('max-h'),
  'font-size': FONT_SIZE_SCALE,
  'box-shadow': BOX_SHADOW_SCALE_V3,
  'font-family': Object.freeze({
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"':
      'font-sans',
    'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif': 'font-serif',
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace':
      'font-mono'
  }),
  'font-weight': FONT_WEIGHT_SCALE,
  'line-height': Object.freeze({
    '.75rem': 'leading-3',
    '0.75rem': 'leading-3',
    '1rem': 'leading-4',
    '1.25rem': 'leading-5',
    '1.5rem': 'leading-6',
    '1.75rem': 'leading-7',
    '2rem': 'leading-8',
    '2.25rem': 'leading-9',
    '2.5rem': 'leading-10',
    ...LINE_HEIGHT_RATIOS
  }),
  'border-width': buildBorderWidthScale('border'),
  'border-top-width': buildBorderWidthScale('border-t'),
  'border-right-width': buildBorderWidthScale('border-r'),
  'border-bottom-width': buildBorderWidthScale('border-b'),
  'border-left-width': buildBorderWidthScale('border-l'),
  transition: Object.freeze({
    'all 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-all',
    'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter 150ms cubic-bezier(0.4, 0, 0.2, 1)':
      'transition',
    'background-color, border-color, color, fill, stroke 150ms cubic-bezier(0.4, 0, 0.2, 1)':
      'transition-colors',
    'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-opacity',
    'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-shadow',
    'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)': 'transition-transform'
  })
})

export const V3_PRESET = Object.freeze({
  defaults: DEFAULT_VALUES_V3,
  media: MEDIA_BREAKPOINTS,
  radius: RADIUS_SCALE_V3,
  filter: FILTER_SCALE_V3,
  spacing: SPACING_SCALE,
  scale: SCALE_VALUES,
  rotate: ROTATE_VALUES,
  skew: SKEW_VALUES,
  translate: TRANSLATE_VALUES,
  utilities: Object.freeze({
    grow: 'flex-grow',
    shrink: 'flex-shrink',
    outlineNone: 'outline-none',
    textEllipsis: 'overflow-ellipsis',
    textClip: 'overflow-clip',
    decorationSlice: 'decoration-slice',
    decorationClone: 'decoration-clone'
  }),
  filterMarker: true
})
