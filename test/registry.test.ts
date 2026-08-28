/**
 * The registry must cover exactly the property set the original package
 * supported, with no property claimed by two handler groups.
 */

import { describe, expect, it } from 'vitest'

import { registry } from '../src/convert/handlers/index.js'

/** Every key of `propertyMap` in css-to-tailwind-translator@1.2.8, in source order. */
const ORIGINAL_PROPERTIES = [
  'align-content', 'align-items', 'align-self', 'all', 'animation',
  'animation-delay', 'animation-direction', 'animation-duration',
  'animation-fill-mode', 'animation-iteration-count', 'animation-name',
  'animation-play-state', 'animation-timing-function', 'appearance',
  'aspect-ratio', 'backdrop-filter', 'backface-visibility', 'background',
  'background-attachment', 'background-blend-mode', 'background-clip',
  'background-color', 'background-image', 'background-origin',
  'background-position', 'background-repeat', 'background-size', 'border',
  'border-bottom', 'border-bottom-color', 'border-bottom-left-radius',
  'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width',
  'border-collapse', 'border-color', 'border-image', 'border-image-outset',
  'border-image-repeat', 'border-image-slice', 'border-image-source',
  'border-image-width', 'border-left', 'border-left-color', 'border-left-style',
  'border-left-width', 'border-radius', 'border-right', 'border-right-color',
  'border-right-style', 'border-right-width', 'border-spacing', 'border-style',
  'border-top', 'border-top-color', 'border-top-left-radius',
  'border-top-right-radius', 'border-top-style', 'border-top-width',
  'border-width', 'bottom', 'box-align', 'box-decoration-break', 'box-direction',
  'box-flex', 'box-flex-group', 'box-lines', 'box-ordinal-group', 'box-orient',
  'box-pack', 'box-shadow', 'box-sizing', 'caption-side', 'clear', 'clip',
  'clip-path', 'color', 'color-scheme', 'column-count', 'column-fill',
  'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style',
  'column-rule-width', 'column-span', 'column-width', 'columns',
  'contain-intrinsic-size', 'content', 'content-visibility', 'counter-increment',
  'counter-reset', 'counter-set', 'cursor', 'direction', 'display',
  'empty-cells', 'fill', 'filter', 'flex', 'flex-basis', 'flex-direction',
  'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'font',
  'font-family', 'font-size', 'font-size-adjust', '-webkit-font-smoothing',
  '-moz-osx-font-smoothing', 'font-stretch', 'font-style', 'font-variant',
  'font-variant-numeric', 'font-variation-settings', 'font-weight', 'gap',
  'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows',
  'grid-column', 'grid-column-end', 'grid-column-gap', 'grid-column-start',
  'grid-gap', 'grid-row', 'grid-row-end', 'grid-row-gap', 'grid-row-start',
  'grid-rows', 'grid-template', 'grid-template-areas', 'grid-template-columns',
  'grid-template-rows', 'hanging-punctuation', 'height', 'icon',
  'image-orientation', 'justify-content', 'justify-items', 'justify-self',
  'left', 'letter-spacing', 'line-height', 'list-style', 'list-style-image',
  'list-style-position', 'list-style-type', 'logical-height', 'logical-width',
  'isolation', 'margin', 'margin-bottom', 'margin-left', 'margin-right',
  'margin-top', 'mask', 'mask-clip', 'mask-composite', 'mask-image',
  'mask-origin', 'mask-position', 'mask-repeat', 'mask-size', 'max-height',
  'max-width', 'min-height', 'min-width', 'mix-blend-mode', 'nav-down',
  'nav-index', 'nav-left', 'nav-right', 'nav-up', 'object-fit',
  'object-position', 'opacity', 'order', 'outline', 'outline-color',
  'outline-offset', 'outline-style', 'outline-width', 'overflow',
  'overflow-anchor', 'overflow-wrap', 'overflow-x', 'overflow-y',
  'overscroll-behavior', 'overscroll-behavior-x', 'overscroll-behavior-y',
  'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
  'page-break-after', 'page-break-before', 'page-break-inside', 'perspective',
  'perspective-origin', 'place-content', 'place-items', 'place-self',
  'pointer-events', 'position', 'punctuation-trim', 'quotes', 'resize', 'right',
  'rotate', 'row-gap', 'scroll-snap-align', 'scroll-snap-stop',
  'scroll-snap-type', 'scrollbar-width', 'shape-image-threshold', 'shape-margin',
  'shape-outside', 'stroke', 'stroke-width', 'tab-size', 'table-layout',
  'target', 'target-name', 'target-new', 'target-position', 'text-align',
  'text-align-last', 'text-decoration', 'text-decoration-color',
  'text-decoration-line', 'text-decoration-skip-ink', 'text-decoration-style',
  'text-emphasis-color', 'text-emphasis-position', 'text-emphasis-style',
  'text-indent', 'text-justify', 'text-orientation', 'text-outline',
  'text-overflow', 'text-shadow', 'text-transform', 'text-underline-offset',
  'text-underline-position', 'text-wrap', 'top', 'transform', 'transform-origin',
  'transform-style', 'transition', 'transition-delay', 'transition-duration',
  'transition-property', 'transition-timing-function', 'unicode-bidi',
  'user-select', 'vertical-align', 'visibility', 'white-space', 'width',
  'word-break', 'word-spacing', 'word-wrap', 'writing-mode', 'z-index'
] as const

describe('property registry', () => {
  it('covers every property the original package supported', () => {
    const missing = ORIGINAL_PROPERTIES.filter(property => !registry.has(property))
    expect(missing).toEqual([])
  })

  it('adds nothing the original did not have', () => {
    const known = new Set<string>(ORIGINAL_PROPERTIES)
    const extra = [...registry.keys()].filter(property => !known.has(property))
    expect(extra).toEqual([])
  })

  it('has exactly 273 properties', () => {
    expect(registry.size).toBe(273)
  })

  it('holds only tables and functions', () => {
    for (const [property, handler] of registry) {
      const kind = typeof handler
      expect(kind === 'function' || kind === 'object', `${property} is a ${kind}`).toBe(true)
    }
  })
})
