import type { RouteRecordRaw } from 'vue-router'
import ChannelIcon from '@/components/icons/ChannelIcon.vue'
import InstanceIcon from '@/components/icons/InstanceIcon.vue'
import RuleIcon from '@/components/icons/RuleIcon.vue'
import SystemConfigIcon from '@/components/icons/SystemConfigIcon.vue'
import HomeConfigIcon from '@/components/icons/HomeConfigIcon.vue'
// import ModelingIcon from '@/components/icons/ModelingIcon.vue'

export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/setup',
    name: 'firstGatewaySetup',
    component: () => import('../views/SetupView/FirstGatewaySetupView.vue'),
    meta: {
      activeNav: '/setup',
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView/index.vue'),
    meta: {
      activeNav: '/login',
    },
  },
  {
    name: 'main',
    path: '/',
    component: () => import('../layout/MainLayout.vue'),
    redirect: '/channelConfiguration',
    meta: {
      activeNav: '/',
    },
    children: [
      {
        path: '/channelConfiguration',
        name: 'channelConfiguration',
        component: () =>
          import('@/views/Setting/Configuration/ChannelConfiguration/index.vue'),
        meta: {
          title: 'Channel Config',
          activeNav: '/channelConfiguration',
          icon: ChannelIcon,
        },
      },
      {
        path: '/channelConfiguration/pointsTables',
        name: 'channelPointsTables',
        component: () =>
          import('@/views/Setting/Configuration/ChannelConfiguration/PointsTables.vue'),
        meta: {
          title: 'Points Tables',
          activeNav: '/channelConfiguration',
          hidden: true, // 不在侧边栏显示
        },
      },
      {
        path: '/channelConfiguration/templates',
        name: 'channelTemplates',
        component: () =>
          import('@/views/Setting/Configuration/ChannelConfiguration/Templates/index.vue'),
        meta: {
          title: 'Template Management',
          activeNav: '/channelConfiguration',
          hidden: true,
        },
      },
      {
        path: '/channelConfiguration/templates/detail',
        name: 'channelTemplateDetail',
        component: () =>
          import('@/views/Setting/Configuration/ChannelConfiguration/Templates/Detail.vue'),
        meta: {
          title: 'Template Detail',
          activeNav: '/channelConfiguration',
          hidden: true,
        },
      },
      {
        path: '/modelConfiguration',
        name: 'modelConfiguration',
        component: () =>
          import('@/views/Setting/Configuration/DeviceConfiguration/index.vue'),
        meta: {
          title: 'Model Config',
          activeNav: '/modelConfiguration',
          icon: InstanceIcon,
        },
      },
      {
        path: '/modelConfiguration/pointsTables',
        name: 'devicePointsTables',
        component: () =>
          import('@/views/Setting/Configuration/DeviceConfiguration/PointsTables.vue'),
        meta: {
          title: 'Points Tables',
          activeNav: '/modelConfiguration',
          hidden: true,
        },
      },
      {
        path: '/ruleConfiguration',
        name: 'ruleConfiguration',
        component: () =>
          import('@/views/Setting/Configuration/RuleConfiguration/index.vue'),
        meta: {
          title: 'Rule Config',
          activeNav: '/ruleConfiguration',
          icon: RuleIcon,
        },
        children: [
          {
            path: 'ruleChainEditor/:id',
            name: 'ruleChainEditor',
            component: () =>
              import(
                '@/views/Setting/Configuration/RuleConfiguration/RuleChainEditorView.vue'
              ),
            meta: {
              title: 'Rule Chain',
              activeNav: '/ruleConfiguration',
            },
          },
        ],
      },
      {
        path: '/homeConfiguration',
        name: 'homeConfiguration',
        component: () => import('@/views/Setting/HomeConfiguration/index.vue'),
        meta: {
          title: 'Home Config',
          activeNav: '/homeConfiguration',
          icon: HomeConfigIcon,
        },
      },
      // {
      //   path: '/visualModeling',
      //   name: 'visualModeling',
      //   component: () => import('@/views/VisualModeling/index.vue'),
      //   meta: {
      //     title: 'Visual Modeling',
      //     activeNav: '/visualModeling',
      //     icon: ModelingIcon,
      //   },
      // },
      // {
      //   path: '/visualModeling/editor/:id',
      //   name: 'visualModelingEditor',
      //   component: () => import('@/views/VisualModeling/ModelingEditorView.vue'),
      //   meta: {
      //     title: 'Model Editor',
      //     activeNav: '/visualModeling',
      //     hidden: true,
      //   },
      // },
      {
        path: '/systemConfig',
        name: 'systemConfig',
        component: () =>
          import('@/views/Setting/SystemConfig/index.vue'),
        redirect: '/systemConfig/network',
        meta: {
          title: 'System Config',
          activeNav: '/systemConfig',
          icon: SystemConfigIcon,
        },
        children: [
          {
            path: 'network',
            name: 'systemConfigNetwork',
            component: () => import('@/views/Setting/SystemConfig/NetworkPanelView.vue'),
            meta: {
              title: 'Network & LAN',
              activeNav: '/systemConfig',
            },
          },
          {
            path: 'tools',
            name: 'systemConfigTools',
            component: () => import('@/views/Setting/SystemConfig/SystemToolsView.vue'),
            meta: {
              title: 'Files & Upgrade',
              activeNav: '/systemConfig',
            },
          },
          {
            path: 'storage',
            name: 'systemConfigStorage',
            component: () => import('@/views/Setting/SystemConfig/StorageView.vue'),
            meta: {
              title: 'Storage',
              activeNav: '/systemConfig',
            },
          },
          {
            path: 'mqtt',
            name: 'systemConfigMqtt',
            component: () => import('@/views/Setting/SystemConfig/MqttView.vue'),
            meta: {
              title: 'MQTT',
              activeNav: '/systemConfig',
            },
          },
        ],
      },
    ],
  },
]
