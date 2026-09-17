import { inject, type Ref } from 'vue'
import { POINT_TABLE_BODY_HEIGHT_KEY } from '@/constants/pointTable'

export function usePointTableBodyHeight(): Ref<number | undefined> | undefined {
  return inject<Ref<number | undefined>>(POINT_TABLE_BODY_HEIGHT_KEY)
}
