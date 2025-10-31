// Core TypeScript types for the Inventory Ops Dashboard

export type StockStatus = 'Healthy' | 'Low' | 'Out';
export type OrderStatus = 'Open' | 'Partial' | 'Closed';
export type Priority = 'High' | 'Medium' | 'Low';
export type StockCategory = 'Finished Goods' | 'Raw Materials' | 'WIP';

export interface KPI {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  link?: string;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customer: string;
  promiseDate: string;
  priority: Priority;
  sku: string;
  qtyOrdered: number;
  allocated: number;
  gap: number;
  coveragePercent: number;
  age: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  dueDate: string;
  linesOpen: number;
  ordered: number;
  received: number;
  percentReceived: number;
  lastReceipt: string | null;
  aging: number;
  isLate: boolean;
}

export interface Receipt {
  id: string;
  date: string;
  poNumber: string;
  vendor: string;
  sku: string;
  qty: number;
  variance: number;
  receiver: string;
  remarks: string;
}

export interface ProductionRecord {
  id: string;
  date: string;
  line: string;
  sku: string;
  qty: number;
  shift?: string;
  itemName?: string;
  qtyRejected?: number;
  operator?: string;
  rejectPct?: number;
  male?: number;
  female?: number;
}

export interface StockItem {
  id: string;
  sku: string;
  description: string;
  category: StockCategory;
  onHand: number;
  reserved: number;
  available: number;
  incoming14d: number;
  min: number;
  max: number;
  status: StockStatus;
  lastMovement: string;
  location?: string;
}

export interface BOMBottleneck {
  sku: string;
  available: number;
  required: number;
  shortfall: number;
}

export interface BOMResult {
  maxBuildable: number;
  bottlenecks: BOMBottleneck[];
}

export interface ActivityItem {
  id: string;
  type: 'receipt' | 'dispatch' | 'production' | 'adjustment';
  timestamp: string;
  description: string;
  sku?: string;
  qty?: number;
  reference?: string;
}

export interface MorningListItem {
  id: string;
  type: 'overdue' | 'stockout' | 'short-receipt' | 'no-coverage';
  severity: 'critical' | 'warning';
  title: string;
  description: string;
  reference: string;
}

export interface ExpediteItem {
  id: string;
  type: 'late-po' | 'order-gap';
  severity: 'critical' | 'warning';
  reference: string;
  description: string;
  daysLate?: number;
  gap?: number;
}

export type TabId = 'dashboard' | 'orders' | 'purchase-orders' | 'receipts' | 'production' | 'stock' | 'bom' | 'search';

export interface TimeRange {
  label: string;
  days: number;
}
