<template>
  <div class="stacked-bar-chart">
    <div class="stacked-bar-chart-container" ref="chartRef"></div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { useGlobalStore } from '@/stores/global'
import { pxToResponsive } from '@/utils/responsive'
const globalStore = useGlobalStore()

echarts.use([BarChart, GridComponent, LegendComponent, SVGRenderer])

interface SeriesData {
  name: string
  data: number[]
  color: string
}

interface XAxisOption {
  xAxiosData: string[]
  xUnit?: string
}

interface YAxisOption {
  yUnit?: string
}

// Grid配置接口
interface GridConfig {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

const props = withDefaults(defineProps<{
  xAxiosOption: XAxisOption
  yAxiosOption: YAxisOption
  series: SeriesData[]
  gridConfig?: GridConfig
}>(), {
  gridConfig: () => ({
    left: 0,
    right: 0,
    top: 45,
    bottom: 10
  })
})

function getGridConfig() {
  return {
    left: pxToResponsive(props.gridConfig.left || 0),
    right: pxToResponsive(props.gridConfig.right || 0),
    top: pxToResponsive(props.gridConfig.top || 45),
    bottom: pxToResponsive(props.gridConfig.bottom || 15),
  }
}
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let resizeRaf: number | null = null
let lastDevicePixelRatio: number | null = null

function getDomScale(el: HTMLElement): number {
  const cw = el.clientWidth
  const ch = el.clientHeight
  if (cw <= 0 || ch <= 0) return 1
  const rect = el.getBoundingClientRect()
  const sx = rect.width / cw
  const sy = rect.height / ch
  const s = (sx + sy) / 2
  return Number.isFinite(s) && s > 0 ? s : 1
}

function getChartOption({ chartWidth = 600 }: { chartWidth?: number } = {}) {
  const xUnit = props.xAxiosOption.xUnit || ''
  const yUnit = props.yAxiosOption.yUnit || ''
  const dataCount = props.xAxiosOption.xAxiosData.length

  const margin = pxToResponsive(100)
  const barSpacing = Math.max(pxToResponsive(15), ((chartWidth - margin) * 0.1) / dataCount)
  const barWidth = Math.min(pxToResponsive(60), (chartWidth - margin - barSpacing * (dataCount - 1)) / dataCount)

  const totalData = props.xAxiosOption.xAxiosData.map((_, index) => {
    return props.series.reduce((sum, s) => sum + (s.data[index] || 0), 0)
  })

  const legend = {
    icon: 'circle',
    show: true,
    type: 'plain',
    orient: 'horizontal',
    right: 0,
    top: pxToResponsive(10),
    selectedMode: false,
    itemWidth: pxToResponsive(12),
    itemHeight: pxToResponsive(12),
    itemGap: pxToResponsive(25),
    textStyle: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: pxToResponsive(12),
      fontFamily: 'Arimo',
      fontWeight: 400,
    },
    data: props.series.map((s) => s.name),
  }

  const grid = getGridConfig()

  const xAxis = {
      type: 'category',
      name: xUnit,
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(12),
        padding: [pxToResponsive(10), 0, 0, 0],
      },
      data: props.xAxiosOption.xAxiosData,
      axisTick: {
        alignWithLabel: true,
        lineStyle: { color: '#fff' },
      },
      axisLine: { show: false },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(12),
      },
      splitLine: { show: false },
      boundaryGap: true,
    }

  const yAxis = {
      type: 'value',
      name: yUnit,
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(12),
        align: 'right',
        padding: [0, pxToResponsive(8), pxToResponsive(5), 0],
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(12),
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#fff',
          type: 'dashed',
          opacity: 0.2,
        },
      },
    }

  // series
  const seriesData = [
    {
      name: 'background',
      type: 'bar',
      barWidth: barWidth,
      barGap: '-100%',
      itemStyle: {
        color: 'rgba(255,255,255,0)',
      },
      data: totalData,
      showBackground: true,
      backgroundStyle: {
        color: 'rgba(252, 252, 253, 0.04)',
      },
      silent: true,
      emphasis: { disabled: true },
      tooltip: { show: false },
      label: { show: false },
      z: 0,
    },
    ...props.series.map((s) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      stack: 'data',
      silent: true,
      emphasis: { disabled: true },
      barWidth: barWidth * 0.7,
      barGap: '-85%',
      itemStyle: {
        color: s.color,
      },
      z: 1,
    })),
  ]

  return {
    legend,
    grid,
    xAxis,
    yAxis,
    tooltip: { show: false },
    series: seriesData,
  }
}

const renderChart = () => {
  if (!chartRef.value) return

  const scale = getDomScale(chartRef.value)
  const desiredDpr = window.devicePixelRatio * scale

  if (chartInstance && lastDevicePixelRatio && Math.abs(lastDevicePixelRatio - desiredDpr) > 0.15) {
    chartInstance.dispose()
    chartInstance = null
    lastDevicePixelRatio = null
  }

  if (!chartInstance) {
    // 使用 SVG 渲染器，在父容器 transform scale 下不失真
    chartInstance = echarts.init(chartRef.value, { renderer: 'svg' })
    lastDevicePixelRatio = desiredDpr
  }

  const chartWidth = chartRef.value.clientWidth || 600
  chartInstance.setOption(getChartOption({ chartWidth }), {
    notMerge: true,
    lazyUpdate: true,
  })
  chartInstance.resize()
}

const scheduleResize = () => {
  if (resizeRaf != null) {
    cancelAnimationFrame(resizeRaf)
  }
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null
    renderChart()
  })
}

// 监听侧边栏折叠状态变化
watch(
  () => globalStore.isCollapse,
  () => {
    nextTick(() => {
      scheduleResize()
    })
  },
)

watch(
  () => [props.xAxiosOption.xAxiosData, props.series],
  () => {
    renderChart()
  },
  { deep: true },
)

onMounted(() => {
  renderChart()
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => scheduleResize())
    resizeObserver.observe(chartRef.value)
  }
  window.addEventListener('resize', scheduleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleResize)
  if (resizeObserver && chartRef.value) {
    resizeObserver.unobserve(chartRef.value)
  }
  resizeObserver = null
  if (resizeRaf != null) {
    cancelAnimationFrame(resizeRaf)
    resizeRaf = null
  }
  chartInstance?.dispose()
  chartInstance = null
  lastDevicePixelRatio = null
})
</script>

<style scoped lang="scss">
.stacked-bar-chart {
  width: 100%;
  height: 100%;
  position: relative;

  .stacked-bar-chart-container {
    width: 100%;
    height: 100%;
  }
}
</style>
