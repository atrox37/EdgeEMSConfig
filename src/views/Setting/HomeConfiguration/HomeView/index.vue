<template>
  <div class="voltage-class home" :class="{ 'home--editing': props.isEditing }">
    <!-- <EnergyBgCopy></EnergyBgCopy> -->
    <div class="home-left">
      <div class="home-left-top">
        <div
          v-for="item in energyDashboardList"
          :key="item.pointId"
          class="configurable-card home-left-top-item"
          :class="{ 'edit-ring': props.isEditing }"
          @click="onCardClick(String(item.pointId), item.title)"
        >
          <EnergyCard
            :title="getPointLabel(String(item.pointId), item.title)"
            :icon="getPointIcon(String(item.pointId), item.icon)"
            :value="item.value"
            :unit="getPointUnit(String(item.pointId), (item as any).unit ?? '')"
          />
        </div>
      </div>
      <div class="home-left-middle">
        <!-- <img :src="tuopuSvg" alt="">
          -->
        <HomeBg
          :data="tuopuData"
          :isEditing="props.isEditing"
          :pointIndexMap="props.pointIndexMap"
          :pointConfigs="props.pointConfigs"
          @metricClick="(p) => onCardClick(p.id, p.title)"
        />
      </div>
      <div class="home-left-bottom">
        <div class="home-left-LineChart">
          <ModuleCard title="Power Curve">
            <LineChart
              :xAxiosOption="xAxiosOption"
              :yAxiosOption="lineChartYAxiosOption"
              :series="lineChartSeries"
            />
          </ModuleCard>
        </div>
        <div class="home-left-EnergyChart">
          <ModuleCard title="Energy Chart">
            <StackedBarChart
              :xAxiosOption="xAxiosOption"
              :yAxiosOption="yAxiosOption"
              :series="exampleSeries"
            />
          </ModuleCard>
        </div>
      </div>
    </div>
    <div class="home-right">
      <div class="home-station">
        <ModuleCard title="Station infomation">
          <div class="home-stationList">
            <div v-for="item in stationInfoList" :key="item.pointId" class="home-stationItem">
              <div
                class="configurable-card"
                :class="{ 'edit-ring': props.isEditing }"
                @click.stop="onCardClick(String(item.pointId), item.title)"
              >
                <EnergyCard
                  :title="getPointLabel(String(item.pointId), item.title)"
                  :icon="getPointIcon(String(item.pointId), item.icon)"
                  :value="item.value"
                  :unit="getPointUnit(String(item.pointId), (item as any).unit ?? '')"
                />
              </div>
            </div>
          </div>
        </ModuleCard>
      </div>
      <div class="home-device">
        <ModuleCard title="Device infomation">
          <!-- <div class="home-deviceValue">
              <div class="home-deviceValue-item" v-for="item in deviceInfoList" :key="item.title">
                <span class="deviceValue-item-title">{{ item.title }}:</span>
                <span class="deviceValue-item-value">{{ item.value }}</span>
                &nbsp;
                <span class="deviceValue-item-unit">{{ item.unit }}</span>
              </div>
            </div> -->
          <div class="home-decice-Carousel">
            <el-carousel
              ref="carouselRef"
              :autoplay="false"
              arrow="never"
              indicator-position="none"
              style="width: 100%; height: 100%"
            >
              <el-carousel-item
                v-for="(item, index) in deviceInfoList"
                :key="index"
                style="width: 100%; height: 100%"
              >
                <div class="home-decice-Carousel-item">
                  <div class="home-deviceValue">
                    <div
                      class="home-deviceValue-item"
                      v-for="dataItem in item.data"
                      :key="dataItem.title"
                      :class="{
                        'edit-ring': props.isEditing && isDeviceMetricConfigurable(dataItem.title),
                        'edit-ring--device': props.isEditing && isDeviceMetricConfigurable(dataItem.title),
                        'edit-ring--device-left': props.isEditing && dataItem.title === 'P',
                        'edit-ring--device-right': props.isEditing && dataItem.title === 'U',
                      }"
                      @click="onDeviceMetricClick(item.name, dataItem.title, dataItem.pointId)"
                    >
                      <span class="deviceValue-item-title">{{
                        getPointLabel(String(dataItem.pointId), dataItem.title)
                      }}:</span>
                      <span class="deviceValue-item-value">{{ dataItem.value }}</span>
                      &nbsp;
                      <span class="deviceValue-item-unit">{{
                        getPointUnit(String(dataItem.pointId), dataItem.unit)
                      }}</span>
                    </div>
                  </div>
                  <img :src="item.icon" />
                  <div class="item-name">{{ item.name }}</div>
                </div>
              </el-carousel-item>
            </el-carousel>

            <!-- 自定义左右切换按钮 -->
            <div class="custom-carousel-controls">
              <div class="custom-arrow custom-arrow-left" @click="handlePrev">
                <img :src="arrowLeftImg" alt="Previous" />
              </div>
              <div class="custom-arrow custom-arrow-right" @click="handleNext">
                <img :src="arrowRightImg" alt="Next" />
              </div>
            </div>
          </div>
        </ModuleCard>
      </div>
      <div class="home-alters">
        <ModuleCard title="Alters infomation">
          <div class="home-altersList">
            <!-- <div class="home-altersItem" v-for="item in alterInfoList" :key="item.id">
              <div class="alters__item-name">{{ item.deviceName }}</div>
              <img v-if="item.alterLevel == 'Critical Alarm'" :src="alterL1" class="alters__item-icon" />
              <img v-else-if="item.alterLevel == 'Warning Alarm'" :src="alterL2" class="alters__item-icon" />
              <img v-else-if="item.alterLevel == 'Info Alarm'" :src="alterL3" class="alters__item-icon" />
              <div class="alters__item-msg">{{ item.alterMsg }}</div>
            </div> -->
          </div>
        </ModuleCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyCard } from '@/types/home'

