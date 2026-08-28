/**
 * One test per defect carried by `css-to-tailwind-translator@1.2.8`.
 *
 * Each `describe` title names the defect id used in the project README so a
 * failure points straight at the behaviour it is meant to protect.
 */

import { describe, expect, it } from 'vitest'

import { CssToTailwindTranslator } from '../src/index.js'

const classesFor = (css: string, config = {}): string =>
  CssToTailwindTranslator(css, config).data[0]?.resultVal ?? ''

describe('D1 — isUnit was always true', () => {
  it('rejects a value that is not a dimension instead of emitting h-[potato]', () => {
    const result = CssToTailwindTranslator('.a { height: potato }')
    expect(result.data[0]?.resultVal).toBe('')
    expect(result.diagnostics[0]).toMatchObject({
      code: 'unsupported-value',
      property: 'height',
      value: 'potato'
    })
  })

  it('still accepts every real dimension form', () => {
    // Spaces become underscores: the original emitted `h-[calc(100% - 1rem)]`,
    // which is not a usable class name because Tailwind splits on whitespace.
    expect(classesFor('.a { height: calc(100% - 1rem) }')).toBe('h-[calc(100%_-_1rem)]')
    expect(classesFor('.a { height: var(--h) }')).toBe('h-[var(--h)]')
  })
})

describe('D2 — module level config leaked between calls', () => {
  it('does not let one call change the next call default resolution', () => {
    const withDefaults = classesFor('.a { padding: 1rem }')
    classesFor('.a { padding: 1rem }', { useAllDefaultValues: false })
    expect(classesFor('.a { padding: 1rem }')).toBe(withDefaults)
    expect(withDefaults).toBe('p-4')
  })

  it('keeps two custom themes independent', () => {
    const a = classesFor('.a { width: 288px }', { customTheme: { width: { '288px': 'w-a' } } })
    const b = classesFor('.a { width: 288px }', { customTheme: { width: { '288px': 'w-b' } } })
    expect([a, b]).toEqual(['w-a', 'w-b'])
  })
})

describe('D3 — the parser could not see past comments, strings or url()', () => {
  it('ignores comments', () => {
    expect(classesFor('.a { /* hi */ display: flex; /* bye */ }')).toBe('flex')
  })

  it('keeps a data URI intact', () => {
    const result = CssToTailwindTranslator(
      '.a { background-image: url(data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=) }'
    )
    expect(result.data[0]?.resultVal).toBe(
      'bg-[url(data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)]'
    )
  })

  it('keeps braces inside a string out of the block structure', () => {
    const result = CssToTailwindTranslator('.a { content: "}" ; display: flex }')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.resultVal).toContain('flex')
  })
})

describe('D4 — one bad at-rule discarded the whole sheet (issue #17)', () => {
  it('keeps converting after @import', () => {
    const result = CssToTailwindTranslator('@import url(a.css); .a { display: flex }')
    expect(result.code).toBe('SyntaxError')
    expect(result.data).toEqual([{ selectorName: '.a', resultVal: 'flex' }])
    expect(result.diagnostics.map(d => d.code)).toContain('unsupported-at-rule')
  })

  it('keeps converting around @keyframes', () => {
    const result = CssToTailwindTranslator(
      '@keyframes spin { to { transform: rotate(360deg) } } .a { display: flex }'
    )
    expect(result.data).toEqual([{ selectorName: '.a', resultVal: 'flex' }])
  })
})

describe('D5 — modern colour syntax was rejected (issue #16)', () => {
  it.each([
    ['#11223344', 'text-[#11223344]'],
    ['#1234', 'text-[#1234]'],
    ['rgb(0 0 0 / 50%)', 'text-[rgb(0_0_0_/_50%)]'],
    ['oklch(59.69% 0.156 49.77)', 'text-[oklch(59.69%_0.156_49.77)]']
  ])('accepts color: %s', (value, expected) => {
    expect(classesFor(`.a { color: ${value} }`)).toBe(expected)
  })
})

describe('D6 — font-size never used the default scale (issue #12)', () => {
  it('maps the named sizes', () => {
    expect(classesFor('.a { font-size: 0.875rem }')).toBe('text-sm')
    expect(classesFor('.a { font-size: 1rem }')).toBe('text-base')
    expect(classesFor('.a { font-size: 3rem }')).toBe('text-5xl')
  })

  it('still falls back to an arbitrary value', () => {
    expect(classesFor('.a { font-size: 13px }')).toBe('text-[13px]')
  })

  it('honours useAllDefaultValues: false', () => {
    expect(classesFor('.a { font-size: 1rem }', { useAllDefaultValues: false })).toBe(
      'text-[1rem]'
    )
  })
})

