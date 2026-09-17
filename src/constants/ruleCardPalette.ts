export interface RuleCardPaletteItem {
  id: string
  name: string
  type: string
  description: string
  /** Optional extra hint shown in the left-panel hover tooltip. */
  detail?: string
  icon: string
  config: Record<string, unknown>
}

export interface RuleCardPaletteCategory {
  type: string
  title: string
  icon: string
  tooltip?: string
  cards: RuleCardPaletteItem[]
}

export const RULE_CARD_CATEGORIES: RuleCardPaletteCategory[] = [
  {
    type: 'function',
    title: 'Function',
    icon: 'Filter',
    cards: [
      {
        id: 'function-2',
        name: 'Switch Function',
        type: 'function-switch',
        description: 'Route the rule flow to different branches based on configured switch conditions and variables.',
        detail: 'Drag onto the canvas, bind variables, then connect each output port to the next action node.',
        icon: 'i-tabler-git-fork',
        config: {
          variables: [],
          rule: [],
          wires: {},
        },
      },
    ],
  },
  {
    type: 'action',
    title: 'Action',
    icon: 'Operation',
    tooltip: 'action cards are used to perform specific actions',
    cards: [
      {
        id: 'action-1',
        name: 'Change Value',
        type: 'action-changeValue',
        description: 'Write a configured target value to selected instance action points when the branch executes.',
        detail: 'Connect upstream from a switch or start node, then configure instance, point, and value rules.',
        icon: 'i-tabler-adjustments',
        config: { rule: [], wires: {} },
      },
      {
        id: 'action-2',
        name: 'Period Delta',
        type: 'action-periodDelta',
        description: 'Compute and output the delta of an input measurement over a configured period such as daily.',
        detail: 'Map input and output points, choose the period, then wire the node into the execution chain.',
        icon: 'i-tabler-chart-line',
        config: {
          input: {
            name: 'X1',
            instance: 1,
            pointType: 'measurement',
            point: 9,
          },
          output: {
            name: 'X2',
            instance: 1,
            pointType: 'measurement',
            point: 101,
          },
          period: 'daily',
          wires: { default: [] },
        },
      },
    ],
  },
]
