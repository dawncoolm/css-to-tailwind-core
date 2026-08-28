/**
 * Tailwind's default value ladders.
 *
 * The original package hard-coded the same rem ladder more than twenty times,
 * once per property, which is where most of its 89 KB went and why `gap` was
 * missing `gap-px` while `column-gap` had it. Here the ladder exists once and the
 * per-property tables are generated from it, so they cannot drift apart.
 */

/** Spacing scale: CSS length -> Tailwind suffix. */
export const SPACING_SCALE: Readonly<Record<string, string>> = Object.freeze({
  '0px': '0',
  '1px': 'px',
  '0.125rem': '0.5',
  '0.25rem': '1',
  '0.375rem': '1.5',
  '0.5rem': '2',
  '0.625rem': '2.5',
  '0.75rem': '3',
  '0.875rem': '3.5',
  '1rem': '4',
  '1.25rem': '5',
  '1.5rem': '6',
  '1.75rem': '7',
  '2rem': '8',
  '2.25rem': '9',
  '2.5rem': '10',
  '2.75rem': '11',
  '3rem': '12',
  '3.5rem': '14',
  '4rem': '16',
  '5rem': '20',
  '6rem': '24',
  '7rem': '28',
  '8rem': '32',
  '9rem': '36',
  '10rem': '40',
  '11rem': '44',
  '12rem': '48',
  '13rem': '52',
  '14rem': '56',
  '15rem': '60',
  '16rem': '64',
  '18rem': '72',
  '20rem': '80',
  '24rem': '96'
})

/** Fractions used by inset utilities (`top-1/3`), which use `2/4` rather than `1/2`. */
export const INSET_FRACTIONS: Readonly<Record<string, string>> = Object.freeze({
  '50%': '2/4',
  '33.333333%': '1/3',
  '66.666667%': '2/3',
  '25%': '1/4',
  '75%': '3/4',
  '100%': 'full'
})

/** Fractions used by sizing utilities (`w-1/2`), including the twelfths. */
export const SIZE_FRACTIONS: Readonly<Record<string, string>> = Object.freeze({
  '50%': '1/2',
  '33.33%': '1/3',
  '66.66%': '2/3',
  '25%': '1/4',
  '75%': '3/4',
  '20%': '1/5',
  '40%': '2/5',
  '60%': '3/5',
  '80%': '4/5',
  '16.66%': '1/6',
  '83.33%': '5/6',
  '8.33%': '1/12',
  '41.66%': '5/12',
  '58.33%': '7/12',
  '91.66%': '11/12',
  '100%': 'full',
  '100vw': 'screen',
  '100vh': 'screen',
  'min-content': 'min',
  'max-content': 'max',
  auto: 'auto'
})

export interface SpacingScaleOptions {
  /** Also emit `-{prefix}-{suffix}` entries keyed by the negated length. */
  negative?: boolean
  /** Emit `{prefix}-auto` for the `auto` keyword. */
  auto?: boolean
  /** Fraction table to merge in, e.g. {@link INSET_FRACTIONS}. */
  fractions?: Readonly<Record<string, string>>
}

/**
 * Build a `value -> class` table for one spacing-driven property.
 *
 * @example
 * buildSpacingScale('top', { negative: true, auto: true, fractions: INSET_FRACTIONS })
 * // { '0px': 'top-0', '1px': 'top-px', …, '-1px': '-top-px', …, 'auto': 'top-auto' }
 */
export const buildSpacingScale = (
  prefix: string,
  options: SpacingScaleOptions = {}
): Readonly<Record<string, string>> => {
  const table: Record<string, string> = {}

  for (const [value, suffix] of Object.entries(SPACING_SCALE)) {
    table[value] = `${prefix}-${suffix}`
  }

  if (options.auto) {
    table['auto'] = `${prefix}-auto`
  }

  if (options.fractions) {
    for (const [value, suffix] of Object.entries(options.fractions)) {
      table[value] = `${prefix}-${suffix}`
    }
  }

  if (options.negative) {
    for (const [value, suffix] of Object.entries(SPACING_SCALE)) {
      // Zero has no negative form.
      if (suffix === '0') continue
      table[`-${value}`] = `-${prefix}-${suffix}`
    }
    if (options.fractions) {
      for (const [value, suffix] of Object.entries(options.fractions)) {
        table[`-${value}`] = `-${prefix}-${suffix}`
      }
    }
  }

  return Object.freeze(table)
}

