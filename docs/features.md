# Features

What the library does, from the caller's point of view.

## Conversion

Takes a string of CSS and returns, for each rule it finds, the selector and the
Tailwind utility classes equivalent to that rule's declarations.

- **273 CSS properties** are recognised, the same set the original
  `css-to-tailwind-translator` supported.
- A value that matches one of Tailwind's default scales becomes the named
  utility (`padding: 1rem` → `p-4`, `font-size: 0.875rem` → `text-sm`,
  `box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` → `shadow-sm`).
- Anything else becomes an arbitrary value (`padding: 13px` → `p-[13px]`).
  Whitespace inside an arbitrary value is encoded as `_`, so the result is always
  a usable class name.
- Properties Tailwind has no utility family for become arbitrary properties
  (`caption-side: top` → `[caption-side:top]`).
- Shorthands are expanded where Tailwind expects it: `padding: 1rem 2rem` becomes
  `px-8 py-4`, `transform: translateX(1rem) rotate(45deg)` becomes
  `translate-x-4 rotate-45`.
- Colours are recognised in the full CSS Color 4 surface: named colours, 3/4/6/8
  digit hex, legacy and space-separated `rgb()`/`hsl()` with a slash alpha,
  `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()` and `color-mix()`.
- Duplicate classes are removed, keeping the order they were first produced in.

## Selectors and variants

- Trailing pseudo-classes and pseudo-elements become Tailwind variants, composed
  in source order: `.btn:hover::before` → `hover:before:…`. Over thirty are
  mapped by name (`hover`, `focus`, `focus-visible`, `disabled`, `checked`,
  `first`, `last`, `odd`, `even`, `placeholder`, `file`, `marker`, `selection`,
  and so on); anything else falls back to Tailwind's arbitrary variant syntax.
- A trailing attribute selector becomes an arbitrary variant.
- A `.dark` (or `[data-theme=dark]`) ancestor becomes the `dark:` variant.
- A selector list only contributes a variant when every selector in it agrees.
  `.a, .b:hover` cannot be expressed as one class list, so it produces no variant
  and reports a warning instead of guessing.

## At-rules

- `@media` maps to a responsive variant. The five default breakpoints and their
  `max-*` counterparts are recognised; any other query becomes an arbitrary
  variant.
- `@supports` becomes a `supports-[…]` variant.
- `@layer` and `@scope` are transparent: their contents convert as if they were
  at the top level.
- At-rules nest to any depth, and their variants compose.
- CSS nesting is supported; a nested rule inherits its parent's variants.
- `@charset`, `@font-face`, `@import` and `@keyframes` have no Tailwind
  equivalent. They are skipped with a warning and the rest of the stylesheet
  still converts.

Each result's selector carries the at-rules it was nested under, joined with
`-->`, for example `@media (min-width: 768px)-->.card`.

## Configuration

- **`tailwindVersion`** — `3` (default) or `4`. Selects which generation of class
  names to emit: `grow`/`shrink` instead of `flex-grow`/`flex-shrink`, the
  shifted shadow, radius and blur scales, `outline-hidden` instead of
  `outline-none`, no `filter`/`backdrop-filter` marker classes, and the trailing
  `!` important marker.
- **`useAllDefaultValues`** — on by default. Turn it off to always emit arbitrary
  values instead of resolving against Tailwind's scales.
- **`prefix`** — Tailwind's configured class prefix. Applied inside variants and
  outside a leading minus sign: `sm:hover:-tw-mt-4`.
- **`customTheme`** — value overrides that win over every built-in mapping, and
  that apply even when `useAllDefaultValues` is off. Three key conventions:
  responsive breakpoints under `media`; `filter`/`backdrop-filter`/`transform`
  sub-functions keyed on the raw function argument and mapped to a class suffix;
  and every other CSS property keyed on the whole declaration value and mapped to
  a complete class name.

## `!important`

Recognised in every spelling CSS allows — with or without whitespace around the
bang, in any case. Applied to each generated class, in the position the target
Tailwind version expects.

## Error tolerance and reporting

Nothing throws, whatever the input.

- Comments, quoted strings and `url(data:…;base64,…)` are handled correctly; a
  semicolon or colon inside them never splits a declaration.
- An unbalanced brace closes at end of input; a stray closing brace is ignored;
  an unterminated comment or string ends the parse cleanly.
- Every declaration that could not be converted is reported: whether the property
  is unknown or only the value is unsupported, the property, the value, the
  selector it appeared under, and its byte offsets in the input. Nothing is
  dropped silently.
- A result is flagged as containing a syntax error when the stylesheet held one
  of the four unsupported at-rules, but the converted rules are still returned.

## What it can't do

- **Not a Tailwind config reader.** It knows Tailwind's *default* scales. A
  project with a customised `theme` must describe the differences through
  `customTheme`; the library will not read `tailwind.config.js`.
- **No colour matching against the palette.** `color: #ef4444` becomes
  `text-[#ef4444]`, never `text-red-500`. Values are matched literally, not by
  nearest colour.
- **Only trailing pseudo selectors become variants.** A pseudo in the middle of a
  descendant selector (`.a:hover .b`) is left in the base selector and produces
  no variant.
- **No group or peer variants.** Relationships between selectors are not
  inferred, so `group-hover:` and `peer-checked:` are never produced.
- **Declaration order is not reconciled.** Two declarations that set overlapping
  properties both produce classes; which one wins is left to Tailwind's own
  ordering, which may not match the CSS cascade.
- **`@keyframes` and `@font-face` are not translated.** Animations must be
  defined in the Tailwind config; the library only maps the `animation` shorthand
  that references them.
- **Preprocessor syntax is not understood.** Sass or Less variables, mixins and
  functions are not evaluated. Compile to plain CSS first.
- **Tailwind v4's CSS-first config is not read.** The `tailwindVersion: 4` option
  changes the class names emitted, not where the theme comes from; an
  `@theme` block in the input is treated as an unrecognised at-rule.
- **No output validation.** A class name is produced from the CSS value alone; it
  is not checked against what a Tailwind build would actually generate.
