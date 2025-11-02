// 设备监控相关类型定义

// 左侧表格数据类型
export interface LeftTableItem {
  name: string
  value: number
  unit: string
  updateTime: string
}

// 右侧表格数据类型
export interface RightTableItem {
  name: string
  status: number
  updateTime: string
}