import ModuleCard from '@/components/card/ModuleCard.vue'
import StackedBarChart from '@/components/charts/StackedBarChart.vue'
import LineChart from '@/components/charts/lineChart.vue'

// import alterL1 from '@/assets/icons/home-alter-L1.svg'
// import alterL2 from '@/assets/icons/home-alter-L2.svg'
// import alterL3 from '@/assets/icons/home-alter-L3.svg'

import arrowLeftImg from '@/assets/icons/arrow-left.svg'
import arrowRightImg from '@/assets/icons/arrow-right.svg'

import devicePV from '@/assets/icons/device-pv.svg'
import deviceDiesel from '@/assets/icons/device-diesel.svg'
// import deviceBMS from '@/assets/icons/device-BMS.svg'
// import devicePCS from '@/assets/icons/device-PCS.svg'
import deviceBattery from '@/assets/icons/device-battery.svg'

import iconPvEnergy from '@/assets/icons/icon-pv-energy.svg'
import iconDieselEnergy from '@/assets/icons/icon-diesel-energy.svg'
import iconEnergyUsed from '@/assets/icons/icon-energy-used.svg'
import iconSavingBilling from '@/assets/icons/icon-saving-billing.svg'
import iconEssEnergy from '@/assets/icons/icon-ess-energy.svg'
// import tuopuSvg from '@/assets/icons/home-tuopu.svg'
// import tuopu from '@/assets/icons/tuopu.svg'

import HomeBg from './HomeBg.vue'
import { getIconUrl } from '../iconOptions'
import { HOMEPAGE_POINT_IDS } from '@/types/homeConfiguration'

const props = withDefaults(
  defineProps<{
    isEditing?: boolean
    pointIndexMap?: Record<string, number>
    pointConfigs?: Record<string, { label: string; unit: string; icon?: string }>
  }>(),
  {
    isEditing: false,
  },
)

interface PointRecord {
  id: string
  module: string
  context?: string
  defaultLabel: string
  defaultUnit: string
  defaultIcon?: string
}

const emit = defineEmits<{
  (e: 'cardClick', payload: { id: string; title: string }): void
  (e: 'pointsReady', points: PointRecord[]): void
}>()

