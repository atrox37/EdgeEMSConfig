# 主题颜色变更日志

本文档记录了从深色主题改为浅色主题的所有变更，方便后续撤销和修改。

## 变更日期
2024年（当前日期）

## 📋 快速查找索引

- [1. 全局样式变量](#1-全局样式变量-srcassetsstyles_variablesscss)
- [2. 全局CSS](#2-全局css-srcassetsmaincss)
- [3. Element Plus主题变量](#3-element-plus-主题变量-srcassetsstyleselementtheme-varsscss)
- [4. 按钮样式](#4-按钮样式-srcassetsstyleselementele-buttonscss) ⭐ **重要：Warning按钮变更**
- [5. 侧边栏](#5-侧边栏-srclayoutsidebarvue)
- [6. 菜单样式](#6-菜单样式-srcassetsstyleselementele-menuscss)
- [7. 输入框样式](#7-输入框样式-srcassetsstyleselementele-inputscss)
- [8. 选择框样式](#8-选择框样式-srcassetsstyleselementele-selectscss)
- [9. 表格样式](#9-表格样式-srcassetsstyleselementele-tablescss)
- [10. 开关样式](#10-开关样式-srcassetsstyleselementele-switchscss)
- [11. 消息组件样式](#11-消息组件样式-srcassetsstyleselementele-messagescss)
- [12. TitleBar组件](#12-titlebar组件-srclayouttitlebarvue)
- [13. MainLayout组件](#13-mainlayout组件-srclayoutmainlayoutvue)
- [撤销方法](#撤销方法)
- [重要变更摘要](#重要变更摘要)

---

## 1. 全局样式变量 (`src/assets/styles/_variables.scss`)

### 文本颜色
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$text-color-primary` | `$white-alpha-100` (白色) | `#000000` (黑色) | 主要文本颜色 |
| `$text-color-white-60` | `$white-alpha-60` (白色60%) | `rgba(0, 0, 0, 0.6)` (黑色60%) | 次要文本颜色 |
| `$text-color-white-40` | `$white-alpha-40` (白色40%) | `rgba(0, 0, 0, 0.4)` (黑色40%) | 次要文本颜色 |
| `$text-color-white-20` | `$white-alpha-20` (白色20%) | `rgba(0, 0, 0, 0.2)` (黑色20%) | 次要文本颜色 |
| `$text-color-white-10` | `$white-alpha-10` (白色10%) | `rgba(0, 0, 0, 0.1)` (黑色10%) | 次要文本颜色 |
| `$text-color-white-05` | `$white-alpha-05` (白色5%) | `rgba(0, 0, 0, 0.05)` (黑色5%) | 次要文本颜色 |

### 背景颜色
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$bg-color-page` | `#000000` (黑色) | `#ffffff` (白色) | 页面背景 |
| `$bg-color-overlay` | `#1a1a1a` (深灰色) | `#f5f5f5` (浅灰色) | 覆盖层背景 |
| `$bg-color-input` | `rgba(60, 60, 60, 0.5)` (深灰色半透明) | `rgba(245, 245, 245, 0.8)` (浅灰色半透明) | 输入框背景 |
| `$bg-color-dark` | `#0a0a0a` (接近黑色) | `#ffffff` (白色) | 深色背景 |
| `$bg-color-dark-1` | `#1a1a1a` (深灰色1) | `#fafafa` (浅灰色1) | 背景色变体1 |
| `$bg-color-dark-2` | `#2a2a2a` (深灰色2) | `#f5f5f5` (浅灰色2) | 背景色变体2 |
| `$bg-color-dark-3` | `#1f1f1f` (深灰色3) | `#f0f0f0` (浅灰色3) | 背景色变体3 |
| `$bg-color-dark-4` | `#333333` (深灰色4) | `#e8e8e8` (浅灰色4) | 背景色变体4 |
| `$bg-color-dark-5` | `#404040` (中灰色) | `#d9d9d9` (中灰色) | 背景色变体5 |
| `$bg-color-dark-6` | `rgba(0, 0, 0, 0.7)` (半透明黑色) | `rgba(255, 255, 255, 0.9)` (半透明白色) | 背景色变体6 |
| `$bg-color-dark-7` | `rgba(0, 0, 0, 0.5)` (半透明黑色) | `rgba(255, 255, 255, 0.95)` (半透明白色) | 背景色变体7 |
| `$bg-color-dark-8` | `rgba(0, 0, 0, 0.6)` (半透明黑色) | `rgba(255, 255, 255, 0.85)` (半透明白色) | 背景色变体8 |
| `$bg-color-dark-9` | `rgba(40, 40, 40, 0.8)` (半透明深灰色) | `rgba(250, 250, 250, 0.95)` (半透明浅灰色) | 背景色变体9 |
| `$bg-color-dark-10` | `rgba(40, 40, 40, 0.3)` (半透明深灰色) | `rgba(245, 245, 245, 0.8)` (半透明浅灰色) | 背景色变体10 |
| `$bg-color-dark-11` | `rgba(60, 60, 60, 0.1)` (半透明灰色) | `rgba(240, 240, 240, 0.6)` (半透明浅灰色) | 背景色变体11 |
| `$bg-color-dark-12` | `rgba(60, 60, 60, 0.4)` (半透明灰色) | `rgba(232, 232, 232, 0.8)` (半透明浅灰色) | 背景色变体12 |

### 边框颜色
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$border-color-base` | `rgba(100, 100, 100, 0.3)` (深灰色) | `rgba(200, 200, 200, 0.5)` (浅灰色) | 基础边框 |
| `$border-color-white-10` | `$white-alpha-10` (白色10%) | `rgba(0, 0, 0, 0.1)` (黑色10%) | 边框变体1 |
| `$border-color-white-20` | `$white-alpha-20` (白色20%) | `rgba(0, 0, 0, 0.2)` (黑色20%) | 边框变体2 |
| `$border-color-white-30` | `$white-alpha-30` (白色30%) | `rgba(0, 0, 0, 0.3)` (黑色30%) | 边框变体3 |
| `$border-color-dark-60` | `rgba(60, 60, 60, 0.6)` (深色边框) | `rgba(200, 200, 200, 0.8)` (浅色边框) | 边框变体4 |
| `$border-color-gray` | `#666666` (深灰色) | `#d9d9d9` (浅灰色) | 灰色边框 |
| `$border-color-gray-light` | `#888888` (浅灰色) | `#e8e8e8` (更浅灰色) | 浅灰色边框 |
| `$border-color-gray-dark` | `#444444` (深灰色) | `#bfbfbf` (中灰色) | 深灰色边框 |
| `$border-color-gray-darker` | `#333333` (更深灰色) | `#b3b3b3` (稍深灰色) | 更深灰色边框 |
| `$border-color-gray-lightest` | `#999999` (最浅灰色) | `#f0f0f0` (最浅灰色) | 最浅灰色边框 |

### 滚动条颜色
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$scrollbar-track-bg` | `rgba(40, 40, 40, 0.3)` (深色) | `rgba(240, 240, 240, 0.5)` (浅色) | 滚动条轨道 |
| `$scrollbar-thumb-bg` | `rgba(100, 100, 100, 0.4)` (深灰色) | `rgba(200, 200, 200, 0.6)` (浅灰色) | 滚动条滑块 |
| `$scrollbar-thumb-hover-bg` | `rgba(100, 100, 100, 0.6)` (深灰色) | `rgba(180, 180, 180, 0.8)` (浅灰色) | 滚动条滑块悬停 |
| `$scrollbar-thumb-dark` | `rgba(80, 80, 80, 0.3)` (深色) | `rgba(220, 220, 220, 0.5)` (浅色) | 滚动条滑块变体 |
| `$scrollbar-thumb-dark-hover` | `rgba(80, 80, 80, 0.5)` (深色) | `rgba(200, 200, 200, 0.7)` (浅色) | 滚动条滑块悬停变体 |

### 渐变边框
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$border-gradient-base` | `rgba(100, 100, 100, ...)` (深灰色渐变) | `rgba(200, 200, 200, ...)` (浅灰色渐变) | 基础渐变边框 |
| `$border-gradient-menu` | `rgba(100, 100, 100, ...)` (深灰色渐变) | `rgba(200, 200, 200, ...)` (浅灰色渐变) | 菜单渐变边框 |

### 渐变按钮
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$gradient-info-button` | `linear-gradient(135deg, $info-color 0%, #666666 100%)` | `linear-gradient(135deg, $info-color 0%, #b3b3b3 100%)` | 信息按钮渐变 |
| `$gradient-info-button-hover` | `linear-gradient(135deg, $info-color-hover 0%, #555555 100%)` | `linear-gradient(135deg, $info-color-hover 0%, #999999 100%)` | 信息按钮悬停渐变 |
| `$gradient-info-button-active` | `linear-gradient(135deg, $info-color-active 0%, #444444 100%)` | `linear-gradient(135deg, $info-color-active 0%, #808080 100%)` | 信息按钮激活渐变 |

### 表格变量
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$table-header-bg` | `rgba(40, 40, 40, 0.5)` (深灰色) | `rgba(245, 245, 245, 0.8)` (浅灰色) | 表头背景 |
| `$table-header-color` | `$white-alpha-60` (白色60%) | `rgba(0, 0, 0, 0.85)` (黑色85%) | 表头文字 |
| `$table-row-hover-bg` | `rgba(60, 60, 60, 0.5)` (深灰色) | `rgba(240, 240, 240, 0.8)` (浅灰色) | 行悬停背景 |
| `$table-row-hover-bg-dialog` | `rgba(60, 60, 60, 0.5)` (深灰色) | `rgba(240, 240, 240, 0.8)` (浅灰色) | 对话框行悬停背景 |
| `$table-fixed-column-bg` | `rgba(30, 30, 30, 0.8)` (深灰色) | `rgba(250, 250, 250, 0.95)` (浅灰色) | 固定列背景 |
| `$table-fixed-column-bg-dialog` | `rgba(30, 30, 30, 0.8)` (深灰色) | `rgba(250, 250, 250, 0.95)` (浅灰色) | 对话框固定列背景 |
| `$table-empty-color` | `#888888` (深灰色) | `#999999` (灰色) | 空状态文字 |

### 对话框变量
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$dialog-overlay-bg` | `rgba(0, 0, 0, 0.7)` (黑色遮罩) | `rgba(0, 0, 0, 0.3)` (浅色遮罩) | 对话框遮罩 |
| `$dialog-bg` | `#2b2a2a` (深灰色) | `#ffffff` (白色) | 对话框背景 |

### Popper变量
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$popper-bg-dark` | `#1a1a1a` (深灰色) | `#fafafa` (浅灰色) | Popper背景 |
| `$popper-bg-dark-alt` | `#2a2a2a` (深灰色) | `#f5f5f5` (浅灰色) | Popper替代背景 |
| `$popper-border-color` | `rgba(100, 100, 100, 0.2)` (深灰色) | `rgba(200, 200, 200, 0.5)` (浅灰色) | Popper边框 |

### 设备监控表格变量
| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$vtable-header-bg` | `rgba(40, 40, 40, 0.8)` (深灰色) | `rgba(245, 245, 245, 0.9)` (浅灰色) | 虚拟表格表头背景 |

---

## 2. 全局CSS (`src/assets/main.css`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `body` `color` | `#ffffff` (白色) | `#000000` (黑色) | 全局文字颜色 |
| `body` `background-color` | `#000000` (黑色) | `#ffffff` (白色) | 全局背景颜色 |
| `#app` `background-color` | `#000000` (黑色) | `#ffffff` (白色) | 应用背景颜色 |
| `::-webkit-scrollbar-thumb` `background` | `rgba(100, 100, 100, 0.4)` (深灰色) | `rgba(200, 200, 200, 0.6)` (浅灰色) | 滚动条滑块 |
| `.node-vars-bubble-fixed` `background` | `rgba(30, 30, 30, 0.95)` (深灰色) | `rgba(255, 255, 255, 0.95)` (白色) | 变量浮层背景 |
| `.node-vars-bubble-fixed` `border` | `rgba(100, 100, 100, 0.5)` (深灰色) | `rgba(200, 200, 200, 0.5)` (浅灰色) | 变量浮层边框 |
| `.node-vars-bubble__left .var-item` `color` | `#ffffff` (白色) | `#000000` (黑色) | 变量项文字 |
| `.node-vars-bubble__right` `color` | `#fff` (白色) | `#000000` (黑色) | 变量值文字 |

---

## 3. Element Plus 主题变量 (`src/assets/styles/element/theme-vars.scss`)

| 变量名 | 原始值 | 修改后值 | 说明 |
|--------|--------|----------|------|
| `$text-color-primary` | `$white-alpha-100` (白色) | `#000000` (黑色) | 主要文本颜色 |
| `$bg-color-page` | `#000000` (黑色) | `#ffffff` (白色) | 页面背景 |
| `$bg-color-overlay` | `#1a1a1a` (深灰色) | `#f5f5f5` (浅灰色) | 覆盖层背景 |
| `$bg-color-input` | `rgba(60, 60, 60, 0.5)` (深灰色) | `rgba(245, 245, 245, 0.8)` (浅灰色) | 输入框背景 |
| `$border-color-base` | `rgba(100, 100, 100, 0.3)` (深灰色) | `rgba(200, 200, 200, 0.5)` (浅灰色) | 基础边框 |

---

## 4. 按钮样式 (`src/assets/styles/element/ele-button.scss`)

### 基础按钮
| 属性 | 原始值 | 修改后值 | 说明 |
|------|--------|----------|------|
| `.el-button` `color` | `$text-color-primary` (白色) | `#000000` (黑色) | 默认按钮文字 |
| `.el-button` `&:active` `background` | `$bg-color-transparent-white-10` | `rgba(0, 0, 0, 0.1)` | 激活状态背景 |
| `.el-button .el-icon` `color` | (未设置) | `#000000 !important` | 按钮图标颜色 |
| `.el-button img` `filter` | (未设置) | `brightness(0) saturate(100%)` | 按钮图片转黑色 |

### Primary按钮（保持不变）
| 属性 | 值 | 说明 |
|------|-----|------|
| `.el-button--primary` `color` | `#ffffff !important` | **保持白色文字**（主题色背景） |

### Warning按钮
| 属性 | 原始值 | 修改后值 | 说明 |
|------|--------|----------|------|
| `.el-button--warning` `background` | `$bg-color-input !important` (`rgba(60, 60, 60, 0.5)` 深灰色半透明) | `$warning-color !important` (`#faad14` 警告色) | **重要变更**：从浅灰色改为警告色背景，与白色背景有明显区分 |
| `.el-button--warning` `color` | `$text-color-primary` (白色 `$white-alpha-100`) | `#000000 !important` (黑色) | 黑色文字 |
| `.el-button--warning:hover` `background` | `$bg-color-dark-12 !important` (`rgba(60, 60, 60, 0.4)` 深灰色) | `$warning-color-hover !important` (`#e6a017` 警告色悬停) | 悬停状态背景 |
| `.el-button--warning:active` `background` | `$bg-color-dark-12 !important` (`rgba(60, 60, 60, 0.4)` 深灰色) | `$warning-color-active !important` (`#d29213` 警告色激活) | 激活状态背景 |

### 其他按钮类型
| 按钮类型 | 属性 | 原始值 | 修改后值 | 说明 |
|----------|------|--------|----------|------|
| `.el-button--info` | `color` | `$text-color-primary` | `#000000 !important` | 黑色文字 |
| `.el-button--default` | `color` | `$text-color-primary` | `#000000 !important` | 黑色文字 |
| `.is-text` | `color` | `$text-color-primary` | `#000000 !important` | 黑色文字 |
| `.is-loading .el-icon` | `color` | (未设置) | `#000000 !important` | 加载图标黑色 |
| `.el-button-group .el-icon` | `color` | (未设置) | `#000000 !important` | 按钮组图标黑色 |
| `.el-button-group img` | `filter` | (未设置) | `brightness(0) saturate(100%)` | 按钮组图片转黑色 |

---

## 5. 侧边栏 (`src/layout/Sidebar.vue`)

| 属性 | 原始值 | 修改后值 | 说明 |
|------|--------|----------|------|
| `el-menu` `text-color` | `#fff` (白色) | `#000000` (黑色) | 菜单文字颜色 |
| `el-menu` `active-text-color` | `#fff` (白色) | `#000000` (黑色) | 激活菜单文字颜色 |
| `.sidebar__subMenu-img` `filter` | (未设置) | `brightness(0) saturate(100%)` | 侧边栏图标转黑色 |

---

## 6. 菜单样式 (`src/assets/styles/element/ele-menu.scss`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.el-menu` `color` | `$text-color-primary` (白色) | `#000000` (黑色) | 菜单文字颜色 |
| `.el-menu .el-icon` `color` | (未设置) | `#000000 !important` | 菜单图标颜色 |
| `.el-menu img` `filter` | (未设置) | `brightness(0) saturate(100%)` | 菜单图片转黑色 |
| `.el-menu-item:hover` `color` | `$text-color-primary` (白色) | `#000000` (黑色) | 悬停文字颜色 |
| `.el-menu--inline .el-menu-item` `color` | `$text-color-primary` (白色) | `#000000` (黑色) | 子菜单项文字 |
| `.el-menu--inline .el-menu-item:hover` `background` | `$bg-color-transparent-white-10` | `rgba(0, 0, 0, 0.05)` | 子菜单项悬停背景 |
| `.el-menu--inline .el-menu-item:hover` `color` | `$text-color-primary` (白色) | `#000000` (黑色) | 子菜单项悬停文字 |
| `.el-menu--inline .el-menu-item.is-active` `color` | `$primary-color` | `$primary-color` | **保持不变**（主题色） |

---

## 7. 输入框样式 (`src/assets/styles/element/ele-input.scss`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.el-input__prefix` `color` | `$text-color-secondary` | `#000000 !important` | 前缀图标颜色 |
| `.el-input__suffix` `color` | `$text-color-secondary` | `#000000 !important` | 后缀图标颜色 |
| `.el-input__icon` `color` | (未设置) | `#000000 !important` | 输入框图标颜色 |

---

## 8. 选择框样式 (`src/assets/styles/element/ele-select.scss`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.el-select__suffix .el-icon` `color` | (未设置) | `#000000 !important` | 下拉箭头图标颜色 |
| `$hover-bg` | `$bg-color-transparent-white-10` | `rgba(0, 0, 0, 0.05)` | 悬停背景 |

---

## 9. 表格样式 (`src/assets/styles/element/ele-table.scss`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.el-table__expand-icon > .el-icon` `color` | (未设置) | `#000000 !important` | 展开图标颜色 |
| `.el-pagination .el-icon` `color` | (未设置) | `#000000 !important` | 分页图标颜色 |

---

## 10. 开关样式 (`src/assets/styles/element/ele-switch.scss`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.el-switch__action .el-icon` `color` | (未设置) | `#000000 !important` | 开关图标颜色 |

---

## 11. 消息组件样式 (`src/assets/styles/element/ele-message.scss`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.el-icon.el-message-box__close` `color` | `$text-color-primary` (白色) | `#000000 !important` | 关闭按钮图标颜色 |
| `.el-icon.el-message-box__status` `color` | (未设置) | `#000000 !important` | 状态图标颜色 |
| `.el-icon.el-message__icon` `color` | (未设置) | `#000000 !important` | 消息图标颜色 |
| `.el-message__content` `color` | (未设置) | `#000000 !important` | 消息文字颜色 |
| `.el-icon.el-message__closeBtn` `color` | (未设置) | `#000000 !important` | 消息关闭按钮图标颜色 |

---

## 12. TitleBar组件 (`src/layout/TitleBar.vue`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.titlebar__user-info:hover` `background` | `$white-alpha-10` | `rgba(0, 0, 0, 0.05)` | 用户信息悬停背景 |
| `.titlebar__button:hover` `background` | `$white-alpha-10` | `rgba(0, 0, 0, 0.05)` | 按钮悬停背景 |
| `.titlebar__button:active` `background` | `$white-alpha-20` | `rgba(0, 0, 0, 0.1)` | 按钮激活背景 |

---

## 13. MainLayout组件 (`src/layout/MainLayout.vue`)

| 选择器/属性 | 原始值 | 修改后值 | 说明 |
|------------|--------|----------|------|
| `.main-layout` `background-color` | `$bg-color-page` (已更新为白色) | `$bg-color-page` (白色) | 主布局背景 |

---

## 特殊说明

### 保持不变的元素
1. **Primary按钮文字**：保持白色（`#ffffff`），因为背景是主题色（橙色）
2. **菜单激活项文字**：保持主题色（`$primary-color`），用于突出显示
3. **Windows关闭按钮**：保持标准颜色（`#e81123` 和 `#f1707a`）
4. **主题色（橙色）**：所有 `$primary-color` 相关变量保持不变

### 图标处理方式
- 使用 CSS `filter: brightness(0) saturate(100%)` 将图片图标转为黑色
- 直接设置 `.el-icon` 的 `color` 属性为 `#000000`

---

## 撤销方法

如果需要撤销这些变更，可以：

1. **使用Git**：`git checkout -- <文件路径>` 恢复单个文件
2. **手动替换**：根据上表，将"修改后值"替换回"原始值"
3. **批量替换**：使用编辑器的查找替换功能，按照上表进行批量替换

---

## 注意事项

- 所有使用 `!important` 的样式需要特别注意
- 图标颜色通过两种方式处理：
  - 对于 `.el-icon` 类：直接设置 `color`
  - 对于 `img` 标签：使用 `filter: brightness(0) saturate(100%)`
- **Warning按钮重要变更**：现在使用 `$warning-color` (`#faad14`) 作为背景，与白色背景有明显区分
  - 原始值：`background: $bg-color-input !important` (深灰色半透明 `rgba(60, 60, 60, 0.5)`)
  - 修改后：`background: $warning-color !important` (警告色 `#faad14`)

## 重要变更摘要

### 最关键的变更
1. **Warning按钮背景色**：从 `$bg-color-input` 改为 `$warning-color` (`#faad14`)
2. **所有非主题色按钮文字**：从白色改为黑色 (`#000000`)
3. **所有图标**：从白色改为黑色 (`#000000`)
4. **页面背景**：从黑色 (`#000000`) 改为白色 (`#ffffff`)

### 保持不变的元素
1. **Primary按钮文字**：保持白色 (`#ffffff`)
2. **菜单激活项文字**：保持主题色 (`$primary-color`)
3. **Windows关闭按钮**：保持标准颜色 (`#e81123` 和 `#f1707a`)
