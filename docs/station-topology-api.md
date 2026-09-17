# 边端站点拓扑 API

每台边端网关维护一份站点拓扑。拓扑持久化结构以 [topology-json-single-instance-proposal.md](./topology-json-single-instance-proposal.md) 为准。

## 获取拓扑

`GET /api/station/topology`

响应 `data`：

```json
{
  "station_id": "station",
  "station_name": "Station",
  "description": null,
  "flow_json": {
    "nodes": [],
    "edges": [],
    "fixedBindings": {
      "stationInstanceId": null,
      "environmentInstanceId": null
    }
  },
  "created_at": null,
  "updated_at": null
}
```

未配置时返回空拓扑，不返回 404。

## 保存拓扑

`PUT /api/station/topology`

请求体：

```json
{
  "station_name": "Station",
  "description": "",
  "flow_json": {
    "nodes": [],
    "edges": [],
    "fixedBindings": {
      "stationInstanceId": 1,
      "environmentInstanceId": 2
    }
  }
}
```

保存采用整份覆盖（upsert），响应返回更新后的完整站点拓扑。

## 后端校验

- `flow_json.nodes` 与 `flow_json.edges` 必须为数组。
- 节点 ID、边 ID 必须唯一。
- 节点 `type` 必须为 `product`。
- 节点 `data.instanceId` 必须引用存在的实例，且不得重复绑定。
- 边的两端必须引用存在的节点；不允许自环和重复无向节点对。
- 边 `type` 必须为 `deletable-smoothstep`。
- handle 只允许 `top`、`right`、`bottom`、`left`。
- `fixedBindings.stationInstanceId` 必须引用有效的 Station 实例。

## 运行时数据

拓扑不保存实例名称、产品副本或通道信息：

- 实例信息：`GET /api/instances/list`
- 实例通道：`GET /api/instances/{id}/channel-summary`

页面以 `instanceId` 为唯一关联键，按需加载实时信息。
