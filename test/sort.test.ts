/**
 * Class ordering.
 *
 * The reference is `prettier-plugin-tailwindcss`: utilities in the order their
 * plugin appears in Tailwind's `corePlugins` list, unrecognised classes ahead of
 * everything, arbitrary properties behind it.
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { CssToTailwindTranslator, sortClassNames } from '../src/index.js'
import { V3_PRESET } from '../src/theme/v3.js'
import { V4_PRESET } from '../src/theme/v4.js'

describe('sortClassNames', () => {
  it('puts a typical class list in the recommended order', () => {
    expect(
      sortClassNames([
        'text-[#1a1a1a]',
        'flex',
        'p-4',
        'items-center',
        'rounded-lg',
        'w-full',
        'text-sm',
        'shadow-sm',
        'gap-2',
        'flex-col'
      ])
    ).toEqual([
      'flex',
      'w-full',
      'flex-col',
      'items-center',
      'gap-2',
      'rounded-lg',
      'p-4',
      'text-sm',
      'text-[#1a1a1a]',
      'shadow-sm'
    ])
  })

  it('leads with unrecognised classes and trails with arbitrary properties', () => {
    expect(
      sortClassNames(['[caption-side:top]', 'p-4', 'zzz-one', '[text-outline:red]', 'flex', 'zzz-two'])
    ).toEqual(['zzz-one', 'zzz-two', 'flex', 'p-4', '[caption-side:top]', '[text-outline:red]'])
  })

  it('keeps the input order within one rank', () => {
    // Both are background utilities, so nothing but the input decides.
    expect(sortClassNames(['bg-cover', 'bg-red-500'])).toEqual(['bg-cover', 'bg-red-500'])
    expect(sortClassNames(['bg-red-500', 'bg-cover'])).toEqual(['bg-red-500', 'bg-cover'])
  })

  it('splits the ambiguous text- and font- families by value shape', () => {
    // Font size sorts before line height, text colour after it.
    expect(sortClassNames(['text-[#fff]', 'leading-6', 'text-[14px]'])).toEqual([
      'text-[14px]',
      'leading-6',
      'text-[#fff]'
    ])
    // Font family sorts before font weight.
    expect(sortClassNames(['font-[600]', "font-['Inter']"])).toEqual([
      "font-['Inter']",
      'font-[600]'
    ])
  })

  it('splits border widths from border colours by value shape', () => {
    expect(sortClassNames(['border-[#eee]', 'bg-white', 'border-[1px]'])).toEqual([
      'border-[1px]',
      'border-[#eee]',
      'bg-white'
    ])
    expect(sortClassNames(['border-b-[#eee]', 'border-b-[0.5px]'])).toEqual([
      'border-b-[0.5px]',
      'border-b-[#eee]'
    ])
  })

  it('ranks a v4 rename alongside its v3 spelling', () => {
    expect(sortClassNames(['p-4', 'grow', 'flex'])).toEqual(['flex', 'grow', 'p-4'])
    expect(sortClassNames(['p-4', 'flex-grow', 'flex'])).toEqual(['flex', 'flex-grow', 'p-4'])
    expect(sortClassNames(['leading-6', 'text-ellipsis', 'p-4'])).toEqual([
      'text-ellipsis',
      'p-4',
      'leading-6'
    ])
    expect(sortClassNames(['leading-6', 'overflow-ellipsis', 'p-4'])).toEqual([
      'overflow-ellipsis',
      'p-4',
      'leading-6'
    ])
  })

  it('groups variants into blocks, unprefixed first and then by first appearance', () => {
    expect(sortClassNames(['sm:p-8', 'hover:p-2', 'p-4', 'hover:flex', 'flex'])).toEqual([
      'flex',
      'p-4',
      'sm:p-8',
      'hover:flex',
      'hover:p-2'
    ])

    // Same classes, `hover:` seen first, so its block leads.
    expect(sortClassNames(['hover:p-2', 'sm:p-8', 'p-4', 'hover:flex', 'flex'])).toEqual([
      'flex',
      'p-4',
      'hover:flex',
      'hover:p-2',
      'sm:p-8'
    ])
  })

  it('sees through the important marker in both positions', () => {
    expect(sortClassNames(['!p-4', '!flex'])).toEqual(['!flex', '!p-4'])
    expect(sortClassNames(['p-4!', 'flex!'])).toEqual(['flex!', 'p-4!'])
  })

  it('sees through a configured prefix and a leading minus sign', () => {
    expect(sortClassNames(['tw-p-4', 'tw-flex', '-tw-mt-4'], { prefix: 'tw-' })).toEqual([
      '-tw-mt-4',
      'tw-flex',
      'tw-p-4'
    ])
  })

  it('does not mutate its input', () => {
    const input = ['p-4', 'flex']
    sortClassNames(input)
    expect(input).toEqual(['p-4', 'flex'])
  })
})

describe('sortClasses config', () => {
  const css = '.a { padding: 1rem; display: flex; color: #fff }'

  it('is off by default', () => {
    expect(CssToTailwindTranslator(css).data[0]?.resultVal).toBe('p-4 flex text-[#fff]')
  })

  it('reorders the whole rule when turned on', () => {
    expect(CssToTailwindTranslator(css, { sortClasses: true }).data[0]?.resultVal).toBe(
      'flex p-4 text-[#fff]'
    )
  })

  it('strips the configured prefix before ranking', () => {
    expect(
      CssToTailwindTranslator(css, { sortClasses: true, prefix: 'tw-' }).data[0]?.resultVal
    ).toBe('tw-flex tw-p-4 tw-text-[#fff]')
  })
})

/*
 * A gap in the order table is silent: the class just sorts to the front as if it
 * were somebody's custom class. This walks every declaration the parity corpus
 * covers, in both target versions, and fails if anything the translator emits
 * lands in the unrecognised bucket.
 */
