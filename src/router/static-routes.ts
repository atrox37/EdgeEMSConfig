import type { RouteRecordRaw } from 'vue-router'
import ChannelIcon from '@/components/icons/ChannelIcon.vue'
import InstanceIcon from '@/components/icons/InstanceIcon.vue'
import RuleIcon from '@/components/icons/RuleIcon.vue'
import SystemConfigIcon from '@/components/icons/SystemConfigIcon.vue'

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
            path: 'ruleChainEditor',
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
    ],
  },
]
