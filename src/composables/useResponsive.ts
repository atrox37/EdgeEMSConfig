import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 响应式断点配置
 */
export const BREAKPOINTS = {
  mobile: 1280, // Sidebar 折叠断点（<1280 折叠）
  narrow: 960, // 操作列简化断点（<960 显示“更多”）
  filterCollapse: 1740, // 筛选条件折叠断点
} as const

/**
 * 响应式布局监听 Composable
 * 
 * @returns {Object} 响应式断点状态
 * @property {Ref<boolean>} isMobile - 窗口宽度 < 1280px（用于 Sidebar 折叠）
 * @property {Ref<boolean>} isNarrow - 窗口宽度 < 960px（用于操作列“更多”）
 * @property {Ref<boolean>} isFilterCollapsed - 窗口宽度 < 1740px
 * @property {Ref<number>} windowWidth - 当前窗口宽度
 */
export function useResponsive() {
  // 响应式状态
  const isMobile = ref(false) // < 1280px
  const isNarrow = ref(false) // < 960px
  const isFilterCollapsed = ref(false) // < 1740px
  const windowWidth = ref(window.innerWidth)

  // 媒体查询对象
  let mobileQuery: MediaQueryList | null = null
  let narrowQuery: MediaQueryList | null = null
  let filterQuery: MediaQueryList | null = null

  // 更新所有断点状态
  const updateBreakpoints = () => {
    const width = window.innerWidth
    windowWidth.value = width

    isMobile.value = width < BREAKPOINTS.mobile
    isNarrow.value = width < BREAKPOINTS.narrow
    isFilterCollapsed.value = width < BREAKPOINTS.filterCollapse
  }

  // 媒体查询监听器
  const handleMobileChange = (e: MediaQueryListEvent | MediaQueryList) => {
    isMobile.value = e.matches
  }

  const handleNarrowChange = (e: MediaQueryListEvent | MediaQueryList) => {
    isNarrow.value = e.matches
  }

  const handleFilterChange = (e: MediaQueryListEvent | MediaQueryList) => {
    isFilterCollapsed.value = e.matches
  }

  // 初始化监听
  onMounted(() => {
    // 初始化断点状态
    updateBreakpoints()

    // 使用 matchMedia 监听断点变化
    mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 1}px)`)
    narrowQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.narrow - 1}px)`)
    filterQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.filterCollapse - 1}px)`)

    // 设置初始值
    handleMobileChange(mobileQuery)
    handleNarrowChange(narrowQuery)
    handleFilterChange(filterQuery)

    // 添加监听器（兼容旧版浏览器）
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', handleMobileChange)
      narrowQuery.addEventListener('change', handleNarrowChange)
      filterQuery.addEventListener('change', handleFilterChange)
    } else {
      // 兼容性处理
      mobileQuery.addListener(handleMobileChange as any)
      narrowQuery.addListener(handleNarrowChange as any)
      filterQuery.addListener(handleFilterChange as any)
    }

    // 额外添加 resize 监听以更新 windowWidth
    window.addEventListener('resize', updateBreakpoints)
  })

  // 清理监听器
  onUnmounted(() => {
    if (mobileQuery) {
      if (mobileQuery.removeEventListener) {
        mobileQuery.removeEventListener('change', handleMobileChange)
      } else {
        mobileQuery.removeListener(handleMobileChange as any)
      }
    }

    if (narrowQuery) {
      if (narrowQuery.removeEventListener) {
        narrowQuery.removeEventListener('change', handleNarrowChange)
      } else {
        narrowQuery.removeListener(handleNarrowChange as any)
      }
    }

    if (filterQuery) {
      if (filterQuery.removeEventListener) {
        filterQuery.removeEventListener('change', handleFilterChange)
      } else {
        filterQuery.removeListener(handleFilterChange as any)
      }
    }

    window.removeEventListener('resize', updateBreakpoints)
  })

  return {
    isMobile,
    isNarrow,
    isFilterCollapsed,
    windowWidth,
  }
}

