/**
 * Ordering class names the way Tailwind's own stylesheet orders its utilities.
 *
 * This is the ordering `prettier-plugin-tailwindcss` produces: utilities sorted
 * by the position their plugin occupies in Tailwind's `corePlugins` list, so a
 * class list reads layout -> box model -> typography -> visual effects, and two
 * elements with the same styles always spell them in the same order.
 *
 * The table below is deliberately version agnostic. Where v4 renamed a utility
 * it sits at the same rank as its v3 spelling (`grow` next to `flex-grow`,
 * `text-ellipsis` next to `overflow-ellipsis`), so one table serves both.
 */

import { isArbitraryProperty } from './convert/format.js'
import { DISPLAY_VALUES } from './convert/handlers/layout.js'
import { FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, buildBorderWidthScale } from './theme/scales.js'
import { isLength, isNumber } from './utils/unit.js'
import { hasNegative, splitTopLevel } from './utils/value.js'

/**
 * One rank in the ordering.
 *
 * `exact` holds closed keyword utilities; `prefixes` holds families whose suffix
 * is a scale value. Exact names are matched first, then the longest matching
 * prefix, so `justify-items-center` never gets claimed by `justify-`.
 */
interface OrderGroup {
  readonly exact?: readonly string[]
  readonly prefixes?: readonly string[]
}

/*
 * Scale members are read from the tables that define them rather than retyped.
 * A hand-copied list that falls behind does not fail loudly: the missing class
 * still matches its family's catch-all prefix, so `text-10xl` would quietly rank
 * as a colour rather than a font size.
 */
const DISPLAY = Object.values(DISPLAY_VALUES)
const FONT_SIZES = Object.values(FONT_SIZE_SCALE)
const FONT_WEIGHTS = Object.values(FONT_WEIGHT_SCALE)

const BORDER_SIDES = ['x', 'y', 's', 'e', 't', 'r', 'b', 'l']

/** `border`, `border-2`, `border-t`, `border-t-2`, … — every non-arbitrary width. */
const BORDER_WIDTHS = ['border', ...BORDER_SIDES.map(side => `border-${side}`)].flatMap(prefix =>
  Object.values(buildBorderWidthScale(prefix))
)

/**
 * The ordering itself, one entry per Tailwind core plugin, in `corePlugins` order.
 *
 * Adjacent plugins that can never disagree about a class are collapsed into one
 * entry (all the `bg-*` background plugins, for instance): merging them costs
 * nothing because within a rank the input order is kept.
 */
