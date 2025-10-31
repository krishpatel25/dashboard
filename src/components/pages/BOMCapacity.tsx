import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { stockItems, bomLines } from '../../lib/data';
import type { BOMResult, BOMLine } from '../../lib/types';

export function BOMCapacity() {
  const [selectedSKU, setSelectedSKU] = useState<string>('');
  const [result, setResult] = useState<BOMResult | null>(null);

  const finishedGoods = useMemo(() => {
    return stockItems
      .filter(item => item.category === 'Finished Goods')
      .map(item => ({ sku: item.sku, name: item.description || item.sku }))
      .sort((a,b)=>a.name.localeCompare(b.name));
  }, []);

  const bomMap = useMemo(() => {
    const map = new Map<string, { component: string; qtyPer: number }[]>();
    (bomLines as BOMLine[]).forEach(line => {
      if (!line.parent || !line.component || !line.qtyPer) return;
      const arr = map.get(line.parent) || [];
      arr.push({ component: line.component, qtyPer: line.qtyPer });
      map.set(line.parent, arr);
    });
    return map;
  }, []);

  const calculateCapacity = () => {
    if (!selectedSKU || !bomMap.has(selectedSKU)) {
      setResult(null);
      return;
    }

    const bom = Object.fromEntries((bomMap.get(selectedSKU) || []).map(x => [x.component, x.qtyPer]));
    const bottlenecks: BOMResult['bottlenecks'] = [];
    let maxBuildable = Infinity;

    Object.entries(bom).forEach(([componentSKU, requiredQty]) => {
      const stockItem = stockItems.find(item => item.sku === componentSKU);
      const available = stockItem?.available || 0;
      const canMake = Math.floor(available / requiredQty);

      if (canMake < maxBuildable) {
        maxBuildable = canMake;
      }

      if (available < requiredQty) {
        bottlenecks.push({
          sku: componentSKU,
          available,
          required: requiredQty,
          shortfall: requiredQty - available,
        });
      }
    });

    setResult({
      maxBuildable: maxBuildable === Infinity ? 0 : maxBuildable,
      bottlenecks: bottlenecks.sort((a, b) => b.shortfall - a.shortfall),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>How Many Can We Make?</CardTitle>
          <p className="text-sm text-muted-foreground">
            Calculate maximum buildable quantity based on current available inventory
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm mb-2 block">Select SKU</label>
              <Select value={selectedSKU} onValueChange={setSelectedSKU}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a finished good..." />
                </SelectTrigger>
                <SelectContent>
                  {finishedGoods.map(item => (
                    <SelectItem key={item.sku} value={item.sku}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={calculateCapacity} disabled={!selectedSKU}>
              Calculate
            </Button>
          </div>

          {result && (
            <div className="mt-6 space-y-4">
              {/* Result Summary */}
              <Card className={result.maxBuildable === 0 ? 'border-red-500' : 'border-green-500'}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {result.maxBuildable > 0 ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Maximum Buildable</p>
                      <p className="text-3xl">{result.maxBuildable} units</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* BOM Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bill of Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(bomData[selectedSKU]).map(([componentSKU, requiredQty]) => {
                      const stockItem = stockItems.find(item => item.sku === componentSKU);
                      const available = stockItem?.available || 0;
                      const canMake = Math.floor(available / requiredQty);
                      const isBottleneck = available < requiredQty;

                      return (
                        <div
                          key={componentSKU}
                          className={`p-3 rounded-lg border ${isBottleneck ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'bg-card'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{componentSKU}</p>
                                {isBottleneck && (
                                  <Badge variant="destructive" className="text-xs">Bottleneck</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {stockItem?.description || 'Component'}
                              </p>
                              <div className="flex gap-4 mt-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Required per unit: </span>
                                  <span>{requiredQty}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Available: </span>
                                  <span className={available < requiredQty ? 'text-red-600' : 'text-green-600'}>
                                    {available}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Can make: </span>
                                  <span>{canMake}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Bottlenecks */}
              {result.bottlenecks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Bottleneck Components ({result.bottlenecks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.bottlenecks.map((bottleneck) => {
                        const stockItem = stockItems.find(item => item.sku === bottleneck.sku);
                        return (
                          <div
                            key={bottleneck.sku}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          >
                            <div>
                              <p className="font-medium">{bottleneck.sku}</p>
                              <p className="text-xs text-muted-foreground">{stockItem?.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                <span className="text-red-600">Short: {bottleneck.shortfall}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {bottleneck.available} / {bottleneck.required} required
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              This tool calculates the maximum number of units that can be manufactured based on current available inventory.
            </p>
            <p>
              Bottleneck components are materials where available stock is insufficient to produce even one unit.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
