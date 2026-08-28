/**
 * Throughput against the original package.
 *
 * Two shapes, because they stress different things:
 *
 * - **repeated** — the same declarations across many rules, which is what real
 *   stylesheets look like. The per-call memo does the work here.
 * - **unique** — every declaration value different, which defeats the memo
 *   entirely and measures raw parse plus handler cost.
 */

import { bench, describe } from 'vitest'

import { CssToTailwindTranslator as original } from 'css-to-tailwind-translator'

import { CssToTailwindTranslator } from '../src/index.js'

/** 13 declarations per rule, identical in every rule. */
const repeatedSheet = (rules: number): string => {
  const parts: string[] = []
  for (let index = 0; index < rules; index++) {
    parts.push(`.rule-${index} {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      margin-top: -0.5rem;
      color: #1f2937;
      background-color: rgba(255, 255, 255, 0.8);
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transform: translateY(-2px) scale(1.05);
      filter: blur(4px) brightness(1.25);
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }`)
  }
  return parts.join('\n')
}

/** 8 declarations per rule, no two values alike anywhere in the sheet. */
const uniqueSheet = (rules: number): string => {
  const parts: string[] = []
  for (let index = 0; index < rules; index++) {
    parts.push(`.rule-${index} {
      width: ${index}px;
      height: ${index + 1}px;
      margin-top: ${index}px;
      color: #${(index % 900000) + 100000};
      padding: ${index}px ${index + 1}px;
      top: ${index}px;
      z-index: ${index};
      opacity: 0.${index % 100};
    }`)
  }
  return parts.join('\n')
}

const REPEATED = repeatedSheet(500)
const UNIQUE = uniqueSheet(500)

describe('repeated declarations (500 rules, 6500 declarations)', () => {
  bench('css-to-tailwind-core', () => {
    CssToTailwindTranslator(REPEATED)
  })

  bench('css-to-tailwind-translator@1.2.8', () => {
    original(REPEATED)
  })
})

describe('unique declarations (500 rules, 4000 declarations)', () => {
  bench('css-to-tailwind-core', () => {
    CssToTailwindTranslator(UNIQUE)
  })

  bench('css-to-tailwind-translator@1.2.8', () => {
    original(UNIQUE)
  })
})

describe('repeated declarations, no default value tables', () => {
  bench('css-to-tailwind-core', () => {
    CssToTailwindTranslator(REPEATED, { useAllDefaultValues: false })
  })

  bench('css-to-tailwind-translator@1.2.8', () => {
    original(REPEATED, { prefix: '', useAllDefaultValues: false, customTheme: {} })
  })
})