const ORDER: readonly OrderGroup[] = [
  { exact: ['container'] },
  { exact: ['sr-only', 'not-sr-only'] },
  { exact: ['pointer-events-none', 'pointer-events-auto'] },
  { exact: ['visible', 'invisible', 'collapse'] },
  { exact: ['static', 'fixed', 'absolute', 'relative', 'sticky'] },
  { prefixes: ['inset-', 'start-', 'end-', 'top-', 'right-', 'bottom-', 'left-'] },
  { exact: ['isolate', 'isolation-auto'] },
  { prefixes: ['z-'] },
  { prefixes: ['order-'] },
  { prefixes: ['col-'] },
  { prefixes: ['row-'] },
  { prefixes: ['float-'] },
  { prefixes: ['clear-'] },
  { prefixes: ['m-', 'mx-', 'my-', 'ms-', 'me-', 'mt-', 'mr-', 'mb-', 'ml-'] },
  { exact: ['box-border', 'box-content'] },
  { prefixes: ['line-clamp-'] },
  { exact: DISPLAY },
  { prefixes: ['aspect-'] },
  { prefixes: ['size-'] },
  { prefixes: ['h-'] },
  { prefixes: ['max-h-'] },
  { prefixes: ['min-h-'] },
  { prefixes: ['w-'] },
  { prefixes: ['min-w-'] },
  { prefixes: ['max-w-'] },
  { exact: ['flex-1', 'flex-auto', 'flex-initial', 'flex-none'], prefixes: ['flex-['] },
  { exact: ['shrink', 'flex-shrink'], prefixes: ['shrink-', 'flex-shrink-'] },
  { exact: ['grow', 'flex-grow'], prefixes: ['grow-', 'flex-grow-'] },
  { prefixes: ['basis-'] },
  { exact: ['table-auto', 'table-fixed'] },
  { exact: ['caption-top', 'caption-bottom'] },
  { exact: ['border-collapse', 'border-separate'] },
  { prefixes: ['border-spacing-'] },
  { prefixes: ['origin-'] },
  { prefixes: ['translate-'] },
  { prefixes: ['rotate-'] },
  { prefixes: ['skew-'] },
  { prefixes: ['scale-'] },
  { exact: ['transform'], prefixes: ['transform-'] },
  { prefixes: ['animate-'] },
  { prefixes: ['cursor-'] },
  { prefixes: ['touch-'] },
  { prefixes: ['select-'] },
  { exact: ['resize'], prefixes: ['resize-'] },
  { prefixes: ['snap-'] },
  { prefixes: ['scroll-m', 'scroll-p'] },
  { prefixes: ['list-'] },
  { prefixes: ['appearance-'] },
  { prefixes: ['columns-'] },
  { prefixes: ['break-before-', 'break-inside-', 'break-after-'] },
  { prefixes: ['auto-cols-', 'grid-flow-', 'auto-rows-', 'grid-cols-', 'grid-rows-'] },
  { exact: ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse'] },
  { exact: ['flex-wrap', 'flex-wrap-reverse', 'flex-nowrap'] },
  { prefixes: ['place-content-'] },
  { prefixes: ['place-items-'] },
  { prefixes: ['content-'] },
  { prefixes: ['items-'] },
  { prefixes: ['justify-'] },
  { prefixes: ['justify-items-'] },
  { prefixes: ['gap-'] },
  { prefixes: ['space-x-', 'space-y-'] },
  { prefixes: ['divide-'] },
  { prefixes: ['place-self-'] },
  { prefixes: ['self-'] },
  { prefixes: ['justify-self-'] },
  { prefixes: ['overflow-'] },
  { prefixes: ['overscroll-'] },
  { exact: ['scroll-auto', 'scroll-smooth'] },
  { exact: ['truncate', 'text-ellipsis', 'text-clip', 'overflow-ellipsis', 'overflow-clip'] },
  { prefixes: ['hyphens-'] },
  { prefixes: ['whitespace-'] },
  { exact: ['text-wrap', 'text-nowrap', 'text-balance', 'text-pretty'] },
  { exact: ['break-normal', 'break-words', 'break-all', 'break-keep'] },
  { exact: ['rounded'], prefixes: ['rounded-'] },
  { exact: BORDER_WIDTHS, prefixes: ['border-x-', 'border-y-', 'border-s-', 'border-e-', 'border-t-', 'border-r-', 'border-b-', 'border-l-'] },
  {
    exact: [
      'border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden',
      'border-none'
    ]
  },
  { prefixes: ['border-'] },
  { prefixes: ['bg-'] },
  { prefixes: ['from-', 'via-', 'to-'] },
  {
    exact: [
      'decoration-slice', 'decoration-clone', 'box-decoration-slice', 'box-decoration-clone'
    ]
  },
  { prefixes: ['bg-blend-'] },
  { prefixes: ['fill-'] },
  { prefixes: ['stroke-'] },
  { prefixes: ['object-'] },
  { prefixes: ['p-', 'px-', 'py-', 'ps-', 'pe-', 'pt-', 'pr-', 'pb-', 'pl-'] },
  { exact: ['text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'text-end'] },
  { prefixes: ['indent-'] },
  { prefixes: ['align-'] },
  { exact: ['font-sans', 'font-serif', 'font-mono'], prefixes: ['font-'] },
  { exact: FONT_SIZES },
  { exact: FONT_WEIGHTS },
  { exact: ['uppercase', 'lowercase', 'capitalize', 'normal-case'] },
  { exact: ['italic', 'not-italic'] },
  {
    exact: [
      'normal-nums', 'ordinal', 'slashed-zero', 'lining-nums', 'oldstyle-nums',
      'proportional-nums', 'tabular-nums', 'diagonal-fractions', 'stacked-fractions'
    ]
  },
  { prefixes: ['leading-'] },
  { prefixes: ['tracking-'] },
  { prefixes: ['text-'] },
  { exact: ['underline', 'overline', 'line-through', 'no-underline'] },
  { prefixes: ['decoration-'] },
  { prefixes: ['underline-offset-'] },
  { exact: ['antialiased', 'subpixel-antialiased'] },
  { prefixes: ['placeholder-'] },
  { prefixes: ['caret-'] },
  { prefixes: ['accent-'] },
  { prefixes: ['opacity-'] },
  { prefixes: ['mix-blend-'] },
  { exact: ['shadow'], prefixes: ['shadow-'] },
  {
    exact: [
      'outline-none', 'outline-hidden', 'outline-solid', 'outline-dashed', 'outline-dotted',
      'outline-double'
    ]
  },
  { exact: ['outline'], prefixes: ['outline-'] },
  { prefixes: ['outline-offset-'] },
  { exact: ['ring', 'ring-inset'], prefixes: ['ring-'] },
  { prefixes: ['ring-offset-'] },
  {
    exact: ['blur', 'drop-shadow', 'grayscale', 'invert', 'sepia'],
    prefixes: [
      'blur-', 'brightness-', 'contrast-', 'drop-shadow-', 'grayscale-', 'hue-rotate-',
      'invert-', 'saturate-', 'sepia-'
    ]
  },
  { exact: ['filter', 'filter-none'] },
  { prefixes: ['backdrop-'] },
  { exact: ['backdrop-filter', 'backdrop-filter-none'] },
  { exact: ['transition'], prefixes: ['transition-'] },
  { prefixes: ['delay-'] },
  { prefixes: ['duration-'] },
  { prefixes: ['ease-'] },
  { prefixes: ['will-change-'] },
  { prefixes: ['content-['] }
]

/** Sentinel ranks. Unrecognised classes lead, arbitrary properties trail. */
const UNKNOWN_RANK = -1
const ARBITRARY_PROPERTY_RANK = ORDER.length

const EXACT_RANKS = new Map<string, number>()
for (let rank = 0; rank < ORDER.length; rank++) {
  for (const name of ORDER[rank]?.exact ?? []) {
    if (!EXACT_RANKS.has(name)) EXACT_RANKS.set(name, rank)
  }
}

/**
 * Prefixes bucketed on the segment before their first `-`, longest first within
 * a bucket so a more specific family still wins (`justify-items-` over
 * `justify-`). One flat list would be scanned end to end for every class, and
 * ordering it longest-first puts the commonest prefixes — `w-`, `h-`, `p-` —
 * at the far end of it.
 */
const bucketOf = (name: string): string => {
  const hyphen = name.indexOf('-')
  return hyphen === -1 ? name : name.slice(0, hyphen)
}

const PREFIX_BUCKETS = new Map<string, [string, number][]>()
for (let rank = 0; rank < ORDER.length; rank++) {
  for (const prefix of ORDER[rank]?.prefixes ?? []) {
    const bucket = PREFIX_BUCKETS.get(bucketOf(prefix))
    if (bucket) bucket.push([prefix, rank])
    else PREFIX_BUCKETS.set(bucketOf(prefix), [[prefix, rank]])
  }
}
for (const bucket of PREFIX_BUCKETS.values()) {
  bucket.sort((a, b) => b[0].length - a[0].length)
}

const prefixRankOf = (name: string): number => {
  for (const [prefix, rank] of PREFIX_BUCKETS.get(bucketOf(name)) ?? []) {
    if (name.startsWith(prefix)) return rank
  }
  return UNKNOWN_RANK
}

/*
 * Families whose suffix decides which plugin a class belongs to. `text-[14px]`
 * is a font size and `text-[#fff]` a colour; `border-[1px]` a width and
 * `border-[#eee]` a colour. Only a length can be the size or the width, so one
 * predicate splits each pair.
 */
const exactRankOf = (name: string): number => EXACT_RANKS.get(name) ?? UNKNOWN_RANK

const FONT_SIZE_RANK = exactRankOf('text-xs')
const FONT_WEIGHT_RANK = exactRankOf('font-bold')
const BORDER_WIDTH_RANK = exactRankOf('border')
/** `border-t-[#f00]` would otherwise be claimed by the longer `border-t-` width prefix. */
const BORDER_COLOR_RANK = prefixRankOf('border-')

const BORDER_SIDE_ARBITRARY = /^border-[xystrbl]-\[/

/** The bracketed part of an arbitrary-value class, or `null` when there is none. */
const arbitraryValueOf = (name: string): string | null => {
  const open = name.indexOf('[')
  if (open === -1 || !name.endsWith(']')) return null
  return name.slice(open + 1, -1)
}

/**
 * Only the length branches need naming. When the value is not a length the class
 * belongs to its family's catch-all prefix — `text-`, `font-`, `border-` — which
 * is where the ordinary prefix lookup would put it anyway, so those fall through.
 */
const lengthRankOf = (name: string): number | null => {
  if (name.startsWith('text-[')) {
    const value = arbitraryValueOf(name)
    return value !== null && isLength(value) ? FONT_SIZE_RANK : null
  }

  if (name.startsWith('font-[')) {
    const value = arbitraryValueOf(name)
    return value !== null && isNumber(value) ? FONT_WEIGHT_RANK : null
  }

  if (name.startsWith('border-[') || BORDER_SIDE_ARBITRARY.test(name)) {
    const value = arbitraryValueOf(name)
    return value !== null && isLength(value) ? BORDER_WIDTH_RANK : BORDER_COLOR_RANK
  }

  return null
}

const rankOf = (name: string): number => {
  if (isArbitraryProperty(name)) return ARBITRARY_PROPERTY_RANK

  const exact = EXACT_RANKS.get(name)
  if (exact !== undefined) return exact

  return lengthRankOf(name) ?? prefixRankOf(name)
}

export interface SortOptions {
  /** Tailwind's `prefix`, stripped before a class is ranked. Defaults to `''`. */
  prefix?: string
}

interface RankedClass {
  readonly className: string
  /** Everything up to the last top-level `:`, `''` when the class has no variants. */
  readonly variants: string
  readonly rank: number
}

/**
 * Strip the decoration `formatClasses` applied, leaving the bare utility.
 *
 * The layers come off in the order they went on: variants outermost, then the
 * important marker (leading in v3, trailing in v4), then a leading minus sign,
 * then the configured prefix.
 */
const rankClass = (className: string, prefix: string): RankedClass => {
  let name = className
  let variants = ''

  // Nothing Figma or a plain stylesheet produces carries a variant, and
  // `splitTopLevel` walks the string by hand once a class contains brackets.
  if (className.indexOf(':') !== -1) {
    const parts = splitTopLevel(className, ':')
    name = parts[parts.length - 1] as string
    variants = parts.slice(0, -1).join(':')
  }

  if (name.startsWith('!')) name = name.slice(1)
  else if (name.endsWith('!')) name = name.slice(0, -1)

  name = hasNegative(name)[1]
  if (prefix !== '' && name.startsWith(prefix)) name = name.slice(prefix.length)

  return { className, variants, rank: rankOf(name) }
}

/**
 * Sort class names into Tailwind's recommended order.
 *
 * Classes without variants come first, then each variant chain as a block, the
 * chains in the order they first appear. (Prettier orders the chains themselves
 * by Tailwind's variant order; first-appearance is just as deterministic and
 * needs no second table.) Within a block, classes run in `corePlugins` order,
 * with unrecognised classes ahead of everything and arbitrary properties
 * (`[caption-side:top]`) behind it. Ties keep their input order.
 */
export const sortClassNames = (
  classNames: readonly string[],
  options: SortOptions = {}
): string[] => {
  const prefix = options.prefix ?? ''
  const ranked = classNames.map(className => rankClass(className, prefix))

  // Variant blocks are ordered by first appearance; the unprefixed block leads.
  const variantOrder = new Map<string, number>([['', 0]])
  for (const item of ranked) {
    if (!variantOrder.has(item.variants)) variantOrder.set(item.variants, variantOrder.size)
  }

  // `sort` has been stable since ES2019, which is what keeps one rank in input order.
  return ranked
    .sort((a, b) => {
      const byVariant =
        (variantOrder.get(a.variants) as number) - (variantOrder.get(b.variants) as number)
      return byVariant !== 0 ? byVariant : a.rank - b.rank
    })
    .map(item => item.className)
}
