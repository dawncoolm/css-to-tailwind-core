# Docs

Update `docs/features.md` in the same change whenever user-visible behavior changes: features added or
removed, interactions, scoring/grading rules, the boundaries of what the AI may do. Purely internal
changes (refactors, perf, behavior-preserving fixes, dependency bumps) need no doc update.

`docs/features.md` describes features, not code — tech stack, directory layout, file paths, tables,
endpoints, and component names belong in the README. Keep the "what it can't do" section current;
stale limitations get mistaken for bugs and re-investigated over and over.

# Commits

Commit when a change lands — don't ask. `add` only the files this change touched, never `git add -A`.
One thing, one commit: split unrelated changes, and when a refactor is mixed with a feature, commit the
refactor first. Feature changes commit `docs/features.md` alongside the code.

Never push, never rewrite history — `push`, `rebase`, `amend`, and `reset` all need an explicit request.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[(scope)][!]: <description>

[body]

[BREAKING CHANGE: <what breaks>]
```

- `type`: `feat` `fix` `refactor` `docs` `test` `perf` `build` `ci` `chore`; scope optional
- `description`: English, imperative, lowercase, no trailing period — say what changed, never
  "update code"
- Breaking changes take `!` after the type and a `BREAKING CHANGE:` footer
- The body explains *why*, not which files changed: the problem, how it showed up, why this approach
  over the obvious one, and the trap that's easy to fall into again. One-sentence changes can be
  subject-only.