const onCardClick = (id: string, title: string) => {
  if (!props.isEditing) return
  emit('cardClick', { id, title })
}

const getPointLabel = (id: string, fallback: string): string => {
  return props.pointConfigs?.[id]?.label ?? fallback
}

const getPointUnit = (id: string, fallback: string): string => {
  return props.pointConfigs?.[id]?.unit ?? fallback
}

const getPointIcon = (id: string, fallback: string): string => {
  const iconName = props.pointConfigs?.[id]?.icon
  if (iconName) {
    const url = getIconUrl(iconName)
    if (url) return url
  }
  return fallback
}

const isDeviceMetricConfigurable = (title: string): boolean => {
  return title === 'P' || title === 'U'
}

const onDeviceMetricClick = (deviceName: string, metricTitle: string, pointId: number) => {
  if (!props.isEditing) return
  if (!isDeviceMetricConfigurable(metricTitle)) return
  emit('cardClick', { id: String(pointId), title: `${deviceName} ${metricTitle}` })
}

const buildPointRecords = () => {
  const points: PointRecord[] = []

  const deviceIconMap: Record<string, string> = {
    PV: 'device-pv',
    'Diesel Generator': 'device-diesel',
    ESS: 'device-battery',
  }

  for (const item of energyDashboardList) {
    points.push({
      id: String(item.pointId),
      module: 'Energy Dashboard',
      defaultLabel: String(item.title),
      defaultUnit: String((item as any).unit ?? ''),
      defaultIcon: (item as any).iconName,
    })
  }

  for (const item of stationInfoList) {
    points.push({
      id: String(item.pointId),
      module: 'Station Information',
      defaultLabel: String(item.title),
      defaultUnit: String((item as any).unit ?? ''),
      defaultIcon: (item as any).iconName,
    })
  }

  for (const device of deviceInfoList as any[]) {
    const deviceIcon = deviceIconMap[device.name] ?? ''
    for (const m of device.data as any[]) {
      if (!isDeviceMetricConfigurable(m.title)) continue
      points.push({
        id: String(m.pointId),
        module: 'Device Information',
        context: String(device.name),
        defaultLabel: String(m.title),
        defaultUnit: String(m.unit ?? ''),
        defaultIcon: deviceIcon || undefined,
      })
    }
  }

  points.push(
    { id: String(HOMEPAGE_POINT_IDS.TOPOLOGY_PV_FIRST), module: 'Topology', context: 'PV', defaultLabel: 'P', defaultUnit: 'kw' },
    { id: String(HOMEPAGE_POINT_IDS.TOPOLOGY_LOAD_FIRST), module: 'Topology', context: 'Load', defaultLabel: 'P', defaultUnit: 'kw' },
    { id: String(HOMEPAGE_POINT_IDS.TOPOLOGY_DIESEL_FIRST), module: 'Topology', context: 'Diesel', defaultLabel: 'P', defaultUnit: 'kw' },
    { id: String(HOMEPAGE_POINT_IDS.TOPOLOGY_DIESEL_SECOND), module: 'Topology', context: 'Diesel', defaultLabel: 'Oil', defaultUnit: '%' },
    { id: String(HOMEPAGE_POINT_IDS.TOPOLOGY_ESS_FIRST), module: 'Topology', context: 'ESS', defaultLabel: 'P', defaultUnit: 'kw' },
    { id: String(HOMEPAGE_POINT_IDS.TOPOLOGY_ESS_SECOND), module: 'Topology', context: 'ESS', defaultLabel: 'SOC', defaultUnit: '%' },
  )

  emit('pointsReady', points)
}

