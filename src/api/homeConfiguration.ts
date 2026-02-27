import { Request } from '@/utils/request'
import type {
  HomepagePointsResponse,
  UpdateHomepagePointRequest,
} from '@/types/homeConfiguration'

const HOMEPAGE_API = '/api/v1/homepage'

/**
 * 获取首页计算点位列表（使用 6005 端口 baseURL）
 * @param limit 每页条数，默认 100
 */
export const getHomepagePoints = (
  limit: number = 100,
): Promise<HomepagePointsResponse> => {
  return Request.get(HOMEPAGE_API, { params: { limit } })
}

/**
 * 修改首页计算点位
 * @param pointId 点位 ID
 * @param data 修改参数
 */
export const updateHomepagePoint = (
  pointId: number,
  data: UpdateHomepagePointRequest,
) => {
  return Request.put(`${HOMEPAGE_API}/${pointId}`, data)
}
