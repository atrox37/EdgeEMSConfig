import type { RouteItem } from "@/types/menu";
import settingIcon from "@/assets/icons/sidebar-setting.svg";

// 工具：安全的异步组件（避免被代理）

export const dynamicRoutes: RouteItem[] = [
  {
    path: "/setting",
    name: "setting",
    meta: {
      isSubMenu: true,
      activeNav: "/setting",
      icon: settingIcon,
      title: "Setting",
      roles: ["Admin"],
    },
    children: [
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
      {
        path: "configuration",
        name: "configuration",
        component: () => import("@/views/Setting/Configuration/index.vue"),
        redirect: "/setting/configuration/channelConfiguration",
        meta: {
          title: "Configuration",
          activeNav: "/setting/configuration",
          roles: ["Admin"],
        },
        children: [
          {
            path: "channelConfiguration",
            name: "channelConfiguration",
            component: () =>
              import(
                "@/views/Setting/Configuration/ChannelConfiguration/index.vue"
              ),
            meta: {
              title: "Channel Configuration",
              activeNav: "/setting/configuration",
              roles: ["Admin"],
            },
          },
          {
            path: "modelConfiguration",
            name: "modelConfiguration",
            component: () =>
              import(
                "@/views/Setting/Configuration/DeviceConfiguration/index.vue"
              ),
            meta: {
              title: "Model Configuration",
              activeNav: "/setting/configuration",
              roles: ["Admin"],
            },
          },
          {
            path: "ruleConfiguration",
            name: "ruleConfiguration",
            component: () =>
              import(
                "@/views/Setting/Configuration/RuleConfiguration/index.vue"
              ),

            meta: {
              title: "Rule Configuration",
              activeNav: "/setting/configuration",
              roles: ["Admin"],
            },
          },
          {
            path: "ruleChainEditor",
            name: "ruleChainEditor",
            component: () =>
              import(
                "@/views/Setting/Configuration/RuleConfiguration/RuleChainEditorView.vue"
              ),
            meta: {
              title: "Rule Chain Editor",
              activeNav: "/setting/configuration/ruleChainEditor",
              roles: ["Admin"],
            },
          },
        ],
      },
    ],
  },
];
