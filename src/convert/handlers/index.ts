/**
 * The complete property registry.
 *
 * Handlers are grouped by the section of the Tailwind documentation they belong
 * to. {@link buildRegistry} rejects a property that two groups both claim, so the
 * grouping stays a partition rather than a suggestion.
 */

import { buildRegistry, type HandlerGroup } from '../registry.js'
import { backgroundHandlers } from './backgrounds.js'
import { borderHandlers } from './borders.js'
import { effectHandlers } from './effects.js'
import { filterHandlers } from './filters.js'
import { flexboxHandlers } from './flexbox.js'
import { gridHandlers } from './grid.js'
import { interactivityHandlers } from './interactivity.js'
import { layoutHandlers } from './layout.js'
import { miscHandlers } from './misc.js'
import { sizingHandlers } from './sizing.js'
import { spacingHandlers } from './spacing.js'
import { svgHandlers } from './svg.js'
import { tableHandlers } from './tables.js'
import { transformHandlers } from './transforms.js'
import { transitionHandlers } from './transitions.js'
import { typographyHandlers } from './typography.js'

const GROUPS: readonly HandlerGroup[] = [
  layoutHandlers,
  flexboxHandlers,
  gridHandlers,
  spacingHandlers,
  sizingHandlers,
  typographyHandlers,
  backgroundHandlers,
  borderHandlers,
  effectHandlers,
  filterHandlers,
  tableHandlers,
  transitionHandlers,
  transformHandlers,
  interactivityHandlers,
  svgHandlers,
  miscHandlers
]

export const registry = buildRegistry(GROUPS)
