import type { Component } from 'vue'

export interface RouteMeta {
  activeNav: string
  icon?: string | Component
  roles: string[]
  title?: string
  isSubMenu?: boolean
}

export interface RouteItem {
  path: string
  name: string
  component?: () => Promise<unknown>
  redirect?: string
  meta: RouteMeta
  children?: RouteItem[]
}
