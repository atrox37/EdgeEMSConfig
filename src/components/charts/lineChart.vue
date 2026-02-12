<template>
  <div class="line-chart">
    <div class="line-chart-container" ref="chartRef"></div>
    <div v-if="showToolbox" class="line-chart-toolbox">
      <div v-if="showFullScreen" class="line-chart-toolbox-item">
        <el-icon>
          <ZoomIn />
        </el-icon>
      </div>
      <div v-if="showDownload" class="line-chart-toolbox-item">
        <el-icon>
          <Download />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useGlobalStore } from '@/stores/global'
import { pxToResponsive } from '@/utils/responsive'
import { ZoomIn, Download } from '@element-plus/icons-vue'

const globalStore = useGlobalStore()

// 监听侧边栏折叠状态变化
watch(
  () => globalStore.isCollapse,
  () => {
    // 延迟重新绘制，确保DOM更新完成
    nextTick(() => {
      setTimeout(() => {
        chartInstance?.dispose()
        initChart()
      }, 300)
    })
  },
)

echarts.use([LineChart, BarChart, GridComponent, LegendComponent, CanvasRenderer])

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
  // Grid配置参数
  gridConfig?: GridConfig
  // 全屏模式Grid配置参数
  fullScreenGridConfig?: GridConfig
  // 按钮显示控制
  showToolbox?: boolean
  showFullScreen?: boolean
  showDownload?: boolean
  title?: string
  // 是否展示折线下方的区域
  showArea?: boolean
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
    top: 90,
    bottom: 50
  }),
  showToolbox: true,
  showFullScreen: true,
  showDownload: true,
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

// Grid配置转换函数
function getGridConfig(isFullScreen: boolean) {
  return isFullScreen ?
    {
      left: pxToResponsive(props.fullScreenGridConfig.left || 50  ),
      right: pxToResponsive(props.fullScreenGridConfig.right || 50),
      top: pxToResponsive(props.fullScreenGridConfig.top || 90),
      bottom: pxToResponsive(props.fullScreenGridConfig.bottom || 50),
    } : {
      left: pxToResponsive(props.gridConfig.left || 0),
      right: pxToResponsive(props.gridConfig.right || 0),
      top: pxToResponsive(props.gridConfig.top || 45),
      bottom: pxToResponsive(props.gridConfig.bottom || 15),
    }
}

// 统一生成option的方法
function getChartOption({
  isFullScreen = false,
}: {
  isFullScreen?: boolean
}) {
  // 配置参数
  const xUnit = props.xAxiosOption.xUnit || ''
  const yUnit = props.yAxiosOption.yUnit || ''

  // 背景数据 - 取每个索引位置上的最大值
  const totalData = props.xAxiosOption.xAxiosData.map((_, index: number) => {
    // 获取所有系列在当前位置的值，取最大值
    const valuesAtIndex = props.series.map(s => s.data[index] || 0)
    return Math.max(...valuesAtIndex)
  })

  // legend/grid/axis样式参数
  const legend = isFullScreen
    ? {
      icon: 'circle',
      show: true,
      type: 'plain',
      orient: 'horizontal',
      right: pxToResponsive(50),
      top: pxToResponsive(40),
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
      data: props.series.map((s: SeriesData) => s.name),
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
      data: props.series.map((s: SeriesData) => s.name),
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
        padding: [0, pxToResponsive(12), 0, 0],
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
      symbolSize: isFullScreen ? pxToResponsive(8) : pxToResponsive(0),
      areaStyle: props.showArea ? {} : undefined,
      lineStyle: {
        color: s.color,
        width: isFullScreen ? pxToResponsive(6) : pxToResponsive(4),
      },
      itemStyle: {
        color: s.color,
        borderColor: s.color,
        borderWidth: isFullScreen ? 3 : 2,
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
    chartInstance = echarts.init(chartRef.value, {
      renderer: 'canvas',
      devicePixelRatio: desiredDpr,
    })
    lastDevicePixelRatio = desiredDpr
  }

  chartInstance.setOption(getChartOption({ isFullScreen: false }), {
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

  .line-chart-toolbox {
    position: absolute;
    top: -0.2rem;
    right: 0;
    display: flex;
    align-items: center;
    gap: 0.2rem;

    .line-chart-toolbox-item {
      width: 0.14rem;
      height: 0.14rem;
      color: #ffffff;
      cursor: default;
      pointer-events: none;
    }
  }
}
</style>
