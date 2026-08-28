import { describe, expect, it } from 'vitest'

import { CssToTailwindTranslator } from '../src/index.js'

describe('diagnostics', () => {
  it('is empty for a clean conversion', () => {
    expect(CssToTailwindTranslator('.a { display: flex }').diagnostics).toEqual([])
  })

  it('reports an unknown property with its location', () => {
    const result = CssToTailwindTranslator('.a { not-a-prop: 1 }')
    const diagnostic = result.diagnostics[0]
    expect(diagnostic).toMatchObject({
      level: 'warning',
      code: 'unknown-property',
      property: 'not-a-prop',
      value: '1',
      selector: '.a'
    })
    expect(typeof diagnostic?.start).toBe('number')
    expect(typeof diagnostic?.end).toBe('number')
  })

  it('distinguishes an unsupported value from an unknown property', () => {
    const result = CssToTailwindTranslator('.a { display: does-not-exist }')
    expect(result.diagnostics[0]?.code).toBe('unsupported-value')
  })

  it('reports each unsupported at-rule once', () => {
    const result = CssToTailwindTranslator(
      '@charset "utf-8"; @import url(a.css); .a { display: flex }'
    )
    const atRuleDiagnostics = result.diagnostics.filter(d => d.code === 'unsupported-at-rule')
    expect(atRuleDiagnostics).toHaveLength(2)
    expect(result.code).toBe('SyntaxError')
  })

  it('reports a malformed declaration', () => {
    const result = CssToTailwindTranslator('.a { display flex; color: red }')
    expect(result.diagnostics.map(d => d.code)).toContain('malformed-declaration')
    expect(result.data[0]?.resultVal).toBe('text-[red]')
  })

  it('reports an unterminated block but still converts what it read', () => {
    const result = CssToTailwindTranslator('.a { display: flex')
    expect(result.data[0]?.resultVal).toBe('flex')
    expect(result.diagnostics.map(d => d.code)).toContain('unexpected-eof')
  })

  it('keeps code OK when only declarations failed', () => {
    const result = CssToTailwindTranslator('.a { not-a-prop: 1 }')
    expect(result.code).toBe('OK')
  })
})