describe('order table coverage', () => {
  const corpus = JSON.parse(
    readFileSync(new URL('./fixtures/declaration-corpus.json', import.meta.url), 'utf8')
  ) as [string, string][]

  const emitted = new Set<string>()
  for (const version of [3, 4] as const) {
    for (const [property, value] of corpus) {
      const result = CssToTailwindTranslator(`.a{${property}:${value}}`, {
        tailwindVersion: version
      })
      for (const className of (result.data[0]?.resultVal ?? '').split(' ')) {
        if (className !== '') emitted.add(className)
      }
    }
  }

  it('covers the corpus', () => {
    expect(emitted.size).toBeGreaterThan(500)
  })

  /*
   * A rename is a four-place edit: the `utilities` interface, both presets, and
   * the order table. The corpus cannot police the fourth — it holds no
   * `text-overflow` or `box-decoration-break` declaration — so the presets do.
   */
  it('ranks both spellings of every renamed utility identically', () => {
    for (const key of Object.keys(V3_PRESET.utilities) as (keyof typeof V3_PRESET.utilities)[]) {
      const v3 = V3_PRESET.utilities[key]
      const v4 = V4_PRESET.utilities[key]

      expect(sortClassNames(['container', v3]), `${key} (v3: ${v3})`).toEqual(['container', v3])
      expect(sortClassNames(['container', v4]), `${key} (v4: ${v4})`).toEqual(['container', v4])
      expect(sortClassNames([v4, 'p-4']), `${key}`).toEqual(sortClassNames([v3, 'p-4']).map(
        className => (className === v3 ? v4 : className)
      ))
    }
  })

  it('recognises every class the translator emits', () => {
    // `container` is the first rank, so anything that still sorts ahead of it is
    // in the unrecognised bucket.
    const unrecognised = [...emitted].filter(
      className => sortClassNames(['container', className])[0] !== 'container'
    )

    expect(unrecognised).toEqual([])
  })
})
