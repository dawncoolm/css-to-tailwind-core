import { describe, expect, it } from 'vitest'

import { createContext } from '../src/convert/context.js'
import { normalizeAtRulePrelude, resolveAtRule } from '../src/selector/media.js'
import { parseSelector } from '../src/selector/variants.js'
import { parse, type AtRule } from '../src/parser/parse.js'

const variantsOf = (selector: string): string[] => parseSelector(selector).variants

describe('parseSelector', () => {
  it('maps the five variants the original package supported', () => {
    expect(variantsOf('.a:hover')).toEqual(['hover'])
    expect(variantsOf('.a:focus')).toEqual(['focus'])
    expect(variantsOf('.a:active')).toEqual(['active'])
    expect(variantsOf('.a::before')).toEqual(['before'])
    expect(variantsOf('.a::after')).toEqual(['after'])
  })

  it('maps the variants the original package silently dropped', () => {
    expect(variantsOf('.a:disabled')).toEqual(['disabled'])
    expect(variantsOf('.a:checked')).toEqual(['checked'])
    expect(variantsOf('.a:focus-visible')).toEqual(['focus-visible'])
    expect(variantsOf('.a:first-child')).toEqual(['first'])
    expect(variantsOf('.a:last-child')).toEqual(['last'])
    expect(variantsOf('.a::placeholder')).toEqual(['placeholder'])
    expect(variantsOf('.a::file-selector-button')).toEqual(['file'])
  })

  it('composes a chain in source order', () => {
    expect(variantsOf('.a:hover::before')).toEqual(['hover', 'before'])
  })

  it('recognises a dark ancestor', () => {
    expect(variantsOf('.dark .a:hover')).toEqual(['dark', 'hover'])
    expect(parseSelector('.dark .a').base).toBe('.a')
  })

  it('maps nth-child(odd/even) to named variants', () => {
    expect(variantsOf('li:nth-child(odd)')).toEqual(['odd'])
    expect(variantsOf('li:nth-child(even)')).toEqual(['even'])
  })

  it('falls back to an arbitrary variant for anything unnamed', () => {
    expect(variantsOf('li:nth-child(3n + 1)')).toEqual(['[&:nth-child(3n+1)]'])
    expect(variantsOf('.a:not(.b)')).toEqual(['[&:not(.b)]'])
  })

  it('turns a trailing attribute selector into an arbitrary variant', () => {
    expect(variantsOf('.a[data-open]')).toEqual(['[&[data-open]]'])
  })

  it('leaves a bare attribute selector alone', () => {
    expect(variantsOf('[hidden]')).toEqual([])
    expect(parseSelector('[hidden]').base).toBe('[hidden]')
  })

  it('leaves a plain selector alone', () => {
    expect(variantsOf('.a .b > .c')).toEqual([])
  })
})

describe('normalizeAtRulePrelude', () => {
  it('matches the shape the original package used for customTheme.media keys', () => {
    expect(normalizeAtRulePrelude('@media (min-width: 640px)')).toBe('@media(min-width:640px)')
    expect(normalizeAtRulePrelude('@media not all and (min-width: 640px)')).toBe(
      '@media_not_all_and(min-width:640px)'
    )
  })
})

const firstAtRule = (css: string): AtRule => parse(css).nodes[0] as AtRule

describe('resolveAtRule', () => {
  it('maps the default breakpoints', () => {
    const ctx = createContext()
    expect(resolveAtRule(firstAtRule('@media (min-width: 640px) { a { color: red } }'), ctx))
      .toMatchObject({ kind: 'variant', variant: 'sm' })
    expect(resolveAtRule(firstAtRule('@media (min-width: 1536px) { a { color: red } }'), ctx))
      .toMatchObject({ kind: 'variant', variant: '2xl' })
  })

  it('maps max-width breakpoints', () => {
    const ctx = createContext()
    expect(
      resolveAtRule(
        firstAtRule('@media not all and (min-width: 768px) { a { color: red } }'),
        ctx
      )
    ).toMatchObject({ kind: 'variant', variant: 'max-md' })
  })

  it('falls back to an arbitrary variant', () => {
    const ctx = createContext()
    expect(resolveAtRule(firstAtRule('@media (min-width: 900px) { a { color: red } }'), ctx))
      .toMatchObject({ kind: 'variant', variant: '[@media(min-width:900px)]' })
  })

  it('honours customTheme.media', () => {
    const ctx = createContext({ customTheme: { media: { '@media (min-width: 1800px)': '3xl' } } })
    expect(resolveAtRule(firstAtRule('@media (min-width: 1800px) { a { color: red } }'), ctx))
      .toMatchObject({ kind: 'variant', variant: '3xl' })
  })

  it('turns @supports into a supports variant', () => {
    const ctx = createContext()
    expect(resolveAtRule(firstAtRule('@supports (display: grid) { a { color: red } }'), ctx))
      .toMatchObject({ kind: 'variant', variant: 'supports-[display:_grid]' })
  })

  it('treats @layer as transparent', () => {
    const ctx = createContext()
    expect(resolveAtRule(firstAtRule('@layer base { a { color: red } }'), ctx)).toEqual({
      kind: 'transparent'
    })
  })

  it('flags unsupported at-rules', () => {
    const ctx = createContext()
    expect(resolveAtRule(firstAtRule('@keyframes spin { from { opacity: 0 } }'), ctx))
      .toEqual({ kind: 'unsupported' })
  })
})