/** Border radius scale. `''` means the bare `rounded` class with no suffix. */
export const RADIUS_SCALE_V3: Readonly<Record<string, string>> = Object.freeze({
  '0px': '-none',
  '0.125rem': '-sm',
  '0.25rem': '',
  '0.375rem': '-md',
  '0.5rem': '-lg',
  '0.75rem': '-xl',
  '1rem': '-2xl',
  '1.5rem': '-3xl',
  '9999px': '-full'
})

/**
 * Tailwind v4 renamed the radius scale: the unnamed default became `-sm`, `-sm`
 * became `-xs`, and `-xs` was added at the bottom.
 */
export const RADIUS_SCALE_V4: Readonly<Record<string, string>> = Object.freeze({
  '0px': '-none',
  '0.125rem': '-xs',
  '0.25rem': '-sm',
  '0.375rem': '-md',
  '0.5rem': '-lg',
  '0.75rem': '-xl',
  '1rem': '-2xl',
  '1.5rem': '-3xl',
  '2rem': '-4xl',
  '9999px': '-full'
})

/** Font weight ladder: CSS value -> Tailwind utility. Shared by v3 and v4. */
export const FONT_WEIGHT_SCALE: Readonly<Record<string, string>> = Object.freeze({
  '100': 'font-thin',
  '200': 'font-extralight',
  '300': 'font-light',
  '400': 'font-normal',
  '500': 'font-medium',
  '600': 'font-semibold',
  '700': 'font-bold',
  '800': 'font-extrabold',
  '900': 'font-black',
  normal: 'font-normal',
  bold: 'font-bold'
})

/** `font-size` scale, which the original package never consulted (issue #12). */
export const FONT_SIZE_SCALE: Readonly<Record<string, string>> = Object.freeze({
  '0.75rem': 'text-xs',
  '0.875rem': 'text-sm',
  '1rem': 'text-base',
  '1.125rem': 'text-lg',
  '1.25rem': 'text-xl',
  '1.5rem': 'text-2xl',
  '1.875rem': 'text-3xl',
  '2.25rem': 'text-4xl',
  '3rem': 'text-5xl',
  '3.75rem': 'text-6xl',
  '4.5rem': 'text-7xl',
  '6rem': 'text-8xl',
  '8rem': 'text-9xl'
})

/** `box-shadow` scale, which the original package never consulted (issue #1). */
export const BOX_SHADOW_SCALE_V3: Readonly<Record<string, string>> = Object.freeze({
  '0 1px 2px 0 rgb(0 0 0 / 0.05)': 'shadow-sm',
  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)': 'shadow',
  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)': 'shadow-md',
  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)': 'shadow-lg',
  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)': 'shadow-xl',
  '0 25px 50px -12px rgb(0 0 0 / 0.25)': 'shadow-2xl',
  'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)': 'shadow-inner',
  '0 0 #0000': 'shadow-none'
})

/** v4 shifted every shadow name down one step and added `shadow-2xs`. */
export const BOX_SHADOW_SCALE_V4: Readonly<Record<string, string>> = Object.freeze({
  '0 1px rgb(0 0 0 / 0.05)': 'shadow-2xs',
  '0 1px 2px 0 rgb(0 0 0 / 0.05)': 'shadow-xs',
  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)': 'shadow-sm',
  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)': 'shadow-md',
  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)': 'shadow-lg',
  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)': 'shadow-xl',
  '0 25px 50px -12px rgb(0 0 0 / 0.25)': 'shadow-2xl',
  'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)': 'shadow-inner',
  '0 0 #0000': 'shadow-none'
})

/** Default responsive breakpoints, keyed by the whitespace-free at-rule prelude. */
export const MEDIA_BREAKPOINTS: Readonly<Record<string, string>> = Object.freeze({
  '@media(min-width:640px)': 'sm',
  '@media(min-width:768px)': 'md',
  '@media(min-width:1024px)': 'lg',
  '@media(min-width:1280px)': 'xl',
  '@media(min-width:1536px)': '2xl',
  '@media_not_all_and(min-width:640px)': 'max-sm',
  '@media_not_all_and(min-width:768px)': 'max-md',
  '@media_not_all_and(min-width:1024px)': 'max-lg',
  '@media_not_all_and(min-width:1280px)': 'max-xl',
  '@media_not_all_and(min-width:1536px)': 'max-2xl'
})

