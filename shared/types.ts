// API response shapes shared by the Worker and the UI.
import type { Category, MenuItem, OrderStatus } from './menu'

export interface MenuResponse {
  categories: Category[]
  items: MenuItem[]
}

export interface OrderLineView {
  name: string
  qty: number
  unit_price: number
  options: string
  note: string
}

export interface OrderView {
  id: number
  table_id: number
  table_label: string
  status: OrderStatus
  total: number
  created_at: number
  updated_at: number
  lines: OrderLineView[]
}

export interface CallView {
  id: number
  table_id: number
  table_label: string
  kind: 'waiter' | 'bill'
  created_at: number
}

export interface TableState {
  table: { id: number; label: string }
  session: { id: number; opened_at: number; bill_requested_at: number | null } | null
  orders: OrderView[]
  total: number
  calls: { waiter: boolean; bill: boolean }
}

export interface KitchenResponse {
  orders: OrderView[]
  calls: CallView[]
  now: number
}

export interface TableSummary {
  id: number
  label: string
  session_id: number | null
  opened_at: number | null
  bill_requested_at: number | null
  total: number
  orders: number
  pending: number
  calls: number
}

export interface SalesResponse {
  bills: number
  revenue: number
  open_total: number
  open_tables: number
  top: { name: string; qty: number; revenue: number }[]
  by_hour: { hour: number; revenue: number }[]
}

export interface QrTable {
  id: number
  label: string
  token: string
}
