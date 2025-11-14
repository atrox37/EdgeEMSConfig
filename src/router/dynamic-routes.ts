import type { RouteItem } from "@/types/menu";
import settingIcon from "@/assets/icons/sidebar-setting.svg";
import ruleIcon from '@/assets/icons/button-rule.svg'
import instanceIcon from '@/assets/icons/button-instance.svg'
import channelIcon from '@/assets/icons/button-channel.svg'
// 工具：安全的异步组件（避免被代理）

export const dynamicRoutes: RouteItem[] = [
  // {
  //   path: "/setting",
  //   name: "setting",
  //   meta: {
  //     isSubMenu: true,
  //     activeNav: "/setting",
  //     icon: settingIcon,
  //     title: "Setting",
  //     roles: ["Admin"],
  //   },
  //   children: [
  // {
  //   path: "systemSetting",
  //   name: "systemSetting",
  //   component: () => import("@/views/Setting/SystemSetting/index.vue"),
  //   meta: {
  //     title: "System Setting",
  //     activeNav: "/setting/systemSetting",
  //     roles: ["Admin"],
  //   },
  // },
  // {
  //   path: "userManagement",
  //   name: "userManagement",
  //   component: () => import("@/views/Setting/UserManagement/index.vue"),
  //   meta: {
  //     title: "User Management",
  //     activeNav: "/setting/userManagement",
  //     roles: ["Admin"],
  //   },
  // },
  // {
  //   path: "configuration",
  //   name: "configuration",
  //   component: () => import("@/views/Setting/Configuration/index.vue"),
  //   redirect: "/setting/configuration/channelConfiguration",
  //   meta: {
  //     title: "Configuration",
  //     activeNav: "/setting/configuration",
  //     roles: ["Admin"],
  //   },
  //   children: [
  {
    path: "/channelConfiguration",
    name: "channelConfiguration",
    component: () =>
      import("@/views/Setting/Configuration/ChannelConfiguration/index.vue"),
    meta: {
      title: "Channel Config",
      activeNav: "/channelConfiguration",
      roles: ["Admin"],
      icon: channelIcon,
    },
  },
  {
    path: "/modelConfiguration",
    name: "modelConfiguration",
    component: () =>
      import("@/views/Setting/Configuration/DeviceConfiguration/index.vue"),
    meta: {
      title: "Model Config",
      activeNav: "/modelConfiguration",
      roles: ["Admin"],
      icon: instanceIcon,
    },
  },
  {
    path: "/ruleConfiguration",
    name: "ruleConfiguration",
    component: () =>
      import("@/views/Setting/Configuration/RuleConfiguration/index.vue"),

    meta: {
      title: "Rule Config",
      activeNav: "/ruleConfiguration",
      roles: ["Admin"],
      icon: ruleIcon,
    },
    children: [
      {
        path: "ruleChainEditor",
        name: "ruleChainEditor",
        component: () =>
          import(
            "@/views/Setting/Configuration/RuleConfiguration/RuleChainEditorView.vue"
          ),
        meta: {
          title: "Rule Chain",
          activeNav: "/ruleConfiguration",
          roles: ["Admin"],
        },
      },
    ],
  },
];

// },
// ],
//   },
// ];
