import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { KpiChip } from '../shared/KpiChip';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Slider } from '../ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { productionRecords, stockItems } from '../../lib/data';
import { ExportButton } from '../shared/ExportButton';

export function Production() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [mode, setMode] = useState<'3d' | '7d' | '14d' | '30d' | 'custom'>('7d');
  const [sliderStart, setSliderStart] = useState<number>(0);
  const [pageIdx, setPageIdx] = useState<number>(0);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  // Planning UI state
  const [planMode, setPlanMode] = useState<'3d' | '7d' | '14d'>('7d');
  type PlanItem = { id: string; line: string; date: string; sku: string; name: string; qty: number };
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const planningLines = useMemo(() => ['A','B','C','D','E','F','G','H'], []);
  const [editing, setEditing] = useState<null | { line: string; date: string; search: string; selectedSku?: string; qty: string }>(null);
  const [planOffset, setPlanOffset] = useState<number>(0); // days offset for planning window

  // Calculate KPIs
  const productionKPIs = useMemo(() => {
    const yesterday = '2025-10-14';
    const last7Days = productionRecords.filter(r => {
      const date = new Date(r.date);
      const cutoff = new Date('2025-10-15');
      cutoff.setDate(cutoff.getDate() - 7);
      return date >= cutoff;
    });

    const yesterdayOutput = productionRecords
      .filter(r => r.date === yesterday)
      .reduce((sum, r) => sum + r.qty, 0);

    const last7DaysTotal = last7Days.reduce((sum, r) => sum + r.qty, 0);

    // Best/worst line over last 7 days
    const linePerformance = new Map<string, number>();
    last7Days.forEach(r => {
      linePerformance.set(r.line, (linePerformance.get(r.line) || 0) + r.qty);
    });

    const sortedLines = Array.from(linePerformance.entries()).sort((a, b) => b[1] - a[1]);
    const bestLine = sortedLines[0] ? `${sortedLines[0][0]} (${sortedLines[0][1]})` : '-';
    const worstLine = sortedLines[sortedLines.length - 1] 
      ? `${sortedLines[sortedLines.length - 1][0]} (${sortedLines[sortedLines.length - 1][1]})` 
      : '-';

    return [
      { id: 'yesterday', label: 'Yesterday Output', value: yesterdayOutput, unit: 'units' },
      { id: '7day', label: '7-Day Total', value: last7DaysTotal, unit: 'units' },
      { id: 'best', label: 'Best Line (7d)', value: bestLine },
      { id: 'worst', label: 'Worst Line (7d)', value: worstLine },
    ];
  }, []);

  // Group by Line and Date (rows = line, columns = date)
  const productionGrid = useMemo(() => {
    const grid = new Map<string, Map<string, number>>();
    productionRecords.forEach(record => {
      if (!grid.has(record.line)) {
        grid.set(record.line, new Map());
      }
      const lineMap = grid.get(record.line)!;
      lineMap.set(record.date, (lineMap.get(record.date) || 0) + record.qty);
    });
    return grid;
  }, []);

  // Helper: aggregate per cell (line/date) for reject% and M/F counts
  const cellStats = (line: string, date: string) => {
    const recs = productionRecords.filter(r => r.line === line && r.date === date);
    const qty = recs.reduce((s, r) => s + (r.qty || 0), 0);
    const totalRejected = recs.reduce((s, r) => s + (r.qtyRejected || 0), 0);
    // Weighted avg of explicit rejectPct if present; otherwise fall back
    let weightedPctSum = 0;
    let weight = 0;
    recs.forEach(r => {
      if (typeof r.rejectPct === 'number' && isFinite(r.rejectPct)) {
        weightedPctSum += (r.rejectPct || 0) * (r.qty || 0);
        weight += (r.qty || 0);
      }
    });
    const rejectPct = weight > 0 ? (weightedPctSum / weight) : (qty > 0 ? (totalRejected / qty) * 100 : 0);
    const male = recs.reduce((s, r) => s + (r.male || 0), 0);
    const female = recs.reduce((s, r) => s + (r.female || 0), 0);
    return { qty, rejectPct: isFinite(rejectPct) ? rejectPct : 0, male, female };
  };

  const dates = useMemo(() => {
    // Unique dates present across all lines
    const set = new Set<string>();
    productionRecords.forEach(r => set.add(r.date));
    // Ensure today exists so it shows as a column even if qty=0
    const todayStr = new Date().toISOString().slice(0,10);
    set.add(todayStr);
    return Array.from(set.values()).sort();
  }, []);

  // Compute window size by mode
  const windowDays = useMemo(() => {
    switch (mode) {
      case '3d': return 3;
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      default: return 7;
    }
  }, [mode]);

  // Slider indices for moving window across dates
  const sliderMax = Math.max(0, Math.max(0, dates.length - windowDays));
  const defaultStart = Math.max(0, dates.length - windowDays);
  const effectiveStart = mode === 'custom' ? 0 : (dates.length ? Math.min(sliderStart || defaultStart, sliderMax) : 0);
  const effectiveEnd = mode === 'custom' ? dates.length : Math.min(dates.length, effectiveStart + windowDays);
  // Build descending timeline so columns render: Today, Yesterday, ...
  const timelineDesc = useMemo(() => {
    const arr = dates.slice().sort();
    arr.reverse();
    return arr;
  }, [dates]);
  // Pagination across windows of N days, oldest with larger pageIdx
  const maxPages = useMemo(() => Math.max(1, Math.ceil(timelineDesc.length / windowDays)), [timelineDesc.length, windowDays]);
  const clampedPage = Math.min(Math.max(0, pageIdx), Math.max(0, maxPages - 1));
  const visibleDates = useMemo(() => {
    if (mode === 'custom') {
      if (!customStart || !customEnd) return dates.slice(-7).reverse();
      const filtered = dates.filter(d => d >= customStart && d <= customEnd).sort().reverse();
      return filtered;
    }
    const start = clampedPage * windowDays;
    return timelineDesc.slice(start, start + windowDays);
  }, [mode, customStart, customEnd, dates, timelineDesc, clampedPage, windowDays]);

  const lines = useMemo(() => {
    return Array.from(new Set(productionRecords.map(r => r.line))).sort();
  }, []);

  // Finished goods list (for planning search)
  const finishedGoods = useMemo(() => {
    return (stockItems || []).filter((s) => s.category === 'Finished Goods');
  }, []);

  // Planning dates (from today forward)
  const planningDates = useMemo(() => {
    const days = planMode === '3d' ? 3 : planMode === '14d' ? 14 : 7;
    const out: string[] = [];
    const base = new Date();
    base.setDate(base.getDate() + planOffset);
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [planMode, planOffset]);

  // Planning actions
  const removePlan = (id: string) => setPlanItems((prev) => prev.filter(p => p.id !== id));
  const adjustQty = (id: string, delta: number) => setPlanItems((prev) => prev.map(p => p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p));
  const startEdit = (line: string, date: string) => setEditing({ line, date, search: '', qty: '' });
  const cancelEdit = () => setEditing(null);
  const selectSku = (sku: string) => setEditing((e) => e ? { ...e, selectedSku: sku, search: finishedGoods.find(f=>f.sku===sku)?.description || sku } : e);
  const saveEdit = () => {
    if (!editing || !editing.selectedSku) return;
    const qty = Number(editing.qty || '0');
    if (!isFinite(qty) || qty <= 0) return;
    const fg = finishedGoods.find(f => f.sku === editing.selectedSku);
    if (!fg) return;
    setPlanItems((prev) => prev.concat({
      id: `${editing.date}-${editing.line}-${editing.selectedSku}-${Date.now()}`,
      line: editing.line,
      date: editing.date,
      sku: editing.selectedSku,
      name: fg.description || fg.sku,
      qty,
    }));
    setEditing(null);
  };

  // SKU breakdown for selected cell
  const skuBreakdown = useMemo(() => {
    if (!selectedDate || !selectedLine) return [];
    return productionRecords.filter(
      r => r.date === selectedDate && r.line === selectedLine
    );
  }, [selectedDate, selectedLine]);

  // Sparkline data reflecting the current visible date window
  const sparklineData = useMemo(() => {
    const data = new Map<string, number[]>();
    const recentDates = visibleDates; // reflect current window
    lines.forEach(line => {
      const lineMap = productionGrid.get(line) || new Map<string, number>();
      const values = recentDates.map(d => lineMap.get(d) || 0);
      data.set(line, values);
    });
    
    return data;
  }, [visibleDates, lines, productionGrid]);

  const renderSparkline = (values: number[]) => {
    if (values.length === 0) return null;
    const max = Math.max(...values, 1);
    const width = 60;
    const height = 20;
    const points = values.map((val, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (val / max) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary"
        />
      </svg>
    );
  };

  // Font sizing helpers for compact vs wide (e.g., 3-day window)
  const bigCells = visibleDates.length <= 3;
  const qtyClass = bigCells ? 'text-xl md:text-3xl font-semibold' : 'text-base md:text-lg font-semibold';
  const subLabelClass = bigCells ? 'text-base text-muted-foreground' : 'text-sm text-muted-foreground';

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {productionKPIs.map((kpi) => (
          <KpiChip key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Production Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Production by Date × Line</CardTitle>
          <ExportButton data={productionRecords} filename="production" />
        </CardHeader>
        <CardContent>
          {/* Date Window Controls */}
          <div className="mb-4 space-y-3">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList>
                <TabsTrigger value="3d">Last 3 days</TabsTrigger>
                <TabsTrigger value="7d">Last 7 days</TabsTrigger>
                <TabsTrigger value="14d">Last 14 days</TabsTrigger>
                <TabsTrigger value="30d">Last month</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
              <TabsContent value="custom" className="mt-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground">From</label>
                    <input type="date" value={customStart} onChange={(e)=>setCustomStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground">To</label>
                    <input type="date" value={customEnd} onChange={(e)=>setCustomEnd(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            {mode !== 'custom' && dates.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  className="px-2 py-1 border rounded"
                  onClick={()=> setPageIdx(p => Math.max(0, p - 1))}
                  disabled={clampedPage === 0}
                  aria-label="Newer"
                >
                  ◀
                </button>
                <div className="text-xs text-muted-foreground">
                  Page {clampedPage + 1} / {maxPages}
                </div>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={()=> setPageIdx(p => Math.min(maxPages - 1, p + 1))}
                  disabled={clampedPage >= maxPages - 1}
                  aria-label="Older"
                >
                  ▶
                </button>
              </div>
            )}
          </div>
          {/* Desktop Table: rows=Line, cols=Date */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  {visibleDates.map(d => {
                    const dt = new Date(d);
                    const todayStr = new Date().toISOString().slice(0,10);
                    const isToday = d === todayStr;
                    const day = isToday ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' });
                    return (
                      <TableHead key={d} className="text-right">
                        <div className="flex flex-col items-end leading-tight">
                          <span>{day}</span>
                          <span className="text-xs text-muted-foreground">{d}</span>
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(line => {
                  const lineMap = productionGrid.get(line) || new Map<string, number>();
                  const total = visibleDates.reduce((sum, d) => sum + (lineMap.get(d) || 0), 0);
                  return (
                    <TableRow key={line} className="h-16 align-middle">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-base md:text-lg">
                            {line}
                            {(() => {
                              // Show most frequent operator name for this line within visible window
                              const recs = productionRecords.filter(r => r.line === line && visibleDates.includes(r.date));
                              const counts = new Map<string, number>();
                              for (const r of recs) {
                                const op = (r.operator || '').trim();
                                if (!op) continue;
                                counts.set(op, (counts.get(op) || 0) + 1);
                              }
                              if (counts.size === 0) return null;
                              const top = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1])[0][0];
                              return <span className="text-sm font-normal text-muted-foreground"> {' '}- {top}</span>;
                            })()}
                          </span>
                          <span className="text-xs text-muted-foreground">{renderSparkline(sparklineData.get(line) || [])}</span>
                        </div>
                      </TableCell>
                      {visibleDates.map(date => {
                        const qty = lineMap.get(date) || 0;
                        const meta = qty > 0 ? cellStats(line, date) : null;
                        const label = meta ? `R: ${Math.round((meta.rejectPct || 0) * 10) / 10}% • M:${meta.male || 0}/F:${meta.female || 0}` : '';
                        return (
                          <TableCell key={date} className="text-right">
                            {qty > 0 ? (
                              <Sheet>
                                <SheetTrigger asChild>
                                  <button
                                    className="text-primary hover:underline text-right"
                                    onClick={() => {
                                      setSelectedDate(date);
                                      setSelectedLine(line);
                                    }}
                                  >
                                    <div className="flex flex-col items-end leading-tight">
                                      <span className={qtyClass}>{qty}</span>
                                      <span className={subLabelClass}>{label}</span>
                                    </div>
                                  </button>
                                </SheetTrigger>
                                <SheetContent>
                                  <SheetHeader>
                                    <SheetTitle>SKU Breakdown</SheetTitle>
                                    <p className="text-sm text-muted-foreground">
                                      {date} • {line}
                                    </p>
                                  </SheetHeader>
                                  <div className="mt-6 space-y-3">
                                    {skuBreakdown.map((record) => {
                                      const pct = typeof record.rejectPct === 'number' && isFinite(record.rejectPct)
                                        ? Math.round(record.rejectPct * 10) / 10
                                        : (record.qty > 0 ? Math.round(((record.qtyRejected || 0) / record.qty) * 1000) / 10 : 0);
                                      return (
                                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                                          <div>
                                            <p className="font-medium">{record.itemName || record.sku}</p>
                                            <p className="text-xs text-muted-foreground">Code: {record.sku}{record.shift ? ` • ${record.shift} shift` : ''}</p>
                                            <p className="text-sm text-muted-foreground">R: {pct}% • M:{record.male || 0}/F:{record.female || 0}</p>
                                            {typeof record.qtyRejected === 'number' && record.qtyRejected > 0 && (
                                              <p className="text-sm text-red-600">Rejected: {record.qtyRejected}</p>
                                            )}
                                          </div>
                                          <Badge variant="secondary" className="text-base">{record.qty} units</Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </SheetContent>
                              </Sheet>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">{total}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {lines.map(line => {
              const lineMap = productionGrid.get(line) || new Map<string, number>();
              const total = visibleDates.reduce((sum, d) => sum + (lineMap.get(d) || 0), 0);
              return (
                <Card key={line}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{line}</p>
                      <Badge>{total} units</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {visibleDates.map(date => {
                        const qty = lineMap.get(date) || 0;
                        const meta = qty > 0 ? cellStats(line, date) : null;
                        const dt = new Date(date);
                        const todayStr = new Date().toISOString().slice(0,10);
                        const day = date === todayStr ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' });
                        return (
                          <div key={date}>
                            <p className="text-muted-foreground">{day} {date}</p>
                            {qty > 0 ? (
                              <>
                                <p className={bigCells ? 'text-xl font-semibold' : 'text-base font-semibold'}>{qty}</p>
                                <p className={bigCells ? 'text-base text-muted-foreground' : 'text-sm text-muted-foreground'}>R: {Math.round(((meta?.rejectPct || 0) * 10)) / 10}% • M:{meta?.male || 0}/F:{meta?.female || 0}</p>
                              </>
                            ) : (
                              <p>-</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plan Production */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Plan Production</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Window:</span>
            <Tabs value={planMode} onValueChange={(v)=>setPlanMode(v as any)}>
              <TabsList>
                <TabsTrigger value="3d">3 days</TabsTrigger>
                <TabsTrigger value="7d">7 days</TabsTrigger>
                <TabsTrigger value="14d">14 days</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 ml-2">
              <button className="px-2 py-1 border rounded" onClick={()=>setPlanOffset(o=>o-1)} aria-label="Shift earlier">◀</button>
              <button className="px-2 py-1 border rounded" onClick={()=>setPlanOffset(o=>o+1)} aria-label="Shift later">▶</button>
            </div>
            <button
              className="ml-2 px-3 py-1 border rounded"
              onClick={async ()=>{
                if (planItems.length === 0) { alert('No plan items to save'); return; }
                try {
                  const resp = await fetch('/api/save-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows: planItems }),
                  });
                  if (!resp.ok) throw new Error(await resp.text());
                  const data = await resp.json();
                  alert(`Saved ${data.appended} rows to Excel`);
                } catch (e: any) {
                  alert('Failed to save plan: ' + e.message);
                }
              }}
            >
              Save Plan
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-28">Line</TableHead>
                  {planningDates.map((d) => {
                    const dt = new Date(d);
                    const todayStr = new Date().toISOString().slice(0,10);
                    const day = d === todayStr ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' });
                    return (
                      <TableHead key={d} className="text-center min-w-44">
                        <div className="flex flex-col items-center leading-tight">
                          <span>{day}</span>
                          <span className="text-xs text-muted-foreground">{d}</span>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {planningLines.map((line) => (
                  <TableRow key={line}>
                    <TableCell className="font-medium">Line {line}</TableCell>
                    {planningDates.map((d) => {
                      const items = planItems.filter(p => p.date === d && p.line === line);
                      const isEditing = editing && editing.line === line && editing.date === d;
                      const suggestions = isEditing ? finishedGoods.filter(fg => {
                        const q = (editing?.search || '').toLowerCase();
                        return q.length === 0 ? true : (String(fg.description || '').toLowerCase().includes(q) || String(fg.sku).toLowerCase().includes(q));
                      }).slice(0, 8) : [];
                      return (
                        <TableCell key={d}>
                          <div className={`border rounded-md p-2 flex flex-col gap-2 bg-muted/10 ${planMode==='3d' ? 'min-h-40 h-40' : 'min-h-32 h-32'}`}>
                            {!isEditing && items.length === 0 && (
                              <button className="text-xs text-muted-foreground h-full flex items-center justify-center hover:underline" onClick={()=>startEdit(line, d)}>
                                Tap to add
                              </button>
                            )}
                            {!isEditing && items.length > 0 && (
                              <>
                                <div className="flex-1 overflow-auto space-y-2">
                                  {items.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between gap-2 p-2 bg-background border rounded">
                                      <div>
                                        <div className={`${planMode==='3d' ? 'text-base' : 'text-sm'} font-medium truncate max-w-[200px]`} title={p.name}>{p.name}</div>
                                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button className="px-2 py-0.5 border rounded" onClick={()=>adjustQty(p.id, -1)}>-</button>
                                        <span className={`${planMode==='3d' ? 'text-lg' : 'text-sm'} font-semibold w-12 text-center`}>{p.qty}</span>
                                        <button className="px-2 py-0.5 border rounded" onClick={()=>adjustQty(p.id, +1)}>+</button>
                                        <button className="px-2 py-0.5 border rounded text-red-600" onClick={()=>removePlan(p.id)}>×</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <button className="text-xs underline" onClick={()=>startEdit(line, d)}>Add another</button>
                                </div>
                              </>
                            )}
                            {isEditing && (
                              <div className="flex flex-col gap-2">
                                <input
                                  autoFocus
                                  type="text"
                                  value={editing?.search || ''}
                                  onChange={(e)=>setEditing(prev=> prev ? { ...prev, search: e.target.value, selectedSku: undefined } : prev)}
                                  placeholder="Search finished good..."
                                  className={`border rounded px-2 py-1 ${planMode==='3d' ? 'text-base' : 'text-sm'}`}
                                />
                                {suggestions.length > 0 && (
                                  <div className="max-h-28 overflow-auto border rounded">
                                    {suggestions.map((s) => (
                                      <button key={s.sku} className={`w-full text-left px-2 py-1 ${planMode==='3d' ? 'text-base' : 'text-sm'} hover:bg-accent ${editing?.selectedSku===s.sku ? 'bg-accent' : ''}`} onClick={()=>selectSku(s.sku)}>
                                        {(s.description || s.sku)}
                                        <span className="text-xs text-muted-foreground"> — {s.sku}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <input type="number" min={0} value={editing?.qty || ''} onChange={(e)=>setEditing(prev=> prev ? { ...prev, qty: e.target.value } : prev)} placeholder="Qty" className={`border rounded px-2 py-1 w-24 ${planMode==='3d' ? 'text-base' : 'text-sm'}`} />
                                  <button className="px-3 py-1 border rounded text-sm" onClick={saveEdit} disabled={!editing?.selectedSku || !editing?.qty}>Save</button>
                                  <button className="px-3 py-1 border rounded text-sm" onClick={cancelEdit}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
