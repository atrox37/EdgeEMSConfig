<template>
  <div class="doughnut-chart">
    <div class="doughnut-chart-container" ref="chartRef"></div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { useGlobalStore } from '@/stores/global'
import { pxToResponsive } from '@/utils/responsive'
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

echarts.use([PieChart, TooltipComponent, LegendComponent, TitleComponent, SVGRenderer])

// 定义数据类型
interface SeriesData {
  name: string
  value: number
  color: string
}

// Grid配置接口
interface GridConfig {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

const props = withDefaults(defineProps<{
  series: SeriesData[]
  title?: string
  radius?: [string, string]
  center?: [string, string]
  gridConfig?: GridConfig
}>(), {
  gridConfig: () => ({
    left: 0,
    right: 0,
    top: 55,
    bottom: 10
  })
})

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 通用tooltip formatter，支持自定义大小
function customTooltipFormatter(
  params: any,
  sizeConfig: {
    width: number
    minHeight: number
    fontSize: number
    itemFontSize: number
    itemLineHeight: number
    dotSize: number
    gap: number
  },
) {
  const { width, minHeight, fontSize, itemFontSize, itemLineHeight, dotSize, gap } = sizeConfig
  const name = params.name || ''
  const value = params.value || 0
  const percent = params.percent || 0

  let html = `
    <div style="
      max-width:${width}px;
      min-height:${minHeight}px;
      display:flex;
      flex-direction:column;
      gap:${gap}px;
    ">
      <div style="
        color:rgba(255,255,255,0.85);
        font-size:${fontSize}px;
        font-family:Arimo;
        font-weight:600;
        width:100%;
        margin-bottom:${gap / 2}px;
      ">${name}</div>
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        font-size:${itemFontSize}px;
        font-family:Arimo;
        color:rgba(255,255,255,0.85);
        line-height:${itemLineHeight}px;
        margin-bottom:${gap / 4}px;
        gap:${gap * 2}px;
      ">
        <div style="display:flex;align-items:center;gap:${gap / 2}px;">
          <span style="
            display:inline-block;
            width:${dotSize}px;
            height:${dotSize}px;
            border-radius:50%;
            background:${params.color};
            margin-right:${dotSize / 2}px;
          "></span>
          <span>数值</span>
        </div>
        <div style="font-weight:600;">${value}</div>
      </div>
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        font-size:${itemFontSize}px;
        font-family:Arimo;
        color:rgba(255,255,255,0.85);
        line-height:${itemLineHeight}px;
        gap:${gap * 2}px;
      ">
        <span>占比</span>
        <div style="font-weight:600;">${percent}%</div>
      </div>
    </div>
  `
  return html
}

function getGridConfig() {
  return {
    left: pxToResponsive(props.gridConfig.left || 0),
    right: pxToResponsive(props.gridConfig.right || 0),
    top: pxToResponsive(props.gridConfig.top || 55),
    bottom: pxToResponsive(props.gridConfig.bottom || 15),
  }
}

function getChartOption({ chartWidth = 600 }: { chartWidth?: number } = {}) {
  // 获取配置参数，使用默认值
  const title = props.title || ''
  const radius = props.radius || ['40%', '70%']
  const center = props.center || ['50%', '50%']

  const tooltipSize = {
    width: pxToResponsive(220),
    minHeight: pxToResponsive(100),
    fontSize: pxToResponsive(14),
    itemFontSize: pxToResponsive(12),
    itemLineHeight: pxToResponsive(18),
    dotSize: pxToResponsive(8),
    gap: pxToResponsive(8),
  }

  const legend = {
      show: true,
      type: 'plain',
      orient: 'horizontal',
      right: 0,
      top: pxToResponsive(10),
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

  const tooltip = {
      trigger: 'item',
      confine: true,
      backgroundColor: '#3f4f75',
      borderColor: 'rgba(255,255,255,0.12)',
      borderWidth: pxToResponsive(1),
      padding: [pxToResponsive(10), pxToResponsive(16), pxToResponsive(10), pxToResponsive(16)],
      extraCssText: `
          border-radius: ${pxToResponsive(8)}px;
          box-shadow: 0 ${pxToResponsive(4)}px ${pxToResponsive(16)}px 0 rgba(0,0,0,0.12);
          max-width: ${pxToResponsive(220)}px;
          min-height: ${pxToResponsive(100)}px;
        `,
      textStyle: {
        fontFamily: 'Arimo',
        fontWeight: 400,
        fontSize: pxToResponsive(12),
        color: 'rgba(255,255,255,0.85)',
        lineHeight: pxToResponsive(18),
      },
      formatter: (params: any) => customTooltipFormatter(params, tooltipSize),
    }

  const titleConfig = {
      text: title,
      left: 'center',
      top: pxToResponsive(10),
      textStyle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'Arimo',
        fontWeight: 500,
        fontSize: pxToResponsive(14),
      },
    }

  const series = [
    {
      name: title || '数据分布',
      type: 'pie',
      radius: radius,
      center: center,
      data: props.series.map((s: SeriesData) => ({
        name: s.name,
        value: s.value,
        itemStyle: {
          color: s.color,
        },
      })),
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: pxToResponsive(12),
        fontFamily: 'Arimo',
        fontWeight: 400,
      },
      labelLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
        },
      },
      emphasis: {
        scale: true,
        scaleSize: pxToResponsive(5),
        label: {
          fontSize: pxToResponsive(14),
          fontWeight: 600,
        },
      },
      animationType: 'scale',
      animationEasing: 'elasticOut',
      animationDelay: (idx: number) => Math.random() * 200,
    },
  ]

  return {
    title: titleConfig,
    grid,
    legend,
    tooltip,
    series,
  }
}

// 初始化echarts
const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) {
    chartInstance.dispose()
  }
  const chartWidth = chartRef.value.clientWidth || 600
  chartInstance = echarts.init(chartRef.value, { renderer: 'svg' })
  chartInstance.setOption(getChartOption({ chartWidth }))
}

// 监听侧边栏折叠状态变化
watch(
  () => globalStore.isCollapse,
  () => {
    nextTick(() => {
      setTimeout(() => {
        chartInstance?.dispose()
        initChart()
      }, 300)
    })
  },
)

const resizeChart = () => {
  setTimeout(() => {
    chartInstance?.resize()
  }, 300)
}

watch(
  () => [props.series, props.title, props.radius, props.center],
  () => {
    initChart()
  },
  { deep: true },
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.doughnut-chart {
  width: 100%;
  height: 100%;
  position: relative;

  .doughnut-chart-container {
    width: 100%;
    height: 100%;
  }
}
</style>
