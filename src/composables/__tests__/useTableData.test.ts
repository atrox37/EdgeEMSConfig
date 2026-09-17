import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTableData } from '../useTableData'
import type { ApiResponse } from '@/utils/request'

vi.mock('@/utils/request', () => ({
  Request: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

// 构造符合 ApiResponse 结构的 mock 响应
function mockApiResponse<T>(data: T, success = true): ApiResponse<T> {
  return { code: success ? 200 : 500, message: success ? 'ok' : 'error', data, success }
}

describe('useTableData', () => {
  const mockConfig = {
    listUrl: '/test/list',
    defaultPageSize: 20,
    enableDelete: true,
    deleteUrl: '/test/delete/{id}',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { loading, tableData, pagination } = useTableData(mockConfig)

    expect(loading.value).toBe(false)
    expect(tableData.value).toEqual([])
    expect(pagination.page).toBe(1)
    expect(pagination.pageSize).toBe(20)
    expect(pagination.total).toBe(0)
  })

  it('should fetch table data successfully', async () => {
    const mockResponse = mockApiResponse({
      list: [{ id: 1, name: 'test' }],
      total: 1,
    })

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    const { fetchTableData, tableData, pagination } = useTableData(mockConfig)
    await fetchTableData()

    expect(tableData.value).toEqual([{ id: 1, name: 'test' }])
    expect(pagination.total).toBe(1)
    expect(Request.get).toHaveBeenCalledWith('/test/list', expect.any(Object))
  })

  it('should fetch with keyword filter', async () => {
    const mockResponse = mockApiResponse({ list: [], total: 0 })

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    const { filters, fetchTableData } = useTableData(mockConfig)
    filters.keyword = 'test keyword'
    await fetchTableData(true)

    expect(Request.get).toHaveBeenCalledWith(
      '/test/list',
      expect.objectContaining({
        keyword: 'test keyword',
        page: 1,
      }),
    )
  })

  it('should handle pagination changes', async () => {
    const mockResponse = mockApiResponse({ list: [], total: 0 })

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    const { handlePageChange, handlePageSizeChange } = useTableData(mockConfig)

    await handlePageChange(2)
    expect(Request.get).toHaveBeenCalledWith('/test/list', expect.objectContaining({ page: 2 }))

    await handlePageSizeChange(50)
    expect(Request.get).toHaveBeenCalledWith(
      '/test/list',
      expect.objectContaining({ page: 1, page_size: 50 }),
    )
  })

  it('should handle delete row after confirmation', async () => {
    const mockResponse = mockApiResponse(null)
    const { Request } = await import('@/utils/request')
    const { ElMessageBox } = await import('element-plus')
    vi.mocked(Request.delete).mockResolvedValue(mockResponse)
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as never)

    const { deleteRow } = useTableData(mockConfig)
    await deleteRow('1')
    // 删除发生在确认框 resolve 后的异步回调里，等待微任务队列清空
    await vi.waitFor(() => {
      expect(Request.delete).toHaveBeenCalledWith('/test/delete/1')
    })
  })

  it('should fetch with custom filter', async () => {
    const mockResponse = mockApiResponse({ list: [], total: 0 })

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    const { filters, fetchTableData } = useTableData(mockConfig)
    filters.status = 'active'
    await fetchTableData(true)

    expect(Request.get).toHaveBeenCalledWith(
      '/test/list',
      expect.objectContaining({
        status: 'active',
        page: 1,
      }),
    )
  })
})
