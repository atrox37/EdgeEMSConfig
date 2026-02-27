<template>
  <div class="line-chart">
    <div class="line-chart-container" ref="chartRef"></div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { useGlobalStore } from '@/stores/global'
import { pxToResponsive } from '@/utils/responsive'
const globalStore = useGlobalStore()

// 监听侧边栏折叠状态变化
watch(
  () => globalStore.isCollapse,
  () => {
    nextTick(() => {
      setTimeout(() => {
        chartInstance?.dispose()
        chartInstance = null
        lastDevicePixelRatio = null
        scheduleResize()
      }, 300)
    })
  },
)

echarts.use([LineChart, BarChart, GridComponent, LegendComponent, SVGRenderer])

// 定义数据类型
export interface SeriesData {
  name: string
  data: number[]
  color: string
}

export interface XAxisOption {
  xAxiosData: string[]
  xUnit?: string
}

export interface YAxisOption {
  yUnit?: string
}

// Grid配置接口
export interface GridConfig {
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
  title?: string
  showArea?: boolean
}>(), {
  gridConfig: () => ({
    left: 0,
    right: 0,
    top: 45,
    bottom: 10
  }),
  showArea: false
})

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
  // 取均值，避免极端情况下的浮动
  const s = (sx + sy) / 2
  return Number.isFinite(s) && s > 0 ? s : 1
}

function getGridConfig() {
  return {
    left: pxToResponsive(props.gridConfig.left || 0),
    right: pxToResponsive(props.gridConfig.right || 0),
    top: pxToResponsive(props.gridConfig.top || 45),
    bottom: pxToResponsive(props.gridConfig.bottom || 15),
  }
}

function getChartOption() {
  const xUnit = props.xAxiosOption.xUnit || ''
  const yUnit = props.yAxiosOption.yUnit || ''

  const totalData = props.xAxiosOption.xAxiosData.map((_, index: number) => {
    const valuesAtIndex = props.series.map(s => s.data[index] || 0)
    return Math.max(...valuesAtIndex)
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
      data: props.series.map((s: SeriesData) => s.name),
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
        padding: [0, pxToResponsive(8), 0, 0],
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
          width: pxToResponsive(1),
        },
      },
    }

  // series
  const seriesData = [
    {
      name: 'background',
      type: 'bar',
      barWidth: '70%',
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
    ...props.series.map((s: SeriesData) => ({
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: true,
      symbol: 'circle',
      symbolSize: pxToResponsive(0),
      areaStyle: props.showArea ? {} : undefined,
      lineStyle: {
        color: s.color,
        width: pxToResponsive(4),
      },
      itemStyle: {
        color: s.color,
        borderColor: s.color,
        borderWidth: 2,
      },
      silent: true,
      emphasis: { disabled: true },
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

  // devicePixelRatio 只能在 init 时生效；缩放变化明显时需要重建，否则会糊/尺寸不对
  if (chartInstance && lastDevicePixelRatio && Math.abs(lastDevicePixelRatio - desiredDpr) > 0.15) {
    chartInstance.dispose()
    chartInstance = null
    lastDevicePixelRatio = null
  }

  if (!chartInstance) {
    // 使用 SVG 渲染器，在父容器 transform scale 下不失真
    chartInstance = echarts.init(chartRef.value, {
      renderer: 'svg',
    })
    lastDevicePixelRatio = desiredDpr
  }

  chartInstance.setOption(getChartOption(), {
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
  // 父容器 transform scale 不会触发布局变化，ResizeObserver 可能不触发；用 window resize 兜底
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
.line-chart {
  width: 100%;
  height: 100%;
  position: relative;

  .line-chart-container {
    width: 100%;
    height: 100%;
  }
}
</style>
