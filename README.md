# css-to-tailwind-core

Convert CSS into Tailwind CSS utility classes.

A rewrite of [`css-to-tailwind-translator`](https://github.com/hymhub/css-to-tailwind)
with the same public API, a real CSS parser, Tailwind v3 **and** v4 output, and a
diagnostic for every declaration it cannot convert.

Zero runtime dependencies. ESM and CJS. Node ≥ 18, and browser-safe.

```bash
npm i css-to-tailwind-core
```

## Usage

```ts
import { CssToTailwindTranslator } from 'css-to-tailwind-core'

const result = CssToTailwindTranslator(`body {
  width: 100%;
  height: 50%;
  margin: 0 !important;
  background-color: transparent;
}`)

// {
//   code: 'OK',
//   data: [{ selectorName: 'body', resultVal: 'w-full h-1/2 !m-0 bg-transparent' }],
//   diagnostics: []
// }
```

## API

### `CssToTailwindTranslator(code, config?)`

| parameter | type | description |
| --- | --- | --- |
| `code` | `string` | Any CSS. Comments, nested at-rules and unbalanced braces are tolerated; nothing throws. |
| `config` | `TranslatorConfig` | Optional. See below. |

### `TranslatorConfig`

| option | type | default | description |
| --- | --- | --- | --- |
| `prefix` | `string` | `''` | Tailwind's [`prefix`](https://tailwindcss.com/docs/configuration#prefix). Applied inside variants and outside a leading minus: `sm:hover:-tw-mt-4`. |
| `useAllDefaultValues` | `boolean` | `true` | Resolve values against Tailwind's default scales (`1rem` → `p-4`) instead of always emitting arbitrary values (`p-[1rem]`). |
| `customTheme` | `CustomTheme` | `{}` | Value overrides. Always win, even with `useAllDefaultValues: false`. |
| `tailwindVersion` | `3 \| 4` | `3` | Which Tailwind major version the class names target. |

### Result

```ts
interface TranslationResult {
  code: 'OK' | 'SyntaxError'
  data: { selectorName: string; resultVal: string }[]
  diagnostics: Diagnostic[]
}
```

`selectorName` carries the enclosing at-rules, joined with `-->`:

```
@media (min-width: 768px)-->.card
```

`code` is `'SyntaxError'` when the sheet contained `@charset`, `@font-face`,
`@import` or `@keyframes`. **Unlike the original package, `data` is still fully
populated in that case** — one at-rule with no Tailwind equivalent no longer
discards the whole stylesheet.

### `Diagnostic`

Every declaration that could not be converted is reported instead of silently
dropped:

```ts
interface Diagnostic {
  level: 'warning' | 'error'
  code:
    | 'unknown-property'
    | 'unsupported-value'
    | 'unsupported-at-rule'
    | 'malformed-declaration'
    | 'unexpected-eof'
  message: string
  selector?: string
  property?: string
  value?: string
  start?: number
  end?: number
}
```

```ts
CssToTailwindTranslator('.a { height: potato }').diagnostics
// [{ level: 'warning', code: 'unsupported-value', property: 'height',
//    value: 'potato', selector: '.a', start: 5, end: 20, message: '…' }]
```

## `customTheme`

Three key conventions, inherited from the original package.

**1. `media` — responsive breakpoints.** Keyed on the at-rule prelude as written.

```ts
CssToTailwindTranslator(
  '@media (min-width: 1800px) { .my-media { display: flex; align-items: center } }',
  { customTheme: { media: { '@media (min-width: 1800px)': '3xl' } } }
)
// .my-media -> '3xl:flex 3xl:items-center'
```

**2. `filter` / `backdrop-filter` / `transform` sub-functions.** Keyed on the raw
function argument, mapped to the class **suffix only**.

```ts
CssToTailwindTranslator(
  '.my-style { transform: rotate(99deg); backdrop-filter: blur(99999px) }',
  {
    customTheme: {
      rotate: { '99deg': 'crooked' },
      'backdrop-blur': { '99999px': 'super-big' }
    }
  }
)
// .my-style -> 'rotate-crooked backdrop-filter backdrop-blur-super-big'
```

Supported groups: `blur`, `brightness`, `contrast`, `grayscale`, `hue-rotate`,
`invert`, `saturate`, `sepia`, their nine `backdrop-*` counterparts, plus `scale`,
`rotate`, `translate`, `skew`.

**3. Any other CSS property.** Keyed on the whole declaration value, mapped to a
**complete class name**, prefix included.

```ts
CssToTailwindTranslator(
  '.my-style { box-shadow: 10px 10px 5px #888888; width: 288px }',
  {
    customTheme: {
      width: { '288px': 'w-custom' },
      'box-shadow': { '10px 10px 5px #888888': 'box-shadow-custom' }
    }
  }
)
// .my-style -> 'box-shadow-custom w-custom'
```

## Tailwind v4

Pass `tailwindVersion: 4` to emit v4 class names.

| CSS | v3 | v4 |
| --- | --- | --- |
| `flex-grow: 1` | `flex-grow` | `grow` |
| `flex-shrink: 0` | `flex-shrink-0` | `shrink-0` |
| `border-radius: 0.25rem` | `rounded` | `rounded-sm` |
| `border-radius: 0.125rem` | `rounded-sm` | `rounded-xs` |
| `box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05)` | `shadow-sm` | `shadow-xs` |
| `filter: blur(4px)` | `filter blur-sm` | `blur-xs` |
| `filter: grayscale(1)` | `filter grayscale` | `grayscale` |
| `outline-style: none` | `outline-none` | `outline-hidden` |
| `display: flex !important` | `!flex` | `flex!` |

The default is `3`, so upgrading from `css-to-tailwind-translator` changes nothing
until you opt in.

## What changed versus the original

The original is a single 2299-line file with no tests. Every item below is
covered by a named test in `test/regressions.test.ts`.

| id | original behaviour | now |
| --- | --- | --- |
| D1 | `isUnit()` opened with `if (str.length > 0) return true`, so `height: potato` produced `h-[potato]` | a real predicate over CSS dimensions, keywords, `var()` and the math functions |
| D2 | `useAllDefaultValues` and `customTheme` lived in module-level `let`s, so concurrent calls read each other's config | all state on a per-call `ConversionContext` |
| D3 | newlines were stripped and braces counted by hand; comments, strings and `url(data:…;base64,…)` all broke the parse | a tokenizer that tracks comment, string and bracket state |
| D4 | `code.includes('@import')` discarded the entire stylesheet ([#17](https://github.com/hymhub/css-to-tailwind/issues/17)) | the at-rule is skipped, everything else converts, a diagnostic is emitted |
| D5 | the colour regex rejected `#RGBA`, `#RRGGBBAA`, `rgb(0 0 0 / 50%)`, `oklch()` ([#16](https://github.com/hymhub/css-to-tailwind/issues/16)) | full CSS Color 4 detection |
| D6 | `font-size` always emitted `text-[…]` ([#12](https://github.com/hymhub/css-to-tailwind/issues/12)) | resolves `text-xs` … `text-9xl` first |
| D7 | `box-shadow` always emitted `[box-shadow:…]` ([#1](https://github.com/hymhub/css-to-tailwind/issues/1)) | resolves `shadow-sm` … `shadow-2xl`, `shadow-inner`, `shadow-none` first |
| D8 | one nesting level only; `@supports`, `@layer` and nested `@media` were dropped ([#13](https://github.com/hymhub/css-to-tailwind/issues/13)) | recursive parse, `@supports` → `supports-[…]`, `@layer` transparent, CSS nesting supported |
| D9 | five hard-coded pseudo variants | table driven: 30+ named variants, `[&:…]` fallback for the rest, `dark:` from a `.dark` ancestor |
| D10 | unconvertible declarations vanished | reported in `diagnostics` with property, value and source offsets |
| D11 | dedup compared joined declaration results, not classes | class-level dedup, first-seen order preserved |
| D12 | a 148-entry array rebuilt on every `isColor()`; two maps spread on every `background`; four scale tables rebuilt on every `transform` | every table hoisted, frozen and `Set`-backed; per-call memo on `property: value` |
| D13 | `getCustomVal` collapsed whitespace with an O(n²) slice loop | a single regex pass |
| D14 | Tailwind v3 only | `tailwindVersion: 3 \| 4` |
| D15 | variants were applied to the first class only when the list began with `transform`/`filter`/`backdrop-filter`, so `hover:transform rotate-45` rotated unconditionally | every class is decorated |
| D16 | `.a, .b:hover` applied `:hover` to both selectors | mixed selector lists produce no variant and a diagnostic |
| D17 | `box-align: start` mapped to `[box-align:inherit]`, and `end`/`center`/`baseline`/`stretch` all to `[box-align:unset]` | each value maps to itself |
| D18 | `outline-style: none` emitted `outline-[none]`, which is not a class Tailwind generates | `outline-none` |
| D19 | the `z-index` fallback was guarded by `typeof val === 'number'`, never true for a parsed CSS value, so `z-index: 999` produced nothing | `z-[999]` |
| D20 | `counter-increment` emitted `[content-increment:…]` | `[counter-increment:…]` |

Two default tables were also completed: `gap` gained `gap-px` (the original had it
for `column-gap` but not `gap`) and `max-height` gained `max-h-0`.

Everything else is byte-identical. `pnpm parity` compares 625 cases against
`css-to-tailwind-translator@1.2.8` — every value of every static table it ships,
plus representative values for each of its computed handlers, plus eight whole
stylesheets — and currently reports **606 identical, 19 explained by the table
above, 0 unexplained**. It exits non-zero on any difference it cannot attribute
to one of these fixes.

## Development

```bash
pnpm install
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
pnpm build       # tsup -> dist/ (esm + cjs + d.ts)
pnpm bench       # throughput on a 500-rule sheet
pnpm parity      # diff against css-to-tailwind-translator@1.2.8
```

`css-to-tailwind-translator@1.2.8` is a devDependency purely so `pnpm parity` and
`pnpm bench` have something to compare against; it is not a runtime dependency,
and `dist/` does not reference it.

### Performance

`pnpm bench`, 500-rule stylesheets, Node 25 on an M-series Mac:

| sheet | this package | original | |
| --- | --- | --- | --- |
| repeated declarations (6500 decls) | 275 ops/s | 95 ops/s | **2.88×** |
| repeated, `useAllDefaultValues: false` | 290 ops/s | 95 ops/s | **3.06×** |
| every value unique (4000 decls) | 232 ops/s | 196 ops/s | 1.18× |

Real stylesheets repeat their declarations heavily, which is where the per-call
memo and the hoisted lookup tables pay off. On a synthetic sheet where no value
ever repeats the memo cannot help and the two are within measurement noise — the
allocation savings are offset by the extra work of a correct parser and of
validating values instead of accepting everything.

### Layout

```
src/
  index.ts              public exports
  types.ts              ResultCode, TranslatorConfig, CustomTheme, Diagnostic
  translator.ts         parse -> walk -> convert -> assemble
  parser/               tokenizer, AST, declaration splitting
  selector/             pseudo -> variant, at-rule -> variant
  convert/
    context.ts          per-call state
    registry.ts         property -> handler
    declaration.ts      customTheme -> defaults -> handler
    format.ts           prefix, !important, variants, dedup
    handlers/           273 properties in 16 groups
  theme/
    scales.ts           the value ladders, defined once
    v3.ts / v4.ts       version presets
  utils/                colour, unit and value predicates
```

Adding a property means adding one entry to the right handler group. The registry
throws at import time if two groups claim the same property.

## Licence

MIT
