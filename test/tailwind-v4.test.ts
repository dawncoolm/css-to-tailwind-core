/**
 * Tailwind v4 output.
 *
 * v4 is opt-in (`tailwindVersion: 4`) so the default output stays compatible with
 * `css-to-tailwind-translator`. These tests pin the renames that differ from v3.
 */

import { describe, expect, it } from 'vitest'

import { CssToTailwindTranslator } from '../src/index.js'

const v4 = (css: string): string =>
  CssToTailwindTranslator(css, { tailwindVersion: 4 }).data[0]?.resultVal ?? ''

const v3 = (css: string): string =>
  CssToTailwindTranslator(css).data[0]?.resultVal ?? ''

describe('tailwindVersion: 4', () => {
  it('renames flex-grow and flex-shrink', () => {
    expect(v3('.a { flex-grow: 1 }')).toBe('flex-grow')
    expect(v4('.a { flex-grow: 1 }')).toBe('grow')
    expect(v3('.a { flex-shrink: 0 }')).toBe('flex-shrink-0')
    expect(v4('.a { flex-shrink: 0 }')).toBe('shrink-0')
  })

  it('shifts the border radius scale down one step', () => {
    expect(v3('.a { border-radius: 0.125rem }')).toBe('rounded-sm')
    expect(v4('.a { border-radius: 0.125rem }')).toBe('rounded-xs')
    expect(v3('.a { border-radius: 0.25rem }')).toBe('rounded')
    expect(v4('.a { border-radius: 0.25rem }')).toBe('rounded-sm')
  })

  it('shifts the shadow scale down one step', () => {
    expect(v3('.a { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) }')).toBe('shadow-sm')
    expect(v4('.a { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) }')).toBe('shadow-xs')
  })

  it('shifts the blur scale down one step', () => {
    expect(v3('.a { filter: blur(4px) }')).toBe('filter blur-sm')
    expect(v4('.a { filter: blur(4px) }')).toBe('blur-xs')
  })

  it('drops the bare filter and backdrop-filter marker classes', () => {
    expect(v3('.a { filter: grayscale(1) }')).toBe('filter grayscale')
    expect(v4('.a { filter: grayscale(1) }')).toBe('grayscale')
    expect(v3('.a { backdrop-filter: invert(1) }')).toBe('backdrop-filter backdrop-invert')
    expect(v4('.a { backdrop-filter: invert(1) }')).toBe('backdrop-invert')
  })

  it('emits no marker class for transform in either version', () => {
    expect(v3('.a { transform: rotate(45deg) }')).toBe('rotate-45')
    expect(v4('.a { transform: rotate(45deg) }')).toBe('rotate-45')
  })

  it('renames outline: none', () => {
    expect(v3('.a { outline-style: none }')).toBe('outline-none')
    expect(v4('.a { outline-style: none }')).toBe('outline-hidden')
  })

  it('moves the important marker to the end', () => {
    expect(v3('.a { display: flex !important }')).toBe('!flex')
    expect(v4('.a { display: flex !important }')).toBe('flex!')
  })

  it('marks an arbitrary property important without !important inside brackets', () => {
    expect(v3('.a { caption-side: top !important }')).toBe('[caption-side:top!important]')
    expect(v4('.a { caption-side: top !important }')).toBe('[caption-side:top]!')
  })
})
