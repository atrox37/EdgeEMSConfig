# Setting 重构基线（Phase 3.J–L）

> 快照日期：**2026-09-03**  
> 用途：Phase 3.J（大组件拆分）、3.K（单测）、3.L（SCSS 治理）的统一验收起点。  
> 后续每个 Batch PR 完成后，在本文件末尾追加「变更记录」小节。

---

## 1. 验收命令

| 命令 | 用途 | Batch 0 结果 |
|------|------|--------------|
| `pnpm build:type-check` | TypeScript 类型检查（**必过**） | ✅ 通过（~19s） |
| `pnpm exec vitest run` | 单元测试一次性跑完（**推荐**） | ⚠️ 90 passed / 17 failed（见 §5） |
| `pnpm test:unit` | Vitest **watch 模式** | ⛔ 不要用于 CI/验收——进程不会自动退出 |

> **注意：** `package.json` 中 `test:unit` 脚本为 `vitest`（watch）。Batch 0 曾因使用该命令导致终端长时间无输出，看起来像「卡住」。后续验收统一用 `pnpm exec vitest run`。

可选：

```bash
pnpm test:coverage    # vitest run --coverage
pnpm lint             # ESLint
```

---

## 2. PR 粒度约定

每个 PR **只做一件事**，便于 review 与回滚：

| PR 类型 | 示例 | 不应包含 |
|---------|------|----------|
| **Composable** | `useChannelPointsTablesHost.ts` + 接入 1 个消费方 | 同时改 SCSS / 另一个 composable |
| **SCSS partial** | `_rule-card-form.scss` + 2 个表单改 `@use` | 同时抽 composable |
| **Presentation 组件** | `RuleCardVariableSection.vue` | 业务逻辑迁移到 composable（可跟 SCSS PR 合并） |
| **常量提取** | `constants/ruleCardPalette.ts` | Flow 事件 handler 重构 |

### 每个 PR 检查清单

```markdown
[ ] pnpm build:type-check 通过
[ ] 若含 composable：pnpm exec vitest run 通过（或新增/更新对应测试）
[ ] 未新增 src/components/pointTable/* UI 组件
[ ] 未改 API 字段名 / 路由 / 产品映射
[ ] 手工冒烟：本 PR 影响的 1–2 条路径（见 §4）
[ ] 目标文件行数下降；无新增 >500 行业务 Vue（composable 除外）
```

---

## 3. 行数快照

### 3.1 Phase 3.J 主要目标文件

| 文件 | 总行 | 模板 | 脚本 | 样式 | Batch 目标 |
|------|------|------|------|------|------------|
| `RuleConfiguration/RuleChainEditorView.vue` | **501** | ~213 | ~275 | ~13 | ≤900 ✅ |
| `VisualModeling/index.vue` | **487** | ~71 | ~410 | ~6 | ≤850 ✅ |
| `RuleConfiguration/.../FunctionSwitchForm.vue` | **865** | ~283 | ~121 | ~456 | ≤250 |
| `RuleConfiguration/.../ActionChangeValue.vue` | **727** | ~200 | ~120 | ~402 | ≤220 |
| `ChannelConfiguration/components/PointsTablesDialog.vue` | **810** | ~91 | ~603 | ~111 | ≤350 |
| `ChannelConfiguration/PointsTables.vue` | **710** | ~74 | ~470 | ~161 | ≤350 |
| `ChannelConfiguration/components/PointTablePoints.vue` | **684** | ~180 | ~501 | 0 | ≤350 |
| `ChannelConfiguration/components/PointTableMappings.vue` | ~438 | — | — | — | 暂不强制 |
| `DeviceConfiguration/PointsTables.vue` | **585** | ~74 | ~350 | ~161 | ≤300 |
| `DeviceConfiguration/components/PointsTablesDialog.vue` | **628** | ~91 | ~420 | ~111 | ≤320 |
| `DeviceConfiguration/components/DevicePointTablePoints.vue` | ~297 | — | — | — | 已达标 |
| `DeviceConfiguration/components/DevicePointTableRouting.vue` | **318** | — | — | — | 已达标 |

