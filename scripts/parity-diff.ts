/**
 * Parity sweep against the original package.
 *
 * Runs `css-to-tailwind-translator@1.2.8` and this package over the same input
 * and prints every difference. A difference is only acceptable when it matches
 * one of {@link EXPECTED_DIVERGENCES}; anything else exits non-zero.
 *
 * Two passes:
 * 1. 614 individual `property: value` declarations — every key of every static
 *    value table in the original, plus hand-picked values for each of its
 *    function-valued handlers. This is the exhaustive pass.
 * 2. Whole stylesheets, which additionally exercise selectors, variants,
 *    at-rules and class deduplication.
 *
 * Usage: pnpm parity
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { CssToTailwindTranslator as ours } from '../src/index.js'
import { isUnit } from '../src/utils/unit.js'

interface OriginalResult {
  code: string
  data: { selectorName: string; resultVal: string }[]
}

type OriginalTranslator = (code: string, config?: unknown) => OriginalResult

const CORPUS_PATH = fileURLToPath(
  new URL('../test/fixtures/declaration-corpus.json', import.meta.url)
)

const DECLARATIONS = JSON.parse(readFileSync(CORPUS_PATH, 'utf8')) as [string, string][]

const STYLESHEETS: { name: string; css: string }[] = [
  {
    name: 'readme-basic',
    css: `body {
      width: 100%;
      height: 50%;
      margin: 0 !important;
      background-color: transparent;
    }`
  },
  {
    name: 'layout',
    css: `.card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      margin: 0 auto;
      position: relative;
      top: 0.5rem;
      z-index: 10;
    }`
  },
  {
    name: 'borders',
    css: `.box {
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      border-top-width: 4px;
      outline: none;
      box-shadow: 10px 10px 5px #888888;
    }`
  },
  {
    name: 'effects',
    css: `.fx {
      opacity: 0.5;
      filter: blur(4px) brightness(1.25);
      backdrop-filter: blur(8px);
      transform: translateX(1rem) rotate(45deg) scale(1.5);
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
      mix-blend-mode: multiply;
    }`
  },
  {
    name: 'grid',
    css: `.grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      grid-column: span 2 / span 2;
      column-gap: 1rem;
      row-gap: 0.5rem;
      place-items: center;
    }`
  },
  {
    name: 'pseudo-and-media',
    css: `.btn:hover { background-color: #2563eb; }
    .btn:focus { outline: none; }
    .btn::before { content: ""; display: block; }
    @media (min-width: 768px) { .btn { padding: 1rem; } }`
  },
  {
    name: 'negatives-and-fractions',
    css: `.n {
      margin-top: -1rem;
      top: -50%;
      left: 33.333333%;
      width: 66.66%;
      height: 100vh;
      max-width: 42rem;
    }`
  },
  {
    name: 'prefix-and-important',
    css: `.p { display: flex !important; margin-top: -1rem; padding: 1rem; }`
  }
]

/**
 * Differences that are deliberate fixes rather than regressions.
 *
 * A difference is accepted when *every* class that appears on only one side
 * matches one of these patterns. Ids refer to the table in the project README.
 */