const tuopuData = ref({
  pv: {
    P: '-',
  },
  ess: {
    p: '-',
    soc: '-',
  },
  load: {
    P: '-',
  },
  diesel: {
    p: '-',
    oil: '-',
  },
})
const deviceInfoList = reactive([
  {
    data: [
      { title: 'P', value: '-', unit: 'KW', pointId: HOMEPAGE_POINT_IDS.DEVICE_PV_LEFT },
      { title: 'U', value: '-', unit: 'V', pointId: HOMEPAGE_POINT_IDS.DEVICE_PV_RIGHT },
    ],
    icon: devicePV,
    name: 'PV',
  },
  {
    data: [
      { title: 'P', value: '-', unit: 'KW', pointId: HOMEPAGE_POINT_IDS.DEVICE_DIESEL_LEFT },
      { title: 'U', value: '-', unit: 'V', pointId: HOMEPAGE_POINT_IDS.DEVICE_DIESEL_RIGHT },
    ],
    icon: deviceDiesel,
    name: 'Diesel Generator',
  },
  {
    data: [
      { title: 'P', value: '-', unit: 'KW', pointId: HOMEPAGE_POINT_IDS.DEVICE_ESS_LEFT },
      { title: 'U', value: '-', unit: 'V', pointId: HOMEPAGE_POINT_IDS.DEVICE_ESS_RIGHT },
    ],
    icon: deviceBattery,
    name: 'ESS',
  },
  // {
  //   data: [
  //     {
  //       title: 'P',
  //       value: 45,
  //       unit: 'KW',
  //     },
  //     {
  //       title: 'U',
  //       value: 22,
  //       unit: 'V',
  //     },
  //   ],
  //   icon: devicePCS,
  //   name: 'ESS',
  // },
])
const energyDashboardList = reactive<(EnergyCard & { iconName: string; pointId: number })[]>([
  { title: 'PV Energy', icon: iconPvEnergy, iconName: 'icon-pv-energy', value: '-', unit: 'kWh', pointId: HOMEPAGE_POINT_IDS.ENERGY_FIRST },
  { title: 'Diesel Energy', icon: iconDieselEnergy, iconName: 'icon-diesel-energy', value: '-', unit: 'KWh', pointId: HOMEPAGE_POINT_IDS.ENERGY_SECOND },
  { title: 'Energy Used', icon: iconEnergyUsed, iconName: 'icon-energy-used', value: '-', unit: 'kWh', pointId: HOMEPAGE_POINT_IDS.ENERGY_THIRD },
  { title: 'Saving Billing', icon: iconSavingBilling, iconName: 'icon-saving-billing', value: '-', pointId: HOMEPAGE_POINT_IDS.ENERGY_FOURTH },
])
const stationInfoList = reactive<(EnergyCard & { iconName: string; pointId: number })[]>([
  { title: 'PV', icon: iconPvEnergy, iconName: 'icon-pv-energy', value: '-', unit: 'kW', pointId: HOMEPAGE_POINT_IDS.STATION_FIRST },
  { title: 'Diesel', icon: iconDieselEnergy, iconName: 'icon-diesel-energy', value: '-', unit: 'kW', pointId: HOMEPAGE_POINT_IDS.STATION_SECOND },
  { title: 'ESS', icon: iconEssEnergy, iconName: 'icon-ess-energy', value: '-', unit: 'KWh', pointId: HOMEPAGE_POINT_IDS.STATION_THIRD },
])

// Expose all configurable points (index starts from 1 in parent)
buildPointRecords()

// const alterInfoList = reactive([
//   {
//     id: 1,
//     deviceName: 'ESS',
//     alterLevel: 'Critical Alarm',
//     alterMsg: 'Battery Overvoltage Alarm',
//   },
//   {
//     id: 2,
//     deviceName: 'PV',
//     alterLevel: 'Warning Alarm',
//     alterMsg: 'Battery Overvoltage Alarm',
//   },
//   {
//     id: 3,
//     deviceName: 'Load',
//     alterLevel: 'Info Alarm',
//     alterMsg: 'Battery Overvoltage Alarm',
//   },
// ])

const exampleXAxisData = [
  '0:00',
  '2:00',
  '4:00',
  '6:00',
  '8:00',
  '10:00',
  '12:00',
  '14:00',
  '16:00',
  '18:00',
  '20:00',
  '22:00',
]

