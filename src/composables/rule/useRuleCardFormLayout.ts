import { onMounted, onUnmounted, ref } from 'vue'

export function useRuleCardFormLayout() {
  const collapsedSection = ref<'variable' | 'rule' | null>(null)
  const isCompact = ref(false)

  const toggleCollapsedSection = () => {
    if (!isCompact.value) return
    collapsedSection.value = collapsedSection.value === 'rule' ? 'variable' : 'rule'
  }

  let collapseMediaQuery: MediaQueryList | null = null

  const handleCollapseMediaChange = (event: MediaQueryList | MediaQueryListEvent) => {
    isCompact.value = event.matches
    collapsedSection.value = event.matches ? 'rule' : null
  }

  onMounted(() => {
    collapseMediaQuery = window.matchMedia('(max-width: 1400px)')
    handleCollapseMediaChange(collapseMediaQuery)
    if (collapseMediaQuery.addEventListener) {
      collapseMediaQuery.addEventListener('change', handleCollapseMediaChange)
    } else {
      collapseMediaQuery.addListener(handleCollapseMediaChange as (event: MediaQueryListEvent) => void)
    }
  })

  onUnmounted(() => {
    if (!collapseMediaQuery) return
    if (collapseMediaQuery.removeEventListener) {
      collapseMediaQuery.removeEventListener('change', handleCollapseMediaChange)
    } else {
      collapseMediaQuery.removeListener(handleCollapseMediaChange as (event: MediaQueryListEvent) => void)
    }
  })

  return {
    collapsedSection,
    isCompact,
    toggleCollapsedSection,
  }
}
