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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { StatusChip } from '../shared/StatusChip';
import { ExportButton } from '../shared/ExportButton';
import { stockItems } from '../../lib/data';
import type { StockCategory } from '../../lib/types';

export function Stock() {
  const [category, setCategory] = useState<StockCategory>('Finished Goods');
  const [location, setLocation] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return stockItems.filter((item) => {
      if (item.category !== category) return false;
      if (location !== 'all' && item.location !== location) return false;
      return true;
    });
  }, [category, location]);

  const locations = useMemo(() => {
    return Array.from(new Set(stockItems.filter(i => i.category === category).map(i => i.location || ''))).filter(Boolean).sort();
  }, [category]);

  const summary = useMemo(() => {
    const total = filteredItems.reduce((sum, item) => sum + item.available, 0);
    const healthy = filteredItems.filter(i => i.status === 'Healthy').length;
    const low = filteredItems.filter(i => i.status === 'Low').length;
    const out = filteredItems.filter(i => i.status === 'Out').length;
    
    return { total, healthy, low, out };
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as StockCategory)}>
        <TabsList>
          <TabsTrigger value="Finished Goods">Finished Goods</TabsTrigger>
          <TabsTrigger value="Raw Materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="WIP">WIP</TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Available</p>
                <p className="text-2xl">{summary.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Healthy</p>
                <p className="text-2xl text-green-600">{summary.healthy}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl text-orange-600">{summary.low}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl text-red-600">{summary.out}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="ml-auto">
                  <ExportButton data={filteredItems} filename={`stock-${category.toLowerCase().replace(' ', '-')}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>{category} ({filteredItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">On-hand</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Incoming ≤14d</TableHead>
                      <TableHead className="text-right">Min / Max</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Movement</TableHead>
                      {locations.length > 0 && <TableHead>Location</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.onHand}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.reserved}</TableCell>
                        <TableCell className="text-right">
                          <span className={item.available < 0 ? 'text-red-600' : ''}>
                            {item.available}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.incoming14d}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.min} / {item.max}
                        </TableCell>
                        <TableCell>
                          <StatusChip status={item.status} type="stock" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.lastMovement}</TableCell>
                        {locations.length > 0 && (
                          <TableCell className="text-muted-foreground">{item.location}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{item.sku}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <StatusChip status={item.status} type="stock" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">On-hand</p>
                          <p>{item.onHand}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reserved</p>
                          <p>{item.reserved}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Available</p>
                          <p className={item.available < 0 ? 'text-red-600' : ''}>
                            {item.available}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Incoming ≤14d</p>
                          <p>{item.incoming14d}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Min / Max</p>
                          <p>{item.min} / {item.max}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Movement</p>
                          <p>{item.lastMovement}</p>
                        </div>
                        {item.location && (
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p>{item.location}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