describe('D7 — box-shadow never used the default scale (issue #1)', () => {
  it('maps a default shadow', () => {
    expect(classesFor('.a { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) }')).toBe('shadow-sm')
    expect(classesFor('.a { box-shadow: 0 0 #0000 }')).toBe('shadow-none')
  })

  it('falls back to an arbitrary property for a custom shadow', () => {
    expect(classesFor('.a { box-shadow: 10px 10px 5px #888888 }')).toBe(
      '[box-shadow:10px_10px_5px_#888888]'
    )
  })
})

describe('D8 — only one level of nesting was supported (issue #13)', () => {
  it('handles @supports wrapping @media', () => {
    const result = CssToTailwindTranslator(
      '@supports (display: grid) { @media (min-width: 640px) { .a { display: grid } } }'
    )
    expect(result.data[0]?.resultVal).toBe('supports-[display:_grid]:sm:grid')
  })

  it('treats @layer as transparent', () => {
    const result = CssToTailwindTranslator('@layer components { .a { display: flex } }')
    expect(result.data).toEqual([{ selectorName: '.a', resultVal: 'flex' }])
  })
})

describe('D9 — only five pseudo variants were handled', () => {
  it.each([
    ['.a:disabled', 'disabled:flex'],
    ['.a:focus-visible', 'focus-visible:flex'],
    ['.a:first-child', 'first:flex'],
    ['.a::placeholder', 'placeholder:flex'],
    ['.a:hover::before', 'hover:before:flex']
  ])('maps %s', (selector, expected) => {
    expect(classesFor(`${selector} { display: flex }`)).toBe(expected)
  })
})

describe('D10 — unconvertible declarations vanished without a trace', () => {
  it('reports an unknown property', () => {
    const result = CssToTailwindTranslator('.a { made-up-prop: 1 }')
    expect(result.diagnostics[0]).toMatchObject({
      code: 'unknown-property',
      property: 'made-up-prop',
      selector: '.a'
    })
  })
})

describe('D11 — dedup ran on joined declarations, not classes', () => {
  it('removes a class that two declarations both produced', () => {
    const result = classesFor('.a { padding: 1rem; padding-top: 1rem }')
    expect(result.split(' ').filter(c => c === 'pt-4')).toHaveLength(1)
  })
})

describe('D15 — variants were applied to the first class only', () => {
  it('decorates every class produced by transform', () => {
    const result = classesFor('.a:hover { transform: rotate(45deg) }')
    for (const className of result.split(' ')) {
      expect(className.startsWith('hover:')).toBe(true)
    }
  })
})

describe('D16 — mixed selector lists silently shared one variant', () => {
  it('drops the variant and warns instead of guessing', () => {
    const result = CssToTailwindTranslator('.a, .b:hover { display: flex }')
    expect(result.data[0]?.resultVal).toBe('flex')
    expect(result.diagnostics[0]?.message).toContain('mixes different pseudo states')
  })

  it('keeps the variant when the list agrees', () => {
    expect(classesFor('.a:hover, .b:hover { display: flex }')).toBe('hover:flex')
  })
})

describe('D17 — box-align mapped every value to inherit or unset', () => {
  it.each([
    ['start', '[box-align:start]'],
    ['end', '[box-align:end]'],
    ['center', '[box-align:center]'],
    ['baseline', '[box-align:baseline]'],
    ['stretch', '[box-align:stretch]']
  ])('emits the real value for box-align: %s', (value, expected) => {
    expect(classesFor(`.a { box-align: ${value} }`)).toBe(expected)
  })
})

describe('D18 — outline-style: none emitted the invalid outline-[none]', () => {
  it('uses the real utility', () => {
    expect(classesFor('.a { outline-style: none }')).toBe('outline-none')
  })
})

describe('D19 — the z-index guard could never be true', () => {
  it('emits an arbitrary value outside the default scale', () => {
    expect(classesFor('.a { z-index: 999 }')).toBe('z-[999]')
    expect(classesFor('.a { z-index: 10 }')).toBe('z-10')
  })

  it('still rejects a non-numeric z-index', () => {
    expect(classesFor('.a { z-index: abc }')).toBe('')
  })
})

describe('D20 — counter-increment emitted [content-increment:…]', () => {
  it('names the property it was given', () => {
    expect(classesFor('.a { counter-increment: section }')).toBe('[counter-increment:section]')
  })
})

describe('initial and inherit', () => {
  it('are emitted as arbitrary properties, as in the original', () => {
    expect(classesFor('.a { color: inherit }')).toBe('[color:inherit]')
    expect(classesFor('.a { display: initial }')).toBe('[display:initial]')
  })
})
