import { describe, expect, it } from 'vitest'

import { parse } from '../src/parser/parse.js'
import { tokenize } from '../src/parser/tokenizer.js'
import { parseDeclaration } from '../src/parser/declarations.js'

describe('tokenize', () => {
  it('drops comments without disturbing the surrounding text', () => {
    const { tokens } = tokenize('a /* note */ b { c: d }')
    const text = tokens
      .filter(t => t.type === 'text')
      .map(t => t.value)
      .join('|')
    expect(text).toBe('a  b | c: d ')
  })

  it('keeps braces and semicolons that live inside strings', () => {
    const { tokens } = tokenize('a { content: "};" }')
    expect(tokens.filter(t => t.type === 'block-start')).toHaveLength(1)
    expect(tokens.filter(t => t.type === 'block-end')).toHaveLength(1)
    expect(tokens.filter(t => t.type === 'semicolon')).toHaveLength(0)
  })

  it('keeps semicolons that live inside parentheses', () => {
    const { tokens } = tokenize('a { background: url(data:image/png;base64,AA==) }')
    expect(tokens.filter(t => t.type === 'semicolon')).toHaveLength(0)
  })

  it('reports an unterminated comment', () => {
    const result = tokenize('a { color: red } /* oops')
    expect(result.truncated).toBe(true)
  })
})

describe('parseDeclaration', () => {
  it('splits on the first top level colon only', () => {
    const declaration = parseDeclaration('background:url(data:image/png;base64,AA==)', 0)
    expect(declaration).toMatchObject({
      property: 'background',
      value: 'url(data:image/png;base64,AA==)',
      important: false
    })
  })

  it('lower-cases the property but preserves the value', () => {
    expect(parseDeclaration('COLOR: Red', 0)).toMatchObject({
      property: 'color',
      value: 'Red'
    })
  })

  it.each([
    'margin: 0 !important',
    'margin: 0!important',
    'margin: 0 ! important',
    'margin: 0 !IMPORTANT'
  ])('detects important in "%s"', input => {
    expect(parseDeclaration(input, 0)).toMatchObject({ value: '0', important: true })
  })

  it('rejects text with no colon', () => {
    expect(parseDeclaration('not-a-declaration', 0)).toBeNull()
  })
})

describe('parse', () => {
  it('reads a flat rule', () => {
    const sheet = parse('.a { color: red; width: 10px }')
    expect(sheet.nodes).toHaveLength(1)
    const rule = sheet.nodes[0]
    expect(rule?.kind).toBe('rule')
    expect(rule?.declarations.map(d => d.property)).toEqual(['color', 'width'])
  })

  it('splits selector lists on top level commas only', () => {
    const sheet = parse('.a, :is(.b, .c) { color: red }')
    const rule = sheet.nodes[0]
    expect(rule?.kind === 'rule' && rule.selectors).toEqual(['.a', ':is(.b, .c)'])
  })

  it('nests at-rules to arbitrary depth', () => {
    const sheet = parse(`
      @supports (display: grid) {
        @media (min-width: 640px) {
          .a { display: grid }
        }
      }
    `)
    const supports = sheet.nodes[0]
    expect(supports?.kind).toBe('atrule')
    const media = supports?.children[0]
    expect(media?.kind === 'atrule' && media.name).toBe('media')
    expect(media?.children[0]?.kind).toBe('rule')
  })

  it('records statement at-rules without a block', () => {
    const sheet = parse('@import url(a.css); .a { color: red }')
    expect(sheet.nodes).toHaveLength(2)
    const atRule = sheet.nodes[0]
    expect(atRule?.kind === 'atrule' && atRule.name).toBe('import')
    expect(atRule?.kind === 'atrule' && atRule.hasBlock).toBe(false)
  })

  it('closes an unterminated block and reports it', () => {
    const sheet = parse('.a { color: red')
    expect(sheet.nodes).toHaveLength(1)
    expect(sheet.nodes[0]?.declarations).toHaveLength(1)
    expect(sheet.diagnostics.map(d => d.code)).toContain('unexpected-eof')
  })

  it('ignores a stray closing brace', () => {
    const sheet = parse('} .a { color: red }')
    expect(sheet.nodes).toHaveLength(1)
    expect(sheet.nodes[0]?.kind === 'rule' && sheet.nodes[0]?.selector).toBe('.a')
  })

  it('reports a declaration that is not a property/value pair', () => {
    const sheet = parse('.a { color red; width: 1px }')
    expect(sheet.diagnostics.map(d => d.code)).toContain('malformed-declaration')
    expect(sheet.nodes[0]?.declarations).toHaveLength(1)
  })

  it('supports CSS nesting', () => {
    const sheet = parse('.card { color: red; &:hover { color: blue } }')
    const rule = sheet.nodes[0]
    expect(rule?.declarations).toHaveLength(1)
    expect(rule?.children).toHaveLength(1)
    expect(rule?.children[0]?.kind === 'rule' && rule.children[0]?.selector).toBe('&:hover')
  })
})