const EXPECTED_DIVERGENCES: { pattern: RegExp; reason: string }[] = [
  { pattern: /^shadow-/, reason: 'D7: box-shadow resolves the default scale (issue #1)' },
  { pattern: /^text-(xs|sm|base|lg|\dxl)$/, reason: 'D6: font-size resolves the default scale (issue #12)' },
  { pattern: /^text-\[[\d.]+(rem|px|em)\]$/, reason: 'D6: superseded by a named font-size class (issue #12)' },
  { pattern: /^gap-px$/, reason: 'the original omitted gap-px while column-gap had it' },
  { pattern: /^gap-\[1px\]$/, reason: 'superseded by gap-px' },
  { pattern: /^max-h-0$/, reason: 'the original omitted max-h-0' },
  { pattern: /^z-\[\d+\]$/, reason: 'D19: the original z-index guard could never be true' },
  { pattern: /^outline-none$/, reason: 'D18: the original emitted the invalid outline-[none]' },
  { pattern: /^outline-\[none\]$/, reason: 'D18: superseded by outline-none' },
  { pattern: /^\[box-align:(start|end|center|baseline|stretch)\]$/, reason: 'D17: the original mapped these to inherit/unset' },
  { pattern: /^\[box-align:(inherit|unset)\]$/, reason: 'D17: superseded by the real value' },
  { pattern: /^\[counter-increment:/, reason: 'D20: the original emitted [content-increment:…]' },
  { pattern: /^\[content-increment:/, reason: 'D20: superseded by [counter-increment:…]' },
  { pattern: /^(bg|text|border|fill|stroke)-\[(rgb|hsl|hwb|lab|lch|oklab|oklch|color)\(/, reason: 'D5: modern colour syntax is now recognised (issue #16)' },
  { pattern: /^(filter|backdrop-filter)$/, reason: 'the filter marker class now accompanies a resolved sub-function' },
  { pattern: /^(drop-shadow|blur|brightness|contrast|grayscale|invert|saturate|sepia|hue-rotate)/, reason: 'filter sub-function now resolves against the scale' },
  { pattern: /^\[filter:/, reason: 'superseded by named filter utilities' },
  { pattern: /^(hover|focus|active|before|after):/, reason: 'D15: variants apply to every class, not only the first' }
]

const explain = (className: string): string | null =>
  EXPECTED_DIVERGENCES.find(d => d.pattern.test(className))?.reason ?? null

/** The arbitrary value inside `prefix-[value]`, or `null` for any other shape. */
const arbitraryValueOf = (className: string): string | null =>
  /^-?[a-z-]+-\[(.+)\]$/.exec(className)?.[1] ?? null

/**
 * Whole-result rules, checked before the per-class ones.
 *
 * Some fixes change a result in a way that cannot be attributed to a single
 * class: encoding spaces splits one unusable class into several tokens, and
 * rejecting a bogus value removes the only class there was.
 */
const VALUE_LEVEL_RULES: {
  matches: (oldValue: string, newValue: string) => boolean
  reason: string
}[] = [
  {
    // The original left literal spaces inside `[...]`, which is not a class name
    // at all. Ours is the same string with spaces encoded as underscores.
    matches: (oldValue, newValue) =>
      /\[[^\]]* [^\]]*\]/.test(oldValue) &&
      oldValue.replace(/\s+/g, '_').replace(/_{2,}/g, '_') === newValue,
    reason: 'D3: arbitrary values are underscore-encoded so the class name is usable'
  },
  {
    // We now drop the declaration; the original wrapped a non-dimension in an
    // arbitrary value.
    matches: (oldValue, newValue) => {
      if (newValue !== '') return false
      const classes = oldValue.split(' ').filter(Boolean)
      if (classes.length === 0) return false
      return classes.every(className => {
        const value = arbitraryValueOf(className)
        return value !== null && !isUnit(value)
      })
    },
    reason: 'D1: value rejected by the real isUnit'
  }
]

const loadOriginal = async (): Promise<OriginalTranslator | null> => {
  try {
    const mod = (await import('css-to-tailwind-translator')) as {
      CssToTailwindTranslator: OriginalTranslator
    }
    return mod.CssToTailwindTranslator
  } catch {
    return null
  }
}

interface Counters {
  compared: number
  identical: number
  explained: number
  unexplained: number
}

const compare = (
  label: string,
  oldValue: string,
  newValue: string,
  counters: Counters
): void => {
  counters.compared++
  const oldClasses = oldValue.split(' ').filter(Boolean)
  const newClasses = newValue.split(' ').filter(Boolean)
  if (oldClasses.join(' ') === newClasses.join(' ')) {
    counters.identical++
    return
  }

  const valueRule = VALUE_LEVEL_RULES.find(rule => rule.matches(oldValue, newValue))
  if (valueRule) {
    counters.explained++
    return
  }

  const onlyOneSide = [
    ...oldClasses.filter(c => !newClasses.includes(c)),
    ...newClasses.filter(c => !oldClasses.includes(c))
  ]

  const reasons = onlyOneSide.map(className => [className, explain(className)] as const)
  const unexplained = reasons.filter(([, reason]) => reason === null)

  if (unexplained.length === 0) {
    counters.explained++
    return
  }

  counters.unexplained++
  console.log(`\n${label}`)
  console.log(`  original: ${oldValue || '(none)'}`)
  console.log(`  ours:     ${newValue || '(none)'}`)
  for (const [className] of unexplained) {
    console.log(`  !!   ${className} — unexplained`)
  }
}

const main = async (): Promise<void> => {
  const original = await loadOriginal()
  if (!original) {
    console.error(
      'css-to-tailwind-translator is not installed.\n' +
        'Run: pnpm add -D css-to-tailwind-translator@1.2.8'
    )
    process.exitCode = 1
    return
  }

  const counters: Counters = { compared: 0, identical: 0, explained: 0, unexplained: 0 }

  const single = (translate: OriginalTranslator | typeof ours, css: string): string =>
    translate(css).data[0]?.resultVal ?? ''

  for (const [property, value] of DECLARATIONS) {
    const css = `.x { ${property}: ${value} }`
    compare(`${property}: ${value}`, single(original, css), single(ours, css), counters)
  }

  for (const { name, css } of STYLESHEETS) {
    const before = original(css)
    const after = ours(css)
    const beforeMap = new Map(before.data.map(d => [d.selectorName, d.resultVal]))
    const afterMap = new Map(after.data.map(d => [d.selectorName, d.resultVal]))

    for (const selector of new Set([...beforeMap.keys(), ...afterMap.keys()])) {
      compare(
        `${name} :: ${selector}`,
        beforeMap.get(selector) ?? '',
        afterMap.get(selector) ?? '',
        counters
      )
    }
  }

  console.log(
    `\ncompared ${counters.compared}  identical ${counters.identical}  ` +
      `explained ${counters.explained}  unexplained ${counters.unexplained}`
  )

  if (counters.unexplained > 0) {
    console.error(`\n${counters.unexplained} unexplained difference(s).`)
    process.exitCode = 1
  } else {
    console.log('All differences are accounted for.')
  }
}

void main()
