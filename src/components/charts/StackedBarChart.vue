<template>
  <div class="stacked-bar-chart">
    <div class="stacked-bar-chart-container" ref="chartRef"></div>
    <div v-if="showToolbox" class="stacked-bar-chart-toolbox">
      <div v-if="showFullScreen" class="stacked-bar-chart-toolbox-item">
        <el-icon>
          <ZoomIn />
        </el-icon>
      </div>
      <div v-if="showDownload" class="stacked-bar-chart-toolbox-item">
        <el-icon>
          <Download />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useGlobalStore } from '@/stores/global'
import { pxToResponsive } from '@/utils/responsive'
import { ZoomIn, Download } from '@element-plus/icons-vue'

const globalStore = useGlobalStore()

echarts.use([BarChart, GridComponent, LegendComponent, CanvasRenderer])

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
  // Grid配置参数
  gridConfig?: GridConfig
  // 全屏模式Grid配置参数
  fullScreenGridConfig?: GridConfig
  // 按钮显示控制
  showToolbox?: boolean
  showFullScreen?: boolean
  showDownload?: boolean
}>(), {
  // 默认值
  gridConfig: () => ({
    left: 0,
    right: 0,
    top: 45,
    bottom: 10
  }),
  fullScreenGridConfig: () => ({
    left: 50,
    right: 50,
    top: 80,
    bottom: 50
  }),
  showToolbox: true,
  showFullScreen: true,
  showDownload: true
})

// Grid配置转换函数
function getGridConfig(isFullScreen: boolean) {
  return isFullScreen ?
    {
      left: pxToResponsive(props.fullScreenGridConfig.left || 0),
      right: pxToResponsive(props.fullScreenGridConfig.right || 0),
      top: pxToResponsive(props.fullScreenGridConfig.top || 45),
      bottom: pxToResponsive(props.fullScreenGridConfig.bottom || 15),
    }
    : {
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

// 统一生成option的方法
function getChartOption({
  isFullScreen = false,
  chartWidth = 600,
}: {
  isFullScreen?: boolean
  chartWidth?: number
}) {
  // 配置参数
  const xUnit = props.xAxiosOption.xUnit || ''
  const yUnit = props.yAxiosOption.yUnit || ''
  const dataCount = props.xAxiosOption.xAxiosData.length

  // 尺寸参数
  const margin = isFullScreen ? pxToResponsive(200) : pxToResponsive(100)
  const barSpacing = isFullScreen
    ? Math.max(pxToResponsive(30), ((chartWidth - margin) * 0.1) / dataCount)
    : Math.max(pxToResponsive(15), ((chartWidth - margin) * 0.1) / dataCount)
  const barWidth = isFullScreen
    ? Math.min(
      pxToResponsive(120),
      (chartWidth - margin - barSpacing * (dataCount - 1)) / dataCount,
    )
    : Math.min(pxToResponsive(60), (chartWidth - margin - barSpacing * (dataCount - 1)) / dataCount)

  // 背景柱
  const totalData = props.xAxiosOption.xAxiosData.map((_, index) => {
    return props.series.reduce((sum, s) => sum + (s.data[index] || 0), 0)
  })

  // legend/grid/axis样式参数
  const legend = isFullScreen
    ? {
      icon: 'circle',
      show: true,
      type: 'plain',
      orient: 'horizontal',
      right: pxToResponsive(50),
      top: pxToResponsive(30),
      selectedMode: false,
      itemWidth: pxToResponsive(20),
      itemHeight: pxToResponsive(20),
      itemGap: pxToResponsive(40),
      textStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: pxToResponsive(18),
        fontFamily: 'Arimo',
        fontWeight: 400,
      },
      data: props.series.map((s) => s.name),
    }
    : {
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

  const grid = getGridConfig(isFullScreen)

  const xAxis = isFullScreen
    ? {
      type: 'category',
      name: xUnit,
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(16),
        padding: [pxToResponsive(15), 0, 0, 0],
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
        fontSize: pxToResponsive(16),
      },
      splitLine: { show: false },
      boundaryGap: true,
    }
    : {
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

  const yAxis = isFullScreen
    ? {
      type: 'value',
      name: yUnit,
      nameTextStyle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(16),
        align: 'right',
        padding: [0, pxToResponsive(12), pxToResponsive(8), 0],
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(16),
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
    : {
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
    chartInstance = echarts.init(chartRef.value, undefined, { devicePixelRatio: desiredDpr })
    lastDevicePixelRatio = desiredDpr
  }

  const chartWidth = chartRef.value.clientWidth || 600
  chartInstance.setOption(getChartOption({ isFullScreen: false, chartWidth }), {
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

  .stacked-bar-chart-toolbox {
    position: absolute;
    top: -0.2rem;
    right: 0;
    display: flex;
    align-items: center;
    gap: 0.1rem;

    .stacked-bar-chart-toolbox-item {
      width: 0.3rem;
      height: 0.3rem;
      color: #ffffff;
      cursor: default;
      pointer-events: none;
    }
  }
}
</style>