/** `transform: scale(…)` default values. */
export const SCALE_VALUES: Readonly<Record<string, string>> = Object.freeze({
  '0': '0',
  '1': '100',
  '.5': '50',
  '0.5': '50',
  '.75': '75',
  '0.75': '75',
  '.9': '90',
  '0.9': '90',
  '.95': '95',
  '0.95': '95',
  '1.05': '105',
  '1.1': '110',
  '1.25': '125',
  '1.5': '150'
})

/** `transform: rotate(…)` default values. */
export const ROTATE_VALUES: Readonly<Record<string, string>> = Object.freeze({
  '0deg': '0',
  '1deg': '1',
  '2deg': '2',
  '3deg': '3',
  '6deg': '6',
  '12deg': '12',
  '45deg': '45',
  '90deg': '90',
  '180deg': '180'
})

/** `transform: skew(…)` default values. */
export const SKEW_VALUES: Readonly<Record<string, string>> = Object.freeze({
  '0deg': '0',
  '1deg': '1',
  '2deg': '2',
  '3deg': '3',
  '6deg': '6',
  '12deg': '12'
})

/** `transform: translate(…)` default values: the spacing ladder plus fractions. */
export const TRANSLATE_VALUES: Readonly<Record<string, string>> = Object.freeze({
  ...SPACING_SCALE,
  '50%': '1/2',
  '33.33%': '1/3',
  '66.66%': '2/3',
  '25%': '1/4',
  '75%': '3/4',
  '100%': 'full'
})

/** Border widths Tailwind names, shared by the shorthand and the four sides. */
const BORDER_WIDTHS: Readonly<Record<string, string>> = Object.freeze({
  '0px': '-0',
  '2px': '-2',
  '4px': '-4',
  '8px': '-8',
  // The 1px default is the bare utility: `border`, not `border-1`.
  '1px': ''
})

/**
 * Build the `value -> class` table for one border-width property.
 *
 * @example buildBorderWidthScale('border-t') // { '0px': 'border-t-0', …, '1px': 'border-t' }
 */
export const buildBorderWidthScale = (prefix: string): Readonly<Record<string, string>> =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(BORDER_WIDTHS).map(([value, suffix]) => [value, `${prefix}${suffix}`])
    )
  )

/** Opacity ladder: CSS value -> Tailwind suffix, shared by every opacity family. */
export const OPACITY_STEPS: Readonly<Record<string, string>> = Object.freeze({
  '0': '0',
  '0.05': '5',
  '0.1': '10',
  '0.2': '20',
  '0.25': '25',
  '0.3': '30',
  '0.4': '40',
  '0.5': '50',
  '0.6': '60',
  '0.7': '70',
  '0.75': '75',
  '0.8': '80',
  '0.9': '90',
  '0.95': '95',
  '1': '100'
})

/**
 * {@link SIZE_FRACTIONS} without the given keys.
 *
 * `100vw` and `100vh` both map to `screen`, but only the axis matching the
 * property may use it: `width: 100vh` is not `w-screen`, and neither viewport
 * unit belongs on `top`/`right`/`bottom`/`left` at all. The original expressed
 * this by deleting keys from a table it rebuilt on every call.
 */
export const sizeFractionsWithout = (
  ...excluded: readonly string[]
): Readonly<Record<string, string>> =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(SIZE_FRACTIONS).filter(([value]) => !excluded.includes(value))
    )
  )

/**
 * Unitless `line-height` ratios Tailwind names.
 *
 * Shared by the version presets and the `line-height` handler: the preset entry
 * is gated on `useAllDefaultValues`, the handler's is not, and the original
 * behaved the same way. Keeping one definition stops the two from drifting.
 */
export const LINE_HEIGHT_RATIOS: Readonly<Record<string, string>> = Object.freeze({
  '1': 'leading-none',
  '2': 'leading-loose',
  '1.25': 'leading-tight',
  '1.375': 'leading-snug',
  '1.5': 'leading-normal',
  '1.625': 'leading-relaxed'
})
