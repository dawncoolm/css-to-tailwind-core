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
import { isLength, isNumber } from './utils/unit.js'
import { splitTopLevel } from './utils/value.js'

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

const DISPLAY = [
  'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'table', 'inline-table',
  'table-caption', 'table-cell', 'table-column', 'table-column-group', 'table-footer-group',
  'table-header-group', 'table-row-group', 'table-row', 'flow-root', 'grid', 'inline-grid',
  'contents', 'list-item', 'hidden'
]

const BORDER_SIDES = ['x', 'y', 's', 'e', 't', 'r', 'b', 'l']
const BORDER_WIDTH_STEPS = ['0', '2', '4', '8']

/** `border`, `border-2`, `border-t`, `border-t-2`, … — every non-arbitrary width. */
const BORDER_WIDTHS = [
  'border',
  ...BORDER_WIDTH_STEPS.map(step => `border-${step}`),
  ...BORDER_SIDES.flatMap(side => [
    `border-${side}`,
    ...BORDER_WIDTH_STEPS.map(step => `border-${side}-${step}`)
  ])
]

const FONT_SIZES = [
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
  'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'
]

const FONT_WEIGHTS = [
  'font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold',
  'font-bold', 'font-extrabold', 'font-black'
]

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

const rankOfGroup = (name: string): number => {
  for (let i = 0; i < ORDER.length; i++) {
    if (ORDER[i]?.exact?.includes(name) === true) return i
  }
  return UNKNOWN_RANK
}

const EXACT_RANKS = new Map<string, number>()
for (let rank = 0; rank < ORDER.length; rank++) {
  for (const name of ORDER[rank]?.exact ?? []) {
    if (!EXACT_RANKS.has(name)) EXACT_RANKS.set(name, rank)
  }
}

/** Longest prefix first, so a more specific family always wins. */
const PREFIX_RANKS: readonly (readonly [string, number])[] = ORDER.flatMap((group, rank) =>
  (group.prefixes ?? []).map(prefix => [prefix, rank] as const)
).sort((a, b) => b[0].length - a[0].length)

/*
 * Families whose suffix decides which plugin a class belongs to. `text-[14px]`
 * is a font size and `text-[#fff]` a colour; `border-[1px]` a width and
 * `border-[#eee]` a colour. Only a length can be the size or the width, so one
 * predicate splits each pair.
 */
const FONT_SIZE_RANK = rankOfGroup('text-xs')
const TEXT_COLOR_RANK = PREFIX_RANKS.find(([prefix]) => prefix === 'text-')?.[1] ?? UNKNOWN_RANK
const FONT_FAMILY_RANK = rankOfGroup('font-sans')
const FONT_WEIGHT_RANK = rankOfGroup('font-bold')
const BORDER_WIDTH_RANK = rankOfGroup('border')
const BORDER_COLOR_RANK = PREFIX_RANKS.find(([prefix]) => prefix === 'border-')?.[1] ?? UNKNOWN_RANK
const CONTENT_RANK = PREFIX_RANKS.find(([prefix]) => prefix === 'content-[')?.[1] ?? UNKNOWN_RANK

const BORDER_SIDE_ARBITRARY = /^border-[xystrbl]-\[/

/** The bracketed part of an arbitrary-value class, or `null` when there is none. */
const arbitraryValueOf = (name: string): string | null => {
  const open = name.indexOf('[')
  if (open === -1 || !name.endsWith(']')) return null
  return name.slice(open + 1, -1)
}

const ambiguousRank = (name: string): number | null => {
  if (name.startsWith('content-[')) return CONTENT_RANK

  if (name.startsWith('text-[')) {
    const value = arbitraryValueOf(name)
    return value !== null && isLength(value) ? FONT_SIZE_RANK : TEXT_COLOR_RANK
  }

  if (name.startsWith('font-[')) {
    const value = arbitraryValueOf(name)
    return value !== null && isNumber(value) ? FONT_WEIGHT_RANK : FONT_FAMILY_RANK
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

  const ambiguous = ambiguousRank(name)
  if (ambiguous !== null) return ambiguous

  for (const [prefix, rank] of PREFIX_RANKS) {
    if (name.startsWith(prefix)) return rank
  }

  return UNKNOWN_RANK
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
  readonly index: number
}

/**
 * Strip the decoration `formatClasses` applied, leaving the bare utility.
 *
 * The layers come off in the order they went on: variants outermost, then the
 * important marker (leading in v3, trailing in v4), then a leading minus sign,
 * then the configured prefix.
 */
const rankClass = (className: string, prefix: string, index: number): RankedClass => {
  const parts = splitTopLevel(className, ':')
  let name = parts[parts.length - 1] as string
  const variants = parts.slice(0, -1).join(':')

  if (name.startsWith('!')) name = name.slice(1)
  else if (name.endsWith('!')) name = name.slice(0, -1)

  if (name.startsWith('-')) name = name.slice(1)
  if (prefix !== '' && name.startsWith(prefix)) name = name.slice(prefix.length)

  return { className, variants, rank: rankOf(name), index }
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
  const ranked = classNames.map((className, index) => rankClass(className, prefix, index))

  // Variant blocks are ordered by first appearance; the unprefixed block leads.
  const variantOrder = new Map<string, number>([['', 0]])
  for (const item of ranked) {
    if (!variantOrder.has(item.variants)) variantOrder.set(item.variants, variantOrder.size)
  }

  return ranked
    .slice()
    .sort((a, b) => {
      const byVariant =
        (variantOrder.get(a.variants) as number) - (variantOrder.get(b.variants) as number)
      if (byVariant !== 0) return byVariant
      if (a.rank !== b.rank) return a.rank - b.rank
      // Explicit, rather than relying on the sort being stable.
      return a.index - b.index
    })
    .map(item => item.className)
}
