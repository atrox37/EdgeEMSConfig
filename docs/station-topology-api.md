# 边端站点拓扑 API 说明

> 面向后端实现。当前前端在 `VITE_STATION_TOPOLOGY_MOCK !== 'false'` 时使用本地模拟数据（`localStorage` 键 `mock_station_topology_v1`），接口路径与字段与本文一致。

## 背景

- 每台**边端网关**仅对应 **一个 Station**。
- 可视化建模页编辑的是该站的**拓扑布局**与**节点↔设备实例绑定**。
- **禁止前端写死 `instance_id`**：实例 ID 由 `POST /api/instances` 创建后返回；拓扑中只保存绑定关系。

## 通用约定

| 项 | 说明 |
|----|------|
| Base URL | 与现有 `modApi` 一致，如 `` |
| Content-Type | `application/json` |
| 响应包装 | 与项目统一 `ApiResponse<T>`：`{ success, code, message, data }` |

---

## 1. 获取站点拓扑

**GET** `/api/station/topology`

边端仅一份拓扑，无需路径参数。

### 响应 `data` 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `station_id` | string | 是 | 站点 ID，边端可固定为 `"station"` |
| `station_name` | string | 是 | 展示名称 |
| `description` | string | 否 | 描述 |
| `gateway_id` | string | 否 | 网关标识 |
| `flow_json` | object | 是 | 拓扑图，见下文 |
| `thumbnail` | string | 否 | 缩略图 base64（`data:image/png;base64,...`） |
| `created_at` | string | 是 | ISO8601 |
| `updated_at` | string | 是 | ISO8601 |

### `flow_json` 结构

```json
{
  "nodes": [
    {
      "id": "node-station",
      "type": "station",
      "position": { "x": 420, "y": 20 },
      "data": {
        "label": "Station",
        "productName": "Station",
        "instances": []
      }
    },
    {
      "id": "node-ess",
      "type": "group",
      "position": { "x": 900, "y": 140 },
      "data": {
        "label": "ESS",
        "productName": "ESS",
        "parentName": "Station",
        "isContainer": true,
        "width": 260,
        "height": 180,
        "instances": [
          { "instanceId": 101, "instanceName": "ESS-Container-01", "productName": "ESS" }
        ]
      },
      "style": { "width": "260px", "height": "180px" }
    },
    {
      "id": "node-battery",
      "type": "product",
      "position": { "x": 24, "y": 56 },
      "parentNode": "node-ess",
      "extent": "parent",
      "data": {
        "label": "Battery",
        "productName": "Battery",
        "parentName": "ESS",
        "imageUrl": "...",
        "instances": [
          { "instanceId": 101, "instanceName": "Battery-01", "productName": "Battery" }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "edge-station-ess",
      "source": "node-station",
      "target": "node-ess",
      "sourceHandle": "bottom-source",
      "targetHandle": "top-target"
    }
  ]
}
```

### 节点 `type` 枚举

| type | 说明 |
|------|------|
| `station` | 根节点，每图一个 |
| `group` | 容器（ESS / Generator / Load） |
| `product` | 设备节点，可在容器内（`parentNode`） |

### 边 `source` / `target`

- 语义为 **父节点 → 子节点**（如 `node-station` → `node-ess`）。
- `sourceHandle` / `targetHandle` 保存用户拖拽的锚点（如 `left-source`、`top-target`），前端渲染时原样使用。

---

## 2. 保存站点拓扑

**PUT** `/api/station/topology`

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `station_name` | string | 否 | 更新站名 |
| `description` | string | 否 | 更新描述 |
| `flow_json` | object | 是 | 完整拓扑 |
| `thumbnail` | string | 否 | 缩略图 base64 |

### 响应

返回更新后的完整 `StationTopology`（同 GET `data`）。

### 后端校验建议

1. `flow_json.nodes` 中 `instances[].instanceId` 必须在实例表中存在。
2. `productName` 与实例的 `product_name` 一致。
3. 容器父子关系符合产品树（ESS/Generator/Load 及其子产品）。
4. 边：不允许重复 `(source, target)`；必须满足层级父→子。

---

## 3. 关联接口（已有）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/instances` | 实例列表，供绑定下拉 |
| POST | `/api/instances` | 创建实例，**返回 `instance_id`** |
| PUT | `/api/instances/{id}` | 更新实例 |
| GET | `/api/products` | 产品/父子关系目录 |

---

## 4. 前端模拟数据说明

- 开关：环境变量 `VITE_STATION_TOPOLOGY_MOCK=false` 时走真实 HTTP。
- 默认 mock 在 `src/mock/stationTopologyMock.ts`。
- 预置实例绑定 ID：`101`–`107`（便于与规则配置联调，后端可替换为真实 ID）。

### 模拟响应示例（GET）

```json
{
  "success": true,
  "code": 0,
  "message": "ok (mock)",
  "data": {
    "station_id": "station",
    "station_name": "Edge Station #1",
    "description": "Single-station topology for edge gateway (mock data)",
    "gateway_id": "gw-edge-001",
    "flow_json": { "nodes": [], "edges": [] },
    "created_at": "2026-05-27T10:00:00.000Z",
    "updated_at": "2026-05-27T10:00:00.000Z"
  }
}
```

---

## 5. 与规则/控制的关系

- 规则、触发器、点位配置应 **只引用 `instance_id`**，不引用画布 `node id`。
- 拓扑节点 `id`（如 `vm_node_xxx`）仅用于布局与绑定，换机可保持不变。
- 边端启动时可加载本拓扑，结合实例表生成运行时设备树。

---

## 6. 版本与迁移

| 版本 | 说明 |
|------|------|
| v1 | 单站 `GET/PUT station/topology`，`flow_json` 与现有前端导出 JSON 兼容 |

旧版多方案 `localStorage visual_models` 由前端逐步废弃，统一迁移到本接口。

---

## 7. 前端绑定策略（当前过渡方案）

> 适用于“首页仍有硬编码展示位、实例 ID 不稳定”的阶段。以 Visual Modeling 为主数据源。

### 7.1 绑定主键建议

- **不要依赖固定 `instance_id` 常量**（不同设备环境会变化）。
- 过渡期用 `product_name + instance_name` 作为“可读主键”匹配真实实例。
- 运行时流程：
  1. 先拉取 `/api/instances`；
  2. 建立 `Map<product_name + instance_name, instance_id>`；
  3. 用该映射回填拓扑节点 `data.instances[].instanceId`；
  4. 保存拓扑时写回真实 `instanceId`。

### 7.2 Visual Modeling 优先

- 首页/Home Config 不再单独维护设备绑定关系。
- 首页所需点位上下文（设备、实例）统一从 `flow_json` 派生：
  - 节点 `data.instances` 为设备来源；
  - 节点 `data.productName` 为产品语义；
  - 由此生成首页卡片/拓扑组件的展示数据。

### 7.3 建议新增字段（可选）

为避免仅靠名称匹配，建议在 `instances` 结构中增加一个稳定引用键（后端或前端生成均可）：

```json
{
  "instanceId": 123,
  "instanceName": "battery_01",
  "productName": "Battery",
  "instanceRef": "Battery::battery_01"
}
```

- 新建绑定先写 `instanceRef`；
- 拿到真实 `instanceId` 后再补齐；
- 旧数据兼容：无 `instanceRef` 时回退到 `productName + instanceName`。
