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
import { ExportButton } from '../shared/ExportButton';
import { receipts } from '../../lib/data';

type DayFilter = 'all' | '7' | '30';

export function Receipts() {
  const [vendor, setVendor] = useState<string>('all');
  const [poNumber, setPoNumber] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');

  const today = new Date('2025-10-15');

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      // Vendor filter
      if (vendor !== 'all' && receipt.vendor !== vendor) return false;

      // PO filter
      if (poNumber !== 'all' && receipt.poNumber !== poNumber) return false;

      // Day filter
      if (dayFilter !== 'all') {
        const receiptDate = new Date(receipt.date);
        const daysDiff = Math.ceil((today.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
        const days = parseInt(dayFilter);
        if (daysDiff > days) return false;
      }

      return true;
    });
  }, [vendor, poNumber, dayFilter]);

  const vendors = useMemo(() => {
    return Array.from(new Set(receipts.map(r => r.vendor))).sort();
  }, []);

  const poNumbers = useMemo(() => {
    return Array.from(new Set(receipts.map(r => r.poNumber))).sort();
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
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

            <Select value={poNumber} onValueChange={setPoNumber}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="PO Number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All POs</SelectItem>
                {poNumbers.map(po => (
                  <SelectItem key={po} value={po}>{po}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dayFilter} onValueChange={(v) => setDayFilter(v as DayFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <ExportButton data={filteredReceipts} filename="receipts" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Receipts ({filteredReceipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>{receipt.date}</TableCell>
                    <TableCell>{receipt.poNumber}</TableCell>
                    <TableCell>{receipt.vendor}</TableCell>
                    <TableCell>{receipt.sku}</TableCell>
                    <TableCell className="text-right">{receipt.qty}</TableCell>
                    <TableCell className="text-right">
                      {receipt.variance !== 0 && (
                        <div className="flex items-center justify-end gap-2">
                          <span className={receipt.variance < 0 ? 'text-red-600' : 'text-green-600'}>
                            {receipt.variance > 0 ? '+' : ''}{receipt.variance}
                          </span>
                          {receipt.variance < 0 && (
                            <Badge variant="destructive" className="text-xs">Short</Badge>
                          )}
                          {receipt.variance > 0 && (
                            <Badge variant="secondary" className="text-xs">Bonus</Badge>
                          )}
                        </div>
                      )}
                      {receipt.variance === 0 && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{receipt.receiver}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {receipt.remarks}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredReceipts.map((receipt) => (
              <Card key={receipt.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{receipt.poNumber}</p>
                      <p className="text-sm text-muted-foreground">{receipt.vendor}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{receipt.date}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">SKU</p>
                      <p>{receipt.sku}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Qty</p>
                      <p>{receipt.qty}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Variance</p>
                      {receipt.variance !== 0 ? (
                        <p className={receipt.variance < 0 ? 'text-red-600' : 'text-green-600'}>
                          {receipt.variance > 0 ? '+' : ''}{receipt.variance}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Receiver</p>
                      <p>{receipt.receiver}</p>
                    </div>
                  </div>
                  {receipt.remarks && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Remarks</p>
                      <p>{receipt.remarks}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