> 模板/脚本/样式列为 Batch 0 前次分析估算；总行数为 2026-09-03 文件末尾行号。

### 3.2 已抽取 Composable（基线）

| 文件 | 行数 | 职责 |
|------|------|------|
| `composables/usePointsTablesPage.ts` | 206 | viewMode / publish / filter UI 状态 |
| `composables/usePointTableFilters.ts` | — | 四表筛选 + 分页 |
| `composables/usePointPublish.ts` | — | 发布模式 |
| `composables/usePointNumericCellInput.ts` | — | 数值单元格输入 |
| `composables/rule/useRuleMonitorRuntime.ts` | ~346 | 规则监视 WS + 变量浮层 |
| `composables/rule/useRuleFlowConnections.ts` | ~86 | 连线规则 |
| `composables/rule/useRuleFlowChangeHandlers.ts` | ~143 | Flow 变更副作用 + start/end 保护 |
| `composables/rule/useRuleChainEditLifecycle.ts` | ~342 | 保存/导入/导出/模式切换/历史 |
| `constants/ruleCardPalette.ts` | ~77 | 规则卡片调色板常量 |
| `assets/styles/components/_rule-chain-editor.scss` | ~366 | RuleChainEditorView 样式 mixin |
| `composables/rule/useFunctionSwitchRules.ts` | — | FunctionSwitch 规则段 |
| `composables/rule/useFunctionSwitchVariables.ts` | — | 变量段（两表单共用） |
| `composables/rule/useActionChangeValueRules.ts` | — | ActionChangeValue 规则段 |
| `composables/deviceRouting/useDeviceRoutingEditor.ts` | — | Device Routing 编辑 |
| `composables/deviceRouting/useDeviceRoutingCsvImport.ts` | — | Routing CSV 导入 |
| `views/VisualModeling/composables/useVisualModelingFlowCore.ts` | ~222 | Flow 状态/删除/变更 |
| `views/VisualModeling/composables/useVisualModelingConnections.ts` | — | 连线/边事件 |
| `views/VisualModeling/composables/useVisualModelingImportExport.ts` | — | 导入导出 |
| `views/VisualModeling/composables/useVisualModelingGroupExpansion.ts` | — | 组展开/图片 enrich |
| `views/VisualModeling/composables/useVisualModelingEditLifecycle.ts` | ~505 | 编辑生命周期/保存/初始化 |
| `assets/styles/components/_visual-modeling-editor.scss` | ~103 | VisualModeling 样式 mixin |
| `assets/styles/components/_points-tables-host.scss` | ~370 | PointsTables 页/Dialog 布局 mixin |

### 3.3 Point-table UI 层（已冻结，不再扩展）

| 组件 | 说明 |
|------|------|
| `components/pointTable/PointTableShell.vue` | 布局 + 唯一样式入口 + 表格 body 高度 provide |
| `components/pointsTables/PointsTablesStatusFilter.vue` | 编辑态 modified/invalid 筛选器（自持 scoped 样式） |
| `PointTableToolbar` / `Cell` / `Pagination` | 工具栏、单元格、分页 |
| `composables/usePointTableBodyHeight.ts` | inject `PointTableShell` 提供的 el-table 高度 |
| `PointTableOpBtn` / `OpCell` / `PublishCell` | 操作列 |
| `constants/pointTable.ts` | BEM 列/popper/cell 常量 |
| `assets/styles/components/_point-table.scss` | BEM 样式 + host layout mixin |

**Setting SCSS partial 入口（Batch L）：**

