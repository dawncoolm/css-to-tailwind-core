/**
 * Byte-for-byte parity with every example in the original package's README.
 *
 * These pin the default (`tailwindVersion: 3`) output, so a change that would
 * break a caller migrating from `css-to-tailwind-translator` fails here first.
 */

import { describe, expect, it } from 'vitest'

import { CssToTailwindTranslator } from '../../src/index.js'

describe('README parity', () => {
  it('converts the basic usage example', () => {
    const result = CssToTailwindTranslator(`body {
  width: 100%;
  height: 50%;
  margin: 0 !important;
  background-color: transparent;
}`)

    expect(result).toEqual({
      code: 'OK',
      data: [{ selectorName: 'body', resultVal: 'w-full h-1/2 !m-0 bg-transparent' }],
      diagnostics: []
    })
  })

  it('applies a custom media breakpoint', () => {
    const result = CssToTailwindTranslator(
      `@media (min-width: 1800px) {
  .my-media {
    display: flex;
    align-items: center;
  }
}`,
      { customTheme: { media: { '@media (min-width: 1800px)': '3xl' } } }
    )

    expect(result.data).toEqual([
      {
        selectorName: '@media (min-width: 1800px)-->.my-media',
        resultVal: '3xl:flex 3xl:items-center'
      }
    ])
  })

  it('applies custom filter and transform sub-values', () => {
    const result = CssToTailwindTranslator(
      `.my-style {
  transform: rotate(99deg);
  backdrop-filter: blur(99999px);
}`,
      {
        customTheme: {
          'backdrop-blur': { '99999px': 'super-big' },
          rotate: { '99deg': 'crooked' }
        }
      }
    )

    // The README shows a leading `transform` marker class, but
    // css-to-tailwind-translator@1.2.8 does not emit one: every Tailwind v3
    // transform utility already writes the `transform` property itself. This
    // pins the behaviour of the published package, not of its stale README.
    expect(result.data).toEqual([
      {
        selectorName: '.my-style',
        resultVal: 'rotate-crooked backdrop-filter backdrop-blur-super-big'
      }
    ])
  })

  it('applies custom property value aliases', () => {
    const result = CssToTailwindTranslator(
      `.my-style {
  box-shadow: 10px 10px 5px #888888;
  width: 288px;
}`,
      {
        customTheme: {
          width: { '288px': 'w-custom' },
          'box-shadow': { '10px 10px 5px #888888': 'box-shadow-custom' }
        }
      }
    )

    expect(result.data).toEqual([
      { selectorName: '.my-style', resultVal: 'box-shadow-custom w-custom' }
    ])
  })

  it('maps the default breakpoints without a custom theme', () => {
    const result = CssToTailwindTranslator(
      '@media (min-width: 640px) { .a { display: flex } }'
    )
    expect(result.data).toEqual([
      { selectorName: '@media (min-width: 640px)-->.a', resultVal: 'sm:flex' }
    ])
  })

  it('honours the prefix option', () => {
    const result = CssToTailwindTranslator('.a { display: flex; margin-top: -1rem }', {
      prefix: 'tw-'
    })
    expect(result.data[0]?.resultVal).toBe('tw-flex -tw-mt-4')
  })

  it('emits arbitrary values when useAllDefaultValues is off', () => {
    const result = CssToTailwindTranslator('.a { padding: 1rem }', {
      useAllDefaultValues: false
    })
    expect(result.data[0]?.resultVal).toBe('p-[1rem]')
  })

  it('still applies customTheme when useAllDefaultValues is off', () => {
    const result = CssToTailwindTranslator('.a { width: 288px }', {
      useAllDefaultValues: false,
      customTheme: { width: { '288px': 'w-custom' } }
    })
    expect(result.data[0]?.resultVal).toBe('w-custom')
  })
})
