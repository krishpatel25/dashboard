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
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { ExportButton } from '../shared/ExportButton';
import { purchaseOrders } from '../../lib/data';

export function PurchaseOrders() {
  const [vendor, setVendor] = useState<string>('all');
  const [showClosed, setShowClosed] = useState(false);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      // Vendor filter
      if (vendor !== 'all' && order.vendor !== vendor) return false;

      // Show closed filter (for now, we consider 100% received as closed)
      if (!showClosed && order.percentReceived === 100) return false;

      return true;
    });
  }, [vendor, showClosed]);

  const vendors = useMemo(() => {
    return Array.from(new Set(purchaseOrders.map(o => o.vendor))).sort();
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                id="show-closed"
                checked={showClosed}
                onCheckedChange={setShowClosed}
              />
              <Label htmlFor="show-closed" className="cursor-pointer">
                Show closed
              </Label>
            </div>

            <div className="ml-auto">
              <ExportButton data={filteredOrders} filename="purchase-orders" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Lines Open</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">% Received</TableHead>
                  <TableHead>Last Receipt</TableHead>
                  <TableHead className="text-right">Aging (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.poNumber}
                        {order.isLate && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.vendor}</TableCell>
                    <TableCell>{order.dueDate}</TableCell>
                    <TableCell className="text-right">{order.linesOpen}</TableCell>
                    <TableCell className="text-right">{order.ordered}</TableCell>
                    <TableCell className="text-right">{order.received}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={
                          order.percentReceived === 100 ? 'text-green-600' :
                          order.percentReceived > 0 ? 'text-yellow-600' :
                          'text-muted-foreground'
                        }>
                          {order.percentReceived}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.lastReceipt || '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {order.aging}
                    </TableCell>
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
                      <p className="font-medium flex items-center gap-2">
                        {order.poNumber}
                        {order.isLate && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.vendor}</p>
                    </div>
                    <Badge variant={order.percentReceived === 100 ? 'default' : 'secondary'}>
                      {order.percentReceived}% received
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p>{order.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lines Open</p>
                      <p>{order.linesOpen}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ordered / Received</p>
                      <p>{order.ordered} / {order.received}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Receipt</p>
                      <p>{order.lastReceipt || '-'}</p>
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