| Partial | Mixin | 消费方 |
|---------|-------|--------|
| `_point-table.scss` | `point-table-styles()` / `point-table-host-layout()` | `PointTableShell`、Tab 面板 |
| `_points-tables-host.scss` | `points-tables-page-shell()` / `points-tables-page-tabs-host()` / `points-tables-point-table-overrides()` | Channel/Device `PointsTables.vue` |
| `_points-tables-host.scss` | `points-tables-dialog-config-section()` | Channel `PointsTablesDialog.vue` |
| `_points-tables-host.scss` | `points-tables-device-dialog-global()` | Device `PointsTablesDialog.vue` |
| `_rule-card-form.scss` | `rule-card-form-host()` | FunctionSwitch / ActionChangeValue |
| `_rule-chain-editor.scss` | `rule-chain-editor-host()` | `RuleChainEditorView.vue` |
| `_visual-modeling-editor.scss` | `visual-modeling-editor-host()` | `VisualModeling/index.vue` |

### 3.4 Setting 其他大文件（本次 Backlog，不在 Phase 3.J 范围）

| 文件 | 约行数 |
|------|--------|
| `HomeConfiguration/HomeView/HomeBg.vue` | ~952 |
| `ChannelConfiguration/index.vue` | ~920 |
| `HomeConfiguration/components/PointConfigDialog.vue` | ~807 |
| `SystemConfig/MqttView.vue` | ~790 |

---

## 4. 手工冒烟清单（固定 4 条路径）

每次 Batch PR 合并前，至少覆盖 **与本 PR 相关的路径**；Batch 收尾时跑完全部 4 条。

### 4.1 Channel PointsTables 页 + Dialog

**入口：**

- 页：`Setting → Configuration → Channel Configuration → 某 Channel → Points Tables`
- Dialog：Channel 列表 → 打开 Points Tables 对话框

**检查项：**

- [ ] 四 Tab（Telemetry / Signal / Control / Adjustment）切换正常
- [ ] Points ↔ Mappings 视图切换；未保存时拦截提示
- [ ] 编辑模式：增删改行、状态筛选、invalid 筛选
- [ ] 发布模式：改值 → Submit / Discard；关闭 Dialog 时 dirty 拦截
- [ ] WS 实时值更新（有后端时）
- [ ] Save / Submit 成功后状态重置

### 4.2 Device PointsTables 页 + Dialog

**入口：**

- 页：`Setting → Configuration → Device Configuration → 某 Instance → Points Tables`
- Dialog：Instance 详情 → Points Tables

**检查项：**

- [ ] P / M / A Tab + Routing 视图切换
- [ ] Points 编辑、Routing 编辑、CSV 导入（如有）
- [ ] Execute / Save routing；发布与 dirty 拦截逻辑
- [ ] Dialog open/close / beforeClose 与页行为一致

### 4.3 RuleChain 编辑 / 监视切换

**入口：** `Setting → Configuration → Rule Configuration → 打开某规则链`

**检查项：**

- [ ] 监视模式：节点状态、变量浮层、WS 推送
- [ ] 进入编辑：拖拽卡片、连线、删节点（start/end 不可删）
- [ ] Undo / Redo / Auto Layout / Fit View / MiniMap
- [ ] Save / Cancel / Restore；Import / Export JSON
- [ ] 未保存离开拦截

### 4.4 VisualModeling 导入导出 + 保存

**入口：** `Visual Modeling`（站点拓扑编辑器）

**检查项：**

- [ ] 加载已有拓扑；拖拽节点、连线、Container 投放
- [ ] 组展开/折叠；节点图片显示
- [ ] Import JSON / Export JSON
- [ ] Edit 模式 Save；Restore to saved
- [ ] 校验问题 Dialog（TopologyIssues）
- [ ] 未保存路由离开拦截

---

## 5. 测试基线（Batch 0）

`pnpm exec vitest run` 结果：**27 files，139 tests — 122 passed，17 failed**

新增 Setting 单测 32 用例全部通过；失败仍为**工作区原有问题**（与 Phase 3 改动无关）：

