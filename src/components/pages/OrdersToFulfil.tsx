import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { StatusChip } from '../shared/StatusChip';
import { ExportButton } from '../shared/ExportButton';
import { salesOrders } from '../../lib/data';
import { Badge } from '../ui/badge';

type DueBucket = 'all' | 'today' | '7days' | 'late';
type GroupBy = 'order' | 'sku';

export function OrdersToFulfil() {
  const [dueBucket, setDueBucket] = useState<DueBucket>('all');
  const [priority, setPriority] = useState<string>('all');
  const [customer, setCustomer] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('order');

  const today = new Date('2025-10-15'); // Current date from requirements

  const filteredOrders = useMemo(() => {
    return salesOrders.filter((order) => {
      // Due bucket filter
      if (dueBucket !== 'all') {
        const promiseDate = new Date(order.promiseDate);
        const daysDiff = Math.ceil((promiseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dueBucket === 'today' && daysDiff !== 0) return false;
        if (dueBucket === '7days' && (daysDiff < 0 || daysDiff > 7)) return false;
        if (dueBucket === 'late' && daysDiff >= 0) return false;
      }

      // Priority filter
      if (priority !== 'all' && order.priority !== priority) return false;

      // Customer filter
      if (customer !== 'all' && order.customer !== customer) return false;

      return true;
    });
  }, [dueBucket, priority, customer]);

  const customers = useMemo(() => {
    return Array.from(new Set(salesOrders.map(o => o.customer))).sort();
  }, []);

  const getCoverageColor = (percent: number) => {
    if (percent === 0) return 'text-red-600';
    if (percent < 50) return 'text-orange-600';
    if (percent < 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  const isLate = (promiseDate: string) => {
    return new Date(promiseDate) < today;
  };

  // Grouped view
  const groupedData = useMemo(() => {
    if (groupBy === 'sku') {
      const groups = new Map<string, typeof filteredOrders>();
      filteredOrders.forEach(order => {
        const existing = groups.get(order.sku) || [];
        groups.set(order.sku, [...existing, order]);
      });
      return groups;
    }
    return null;
  }, [filteredOrders, groupBy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Select value={dueBucket} onValueChange={(v) => setDueBucket(v as DueBucket)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Due date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="7days">Due ≤7 days</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">By Order</SelectItem>
                <SelectItem value="sku">By SKU</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <ExportButton data={filteredOrders} filename="orders-to-fulfil" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Promise Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty Ordered</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="text-right">Coverage %</TableHead>
                  <TableHead className="text-right">Age (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.soNumber}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.promiseDate}
                        {isLate(order.promiseDate) && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={order.priority} type="priority" />
                    </TableCell>
                    <TableCell>{order.sku}</TableCell>
                    <TableCell className="text-right">{order.qtyOrdered}</TableCell>
                    <TableCell className="text-right">{order.allocated}</TableCell>
                    <TableCell className="text-right">
                      {order.gap > 0 && <span className="text-red-600">{order.gap}</span>}
                      {order.gap === 0 && <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className={`text-right ${getCoverageColor(order.coveragePercent)}`}>
                      {order.coveragePercent}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{order.age}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{order.soNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                    </div>
                    <StatusChip status={order.priority} type="priority" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Promise Date</p>
                      <p className="flex items-center gap-2">
                        {order.promiseDate}
                        {isLate(order.promiseDate) && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">SKU</p>
                      <p>{order.sku}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ordered / Allocated</p>
                      <p>{order.qtyOrdered} / {order.allocated}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className={getCoverageColor(order.coveragePercent)}>
                        {order.coveragePercent}% {order.gap > 0 && `(Gap: ${order.gap})`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
