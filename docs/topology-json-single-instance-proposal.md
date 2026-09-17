# 站点拓扑 JSON 约定

站点拓扑采用扁平、无向、单实例结构。Station 与 Environment 只保存固定实例 ID，不作为画布节点。

## 完整结构

```json
{
  "station_id": "station",
  "station_name": "Station",
  "flow_json": {
    "nodes": [
      {
        "id": "vm_node_battery_01",
        "type": "product",
        "position": { "x": 150, "y": 420 },
        "data": {
          "label": "储能电池",
          "description": "",
          "productName": "Battery",
          "instanceId": 203
        }
      },
      {
        "id": "vm_node_meter_01",
        "type": "product",
        "position": { "x": 780, "y": 240 },
        "data": {
          "label": "总电表",
          "description": "交流侧汇集计量。",
          "productName": "Meter",
          "instanceId": 201
        }
      }
    ],
    "edges": [
      {
        "id": "edge-battery-meter",
        "type": "deletable-smoothstep",
        "source": "vm_node_battery_01",
        "target": "vm_node_meter_01",
        "sourceHandle": "right",
        "targetHandle": "left"
      }
    ],
    "fixedBindings": {
      "stationInstanceId": 1,
      "environmentInstanceId": 2
    }
  }
}
```

## 约束

- `station_id` 固定为 `station`，`station_name` 固定为 `Station`。
- 画布节点 `type` 固定为 `product`。
- 每个节点最多绑定一个实例；草稿允许 `instanceId: null`，保存时必须是有效且未被占用的实例 ID。
- 图为无向图；`source` 与 `target` 只满足 Vue Flow 的边端表达，不代表功率方向。
- `sourceHandle` 与 `targetHandle` 只允许 `top`、`right`、`bottom`、`left`。
- 边 `type` 固定为 `deletable-smoothstep`。
- 不允许自环、悬空边、重复无向节点对或重复边 ID。
- Station 必须绑定有效实例；Environment 是否必填由产品配置决定。

## 不持久化字段

不保存 `gateway_id`、`thumbnail`、`viewport`、`imageUrl`、`topologyType`、`isContainer`、`parentNode`、`extent`、`instances[]`、`instanceName`、`channelIds`、`overviewPoints`、边的 `data`、`label`、`animated`、`style`、`sourcePosition`、`targetPosition`。

实例名称、实例所属产品和通信通道均通过实例 API 按 `instanceId` 实时解析。