const lineChartSeries = [
  {
    name: 'PV',
    data: [10, 35, 20, 80, 60, 180, 120, 300, 180, 250, 90, 40],
    color: 'rgba(105, 203, 255, 1)',
  },
  {
    name: 'ESS',
    data: [500, 420, 480, 350, 370, 320, 400, 220, 300, 120, 200, 60],
    color: 'rgba(29, 134, 255, 1)',
  },
]

const exampleSeries = [
  {
    name: 'Diesel',
    data: [120, 135, 140, 160, 180, 200, 210, 190, 170, 160, 150, 140],
    color: 'rgb(3, 93, 239)',
  },
  {
    name: 'ESS',
    data: [80, 90, 100, 110, 120, 130, 140, 135, 130, 125, 120, 115],
    color: 'rgb(29, 134, 255)',
  },
  {
    name: 'PV',
    data: [0, 10, 30, 60, 100, 130, 150, 140, 120, 80, 30, 5],
    color: 'rgb(105, 203, 255)',
  },
]

const xAxiosOption = {
  xAxiosData: exampleXAxisData,
}

const yAxiosOption = {
  yUnit: 'kWh',
}

const lineChartYAxiosOption = {
  yUnit: 'kW',
}

// Device Information interactions (carousel)
const carouselRef = ref()

const handlePrev = () => {
  carouselRef.value?.prev()
}

const handleNext = () => {
  carouselRef.value?.next()
}
</script>

<style scoped lang="scss">
.home {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  z-index: 2;

  .home::before {
    content: '';
    position: absolute;
    top: -20px;
    left: -20px;
    width: calc(100% + 40px);
    height: calc(100% + 40px);
    background: url('@/assets/images/home-bg.png') no-repeat center center;
    background-size: 100% 100%;
    z-index: 1;
  }

  .home-left {
    position: relative;
    z-index: 2;
    width: calc(100% - 390px);
    height: 100%;
    margin-right: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .home-left-top {
      width: 100%;
      height: 80px;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      z-index: 1;

      .home-left-top-item {
       max-width: 25%;
       padding-right: 10px;
        height: 70px;
        box-sizing: border-box;

        /* Add a bit of inner padding only for the top-left dashboard cards */
        :deep(.card__container) {
          width: 100%;
          padding: 8px 12px;
          box-sizing: border-box;
        }
      }
    }

    .home-left-middle {
      width: 100%;
      height: calc(69% - 120px);
      flex: 1;
      // background-image: url('@/assets/images/tuopu.png');
      // background-size: 100% 100%;
      // background-repeat: no-repeat;
      // background-position: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .home-left-bottom {
      width: 100%;
      height: 30.89%;
      display: flex;
      justify-content: space-between;

      .home-left-EnergyChart {
        width: calc((100% - 20px) / 2);
        height: 100%;
      }

      .home-left-LineChart {
        width: calc((100% - 20px) / 2);
        height: 100%;
      }
    }
  }

  .home-right {
    position: relative;
    z-index: 2;

    width: 370px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;

    .home-station {
      width: 100%;
      height: 36.75%;

      .home-stationList {
        height: 100%;
        padding-top: 20px;

        .home-stationItem {
          height: 33.33%;
          padding-top: 12px;
          padding-bottom: 13px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.2);

          .home-stationItem:last-child {
            border-bottom: none;
            // padding-bottom: 0;
            margin-bottom: 0;
          }
        }
      }
    }

    .home-device {
      width: 100%;
      height: 28.27%;

      .home-decice-Carousel {
        height: 100%;
        width: 100%;

        .home-decice-Carousel-item {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          .home-deviceValue {
            width: 100%;
            padding: 15px 0;
            margin-bottom: 20px;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
            display: flex;
            justify-content: space-between;

            .home-deviceValue-item {
              width: 50%;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              font-size: 16px;
              font-weight: 400;
              color: rgba(255, 255, 255, 0.6);
              height: 16px;

              .deviceValue-item-title {
                font-size: 16px;
                font-weight: 600;
                margin-right: 9px;
              }

              .deviceValue-item-value {
                font-size: 22px;
                font-weight: 700;
                color: #fff;
                line-height: 26px;
              }

              .deviceValue-item-unit {
                font-size: 14px;
                font-weight: 400;
              }
            }
          }

          img {
            width: 120px;
            height: 73px;
            object-fit: contain;
            margin-bottom: 5px;
          }

          .item-name {
            font-size: 18px;
            font-weight: 500;
            line-height: 100%;
            letter-spacing: 0%;
            color: #fff;
          }
        }
      }
    }

    .home-alters {
      height: 30.89%;
      width: 100%;

      .home-altersList {
        height: 100%;
        overflow-y: scroll;
        // 默认隐藏滚动条
        scrollbar-width: none;
        /* Firefox */
        -ms-overflow-style: none;
        /* IE and Edge */

        // Webkit浏览器隐藏滚动条
        .home-altersList::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        // 鼠标悬停时显示滚动条
        .home-altersList:hover {
          scrollbar-width: auto;
          /* Firefox */
          -ms-overflow-style: auto;
          /* IE and Edge */

          .home-altersList:hover::-webkit-scrollbar {
            width: 4px;
            height: 4px;
          }

          .home-altersList:hover::-webkit-scrollbar-thumb {
            border-radius: 2px;
          }
        }

        .home-altersItem {
          min-height: 90px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;

          .alters__item-name {
            width: 40px;
            font-size: 16px;
            font-weight: 700;
            line-height: 16px;
            margin-right: 17px;
          }

          .alters__item-icon {
            width: 46px;
            height: 20px;
            object-fit: contain;
            margin-right: 10px;
          }

          .alters__item-msg {
            font-size: 14px;
            line-height: 16px;
            font-weight: 400;

            .alters__item-msg:last-child {
              border-bottom: none;
            }
          }

          .home-altersItem:last-child {
            border-bottom: none;
          }
        }
      }
    }
  }
}

