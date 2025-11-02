import { Request } from '@/utils/request'
import type { ApiResponse } from '@/types/user'
import type {
  DeviceInstanceDetailResponse,
  ProductListResponse,
  DeviceInstanceDetail,
  AddDeviceInstanceDetail,
  InstancePointList,
  InstanceMappingList,
} from '@/types/deviceConfiguration'

export const getInstanceDetail = (
  instanceName: string,
): Promise<ApiResponse<DeviceInstanceDetailResponse>> => {
  return Request.get(`/modApi/api/instances/${instanceName}`)
}
/*
获取产品列表
*/
export const getProducts = (): Promise<ApiResponse<ProductListResponse>> => {
  return Request.get('/modApi/api/products')
}
export const createInstance = (data: AddDeviceInstanceDetail) => {
  return Request.post('/modApi/api/instances', data)
}
export const updateInstance = (data: DeviceInstanceDetail) => {
  return Request.put(`/modApi/api/instances/${data.instance_name}`, data)
}
/*
获取设备实例点位
*/
export const getInstancePoints = (
  instanceName: string,
): Promise<ApiResponse<InstancePointList>> => {
  return Request.get(`/modApi/api/instances/${instanceName}/points`)
}

export const executeAction = (
  instanceName: string,
  data: { value: string | number; point_id: string },
): Promise<ApiResponse<any>> => {
  return Request.post(`/modApi/api/instances/${instanceName}/action`, data)
}

/** 获取设备实例点位映射 */
export const getInstanceMappings = (
  instanceName: string,
): Promise<ApiResponse<InstanceMappingList>> => {
  return Request.get(`/modApi/api/instances/${instanceName}/routing`)
}

/** 按新结构批量更新设备实例映射 */
export const updateInstanceMappings = (
  instanceName: string,
  data: { mappings: any[] },
): Promise<ApiResponse<any>> => {
  return Request.put(`/modApi/api/instances/${instanceName}/mappings`, data)
}
