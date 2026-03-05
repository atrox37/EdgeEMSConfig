import type { RouteRecordRaw } from 'vue-router'
import ChannelIcon from '@/components/icons/ChannelIcon.vue'
import InstanceIcon from '@/components/icons/InstanceIcon.vue'
import RuleIcon from '@/components/icons/RuleIcon.vue'
import SystemConfigIcon from '@/components/icons/SystemConfigIcon.vue'
import HomeConfigIcon from '@/components/icons/HomeConfigIcon.vue'

export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView/index copy.vue'),
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
        path: '/systemConfig',
        name: 'systemConfig',
        component: () =>
          import('@/views/Setting/SystemConfig/index.vue'),
        meta: {
          title: 'System Config',
          activeNav: '/systemConfig',
          icon: SystemConfigIcon,
        },
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
    ],
  },
]