.configurable-card {
  height: 100%;
}

.home--editing {
  .edit-ring {
    cursor: pointer;
    position: relative;
  }

  /* Normal mark: outline aligns to the target element */
  .edit-ring::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid var(--vt-color-primary);
    border-radius: inherit;
    pointer-events: none;
    box-sizing: border-box;
    inset: -10px -20px;
  }

  /* Device Information: 2x height; keep one side "normal" depending on left/right column */
  .edit-ring--device-left::after, .edit-ring--device-right::after {
    inset: -15px 0; /* top right bottom left */
  }
  .edit-ring--device-left::after {
    border-right-width: 1px;
  }
  .edit-ring--device-right::after {
    border-left-width: 1px;
  }
}

:deep(.el-carousel, .el-carousel .el-carousel__container) {
  height: 100% !important;
}

:deep(.el-carousel .el-carousel__container) {
  height: 100% !important;
}

:deep(.el-carousel__item) {
  display: flex;
  align-items: center;
  justify-content: center;
}

// 自定义carousel控制按钮样式
.custom-carousel-controls {
  width: 100%;
  height: 32px;
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  z-index: 999;
}

.custom-arrow {
  position: absolute;
  width: 32px;
  height: 32px;
  cursor: pointer;

  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  // &:hover {
  //   background-color: rgba(84, 98, 140, 1);
  // }
}

.custom-arrow-left {
  left: 10px;
}

.custom-arrow-right {
  right: 10px;
}

/* 修复被错误嵌套导致失效的首页样式选择器 */
.home::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  width: calc(100% + 40px);
  height: calc(100% + 40px);
  background: url('@/assets/images/home-bg.png') no-repeat center center;
  background-size: 100% 100%;
  z-index: 1;
}

.home .home-right .home-station .home-stationList .home-stationItem:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.home .home-right .home-alters .home-altersList::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.home .home-right .home-alters .home-altersList:hover::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.home .home-right .home-alters .home-altersList:hover::-webkit-scrollbar-thumb {
  border-radius: 2px;
}

</style>
