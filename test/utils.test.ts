import { describe, expect, it } from 'vitest'

import { isColor, isColorKeyword, isGradient } from '../src/utils/color.js'
import { isAngle, isLength, isNumber, isPercentage, isTime, isUnit } from '../src/utils/unit.js'
import {
  compactBrackets,
  hasNegative,
  splitFirst,
  splitTopLevel,
  splitTopLevelWhitespace,
  toArbitrary,
  unquote
} from '../src/utils/value.js'

describe('isColor', () => {
  it.each([
    '#fff',
    '#ffff',
    '#ffffff',
    '#ffffffff',
    'rgb(1,2,3)',
    'rgb(1 2 3)',
    'rgb(1 2 3 / 50%)',
    'rgba(1,2,3,.5)',
    'hsl(120, 50%, 50%)',
    'hsl(120deg 50% 50% / .5)',
    'hwb(120 30% 40%)',
    'lab(50% 40 59.5)',
    'lch(52.2% 72.2 50)',
    'oklab(59% 0.1 0.1)',
    'oklch(59.69% 0.156 49.77)',
    'color(display-p3 1 0 0)',
    'color-mix(in srgb, red 50%, blue)',
    'rebeccapurple',
    'transparent',
    'currentColor'
  ])('accepts %s', value => {
    expect(isColor(value)).toBe(true)
  })

  it.each(['#ff', '#fffff', 'notacolor', 'rgb(1,2,3', '12px', ''])('rejects %s', value => {
    expect(isColor(value)).toBe(false)
  })

  it('accepts gradients only when asked', () => {
    expect(isColor('linear-gradient(red, blue)')).toBe(false)
    expect(isColor('linear-gradient(red, blue)', true)).toBe(true)
    expect(isGradient('radial-gradient(red, blue)')).toBe(true)
  })

  it('recognises bare colour keywords', () => {
    expect(isColorKeyword('currentcolor')).toBe(true)
    expect(isColorKeyword('#fff')).toBe(false)
  })
})

describe('isUnit', () => {
  it.each([
    '0',
    '1.5',
    '-2',
    '.5',
    '12px',
    '1.5rem',
    '50%',
    '100vh',
    '45deg',
    '150ms',
    '1fr',
    'auto',
    'min-content',
    'var(--gap)',
    'calc(100% - 1rem)',
    'clamp(1rem, 2vw, 3rem)',
    'env(safe-area-inset-top)'
  ])('accepts %s', value => {
    expect(isUnit(value)).toBe(true)
  })

  it.each(['potato', 'solid', 'red', '', '12 px', 'calc(100%'])('rejects %s', value => {
    expect(isUnit(value)).toBe(false)
  })

  it('is a real predicate, unlike the original always-true implementation', () => {
    expect(isUnit('anything at all')).toBe(false)
  })
})

describe('unit sub-predicates', () => {
  it('separates lengths from angles and durations', () => {
    expect(isLength('10px')).toBe(true)
    expect(isLength('10deg')).toBe(false)
    expect(isAngle('10deg')).toBe(true)
    expect(isAngle('10px')).toBe(false)
    expect(isTime('.3s')).toBe(true)
    expect(isTime('300px')).toBe(false)
  })

  it('only allows a unitless zero as a length', () => {
    expect(isLength('0')).toBe(true)
    expect(isLength('10')).toBe(false)
  })

  it('classifies numbers and percentages', () => {
    expect(isNumber('1e3')).toBe(true)
    expect(isNumber('1px')).toBe(false)
    expect(isPercentage('50%')).toBe(true)
    expect(isPercentage('50')).toBe(false)
  })
})

describe('value helpers', () => {
  it('extracts a leading minus sign', () => {
    expect(hasNegative('-4px')).toEqual(['-', '4px'])
    expect(hasNegative('4px')).toEqual(['', '4px'])
  })

  it('collapses whitespace runs into a single underscore', () => {
    expect(toArbitrary('1px  solid   red')).toBe('1px_solid_red')
    expect(toArbitrary('a \n b')).toBe('a_b')
    expect(toArbitrary('a _ b')).toBe('a_b')
  })

  it('splits only at the top level', () => {
    expect(splitTopLevel('a,b(c,d),e', ',')).toEqual(['a', 'b(c,d)', 'e'])
    expect(splitTopLevel('a,"b,c"', ',')).toEqual(['a', '"b,c"'])
  })

  it('splits at the first top level separator only', () => {
    expect(splitFirst('a:b:c', ':')).toEqual(['a', 'b:c'])
    expect(splitFirst('a:"b:c"', ':')).toEqual(['a', '"b:c"'])
    expect(splitFirst('url(a:b)', ':')).toBeNull()
    expect(splitFirst('no-separator', ':')).toBeNull()
  })

  it('splits on whitespace outside brackets', () => {
    expect(splitTopLevelWhitespace('1px solid rgba(0, 0, 0, .5)')).toEqual([
      '1px',
      'solid',
      'rgba(0, 0, 0, .5)'
    ])
  })

  it('compacts whitespace inside brackets', () => {
    expect(compactBrackets('1px solid rgba(0, 0, 0, .5)')).toBe('1px solid rgba(0,0,0,.5)')
  })

  it('unquotes fully quoted values', () => {
    expect(unquote('"abc"')).toBe('abc')
    expect(unquote("'abc'")).toBe('abc')
    expect(unquote('abc')).toBe('abc')
  })
})