| 失败文件 | 失败数 | 摘要 |
|----------|--------|------|
| `utils/__tests__/responsive.test.ts` | 3 | 导出函数不存在（API 已变） |
| `composables/__tests__/useTableData.test.ts` | 3 | 测试与 composable API 不同步 |
| `stores/__tests__/global.test.ts` | 3 | `ref is not defined`（store 缺 import） |
| `components/card/__tests__/BatteryCard.test.ts` | 4 | `computed is not defined` |
| `components/__tests__/UpdateChecker.test.ts` | 1 | dialog 关闭断言 |
| `utils/__tests__/websocket.test.ts` | 1 | `subscribePage` 不存在 |
| `utils/__tests__/directives.test.ts` | 1 | permission 行为变化 |
| `utils/__tests__/containerDropTarget.test.ts` | 1 | ESS 投放规则变化 |

**Phase 3.K 策略：** 新增 Setting 相关测试（`usePointsTablesPage`、`useChannelPointsTablesHost` 等）；旧失败测试单独开 issue/PR 修复，不阻塞 3.J 拆分。

**当前 Setting 专用单测：** 4 个文件 / 32 个用例（`usePointsTablesPage`、`useChannelPointsTablesHost`、`useDevicePointsTablesHost`、`usePointTableFilters`）

| 测试文件 | 用例数 | 覆盖点 |
|----------|--------|--------|
| `usePointsTablesPage.test.ts` | 13 | 视图切换、筛选、发布模式、Tab 拦截、取消编辑 |
| `useChannelPointsTablesHost.test.ts` | 7 | 编辑/取消恢复、提交 payload、loadContext、reset |
| `useDevicePointsTablesHost.test.ts` | 8 | Routing 视图、发布、Routing 提交、channels 加载 |
| `usePointTableFilters.test.ts` | 4 | signal/status/invalid 筛选、分页重置 |

---

## 6. Batch 路线图（摘自规划）

| Batch | 内容 | 状态 |
|-------|------|------|
| **0** | 基线文档 + 验收命令 + 冒烟清单 | ✅ 本文档 |
| **1** | `useChannelPointsTablesHost` / `useDevicePointsTablesHost` | ✅ 2026-09-04 |
| **2** | `useChannelPointTableEditor` | ✅ 2026-09-04 |
| **3** | 规则表单 SCSS + section 组件 | ✅ 2026-09-04 |
| **4** | RuleChain 常量 + lifecycle + SCSS | ✅ 2026-09-04 |
| **5** | VisualModeling edit lifecycle（可选） | ✅ 2026-09-04 |
| **K** | Setting 单测（与 1–3 并行） | ✅ 2026-09-04 |
| **L** | SCSS 全局治理收尾 | ✅ 2026-09-04 |

---

## 7. 变更记录

| 日期 | Batch | 说明 |
|------|-------|------|
| 2026-09-04 | 样式修复 | Point Table 布局回归：StatusFilter 自持样式、`point-table-overrides`、Shell ResizeObserver 高度、cell BEM 补全；build:type-check ✅ |
| 2026-09-04 | L | `_points-tables-host.scss`；Channel/Device PointsTables 页+Dialog+Template Detail 去重 SCSS；type-check ✅ |
| 2026-09-04 | K | Setting 单测 4 文件 32 用例；新增 composableTestUtils；type-check ✅ |
| 2026-09-04 | 5 | `useVisualModelingEditLifecycle` + `_visual-modeling-editor.scss`；VisualModeling/index 948→487；type-check ✅ |
| 2026-09-04 | 4 | `ruleCardPalette.ts` + `useRuleFlowChangeHandlers` + `useRuleChainEditLifecycle` + `_rule-chain-editor.scss`；RuleChainEditorView 1325→501；type-check ✅ |
| 2026-09-04 | 3 | `_rule-card-form.scss` + 6 section 组件；FunctionSwitch 865→171、ActionChangeValue 727→171；type-check ✅ |
| 2026-09-04 | 2 | `useChannelPointTableEditor`；PointTablePoints 684→301 行；type-check ✅ |
| 2026-09-04 | 1 | Channel/Device PointsTables host composable；Page/Dialog 接入；type-check ✅ |
| 2026-09-03 | 0 | 初始基线：type-check ✅；vitest run 90/107；行数快照与冒烟清单 |
