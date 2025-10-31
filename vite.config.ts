import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

function excelLiveDataPlugin() {
  const dataDir = process.env.EXCEL_DATA_DIR
    ? path.resolve(process.env.EXCEL_DATA_DIR)
    : path.resolve(__dirname, './data/connected-workbooks');
  const targetId = path.resolve(__dirname, './src/lib/data.ts');

  function toDateOnly(d: any) {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    const s = String(d).trim();
    const dt = new Date(s);
    if (!isNaN(dt as any)) return dt.toISOString().slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (m) {
      const [, d1, m1, y1] = m;
      const dt2 = new Date(Number((y1 as string).length === 2 ? '20' + y1 : y1), Number(m1) - 1, Number(d1));
      return dt2.toISOString().slice(0, 10);
    }
    return '';
  }

  function num(v: any, d = 0) {
    const n = Number(v);
    return isFinite(n) ? n : d;
  }

  function loadSheet(wb: XLSX.WorkBook, name: string) {
    const ws = wb.Sheets[name as any];
    if (!ws) return [] as any[];
    return XLSX.utils.sheet_to_json(ws as any, { defval: '' }) as any[];
  }

  function findWorkbookWithAny(names: string[] | string): XLSX.WorkBook | null {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g,'');
    const targets = (Array.isArray(names) ? names : [names]).map(norm);
    const files = fs.readdirSync(dataDir).filter(f => /\.xls[x]?$/i.test(f));
    for (const f of files) {
      try {
        const wb = XLSX.readFile(path.join(dataDir, f));
        const lower = new Set(wb.SheetNames.map((s: string) => norm(s)));
        for (const n of targets) { if (lower.has(n)) return wb; }
      } catch {}
    }
    return null;
  }
  function loadSheetAny(wb: XLSX.WorkBook | null, names: string[]): any[] {
    if (!wb) return [] as any[];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g,'');
    const map = new Map(wb.SheetNames.map((n: string) => [norm(n), n]));
    for (const n of names) { const key = norm(n); if (map.has(key)) return loadSheet(wb, map.get(key) as string); }
    return [] as any[];
  }

  function firstExisting(...names: string[]): string | null {
    for (const n of names) { const p = path.join(dataDir, n); if (fs.existsSync(p)) return p; }
    return null;
  }

  const DEBUG = process.env.EXCEL_DEBUG === '1' || process.env.EXCEL_DEBUG === 'true';
  function dbg(...args: any[]) { if (DEBUG) console.log('[excel-live-data]', ...args); }

  function buildModule(): string {
    dbg('EXCEL_DATA_DIR =', dataDir);
    const masterPath = firstExisting('MasterData.xls', 'MasterData.xlsx');
    const master = masterPath ? XLSX.readFile(masterPath) : null;
    const poWb = findWorkbookWithAny(['PO_Combined']);
    const soWb = findWorkbookWithAny(['SO_Combined']) || poWb;
    const transWb = findWorkbookWithAny(['Trascations','trascations','Transactions','Movements','Production','ProductionLog']) || poWb || soWb;

    if (!master || !poWb || !soWb) {
      return fs.readFileSync(targetId, 'utf8');
    }

    const finishedGoods = loadSheetAny(master, ['finished goods','finished_goods','finishedgoods','FG','fg']);
    const rawMaterials = loadSheetAny(master, ['raw material','raw_material','rawmaterial','RM','rm']);
    const bom = loadSheetAny(master, ['bom','BOM']);

    const poCombined = loadSheetAny(poWb, ['PO_Combined']);
    const soCombined = loadSheetAny(soWb, ['SO_Combined']);
    const receiptsSheet = loadSheetAny(transWb, ['Trascations','trascations','Transactions']);
    const productionSheet = loadSheetAny(transWb, ['ProductionLog','Production']);
    const movements = loadSheetAny(transWb, ['Movements']);

    const onHand = new Map<string, number>();
    const lastMove = new Map<string, Date>();
    for (const r of finishedGoods.concat(rawMaterials)) {
      const sku = String((r as any).PartNo || '').trim();
      if (!sku) continue;
      onHand.set(sku, num((r as any).qty, 0));
    }
    for (const m of movements) {
      const sku = String((m as any).PartNo || '').trim();
      if (!sku) continue;
      const dt = new Date(toDateOnly((m as any).Date) || '1970-01-01');
      if (!lastMove.has(sku) || (lastMove.get(sku) as Date) < dt) lastMove.set(sku, dt);
    }
    const reserved = new Map<string, number>();
    for (const s of soCombined) {
      const sku = String(((s as any)['part no.'] || (s as any).ProductCode || '').toString().trim());
      if (!sku) continue;
      reserved.set(sku, (reserved.get(sku) || 0) + 0);
    }

    const today = new Date();
    const itemsRows = finishedGoods.concat(rawMaterials);
    const fgSet = new Set(finishedGoods.map((r:any)=>String(r.PartNo||'').trim()));
    const rmSet = new Set(rawMaterials.map((r:any)=>String(r.PartNo||'').trim()));
    function normCategory(row:any, sku:string){
      if (fgSet.has(sku)) return 'Finished Goods';
      if (rmSet.has(sku)) return 'Raw Materials';
      const c = String(row.Category || '').toLowerCase().replace(/\s+/g,'');
      if (['finishedgoods','fg','finishedgood'].includes(c)) return 'Finished Goods';
      if (['rawmaterials','rawmaterial','rm'].includes(c)) return 'Raw Materials';
      if (c === 'wip') return 'WIP';
      return 'Raw Materials';
    }
    const stockItems = itemsRows.map((it: any, idx: number) => {
      const sku = String(it.PartNo || '').trim();
      const oh = onHand.get(sku) || 0;
      const res = reserved.get(sku) || 0;
      const avail = oh - res;
      const min = num(it.Min, 0);
      const status = avail <= 0 ? 'Out' : (avail < min ? 'Low' : 'Healthy');
      const lm = lastMove.get(sku);
      return {
        id: String(idx + 1),
        sku,
        description: String(it.PartName || it.ItemName || sku),
        category: normCategory(it, sku),
        onHand: oh,
        reserved: res,
        available: avail,
        incoming14d: 0,
        min,
        max: num(it.Max, 0),
        status,
        lastMovement: lm ? (lm as Date).toISOString().slice(0, 10) : '',
        location: String(it.Location || ''),
      };
    });

    const salesOrders = soCombined.map((r: any, i: number) => {
      const soNum = String((r['SaleOrder No.'] || r.PurchaseOrder || r.SONumber || '')).trim();
      const cust = String(r.VendorName || r.CustomerName || '');
      const sku = String(((r as any)['part no.'] || (r as any).ProductCode || '').toString());
      const qtyOrdered = num((r as any).Quantity ?? (r as any).QtyOrdered, 0);
      const allocated = 0;
      const gap = Math.max(0, qtyOrdered - allocated);
      const coveragePercent = qtyOrdered === 0 ? 0 : Math.round((allocated / qtyOrdered) * 100);
      const promise = toDateOnly((r as any)['SO-date']) || toDateOnly((r as any).InvoiceDate);
      const orderDate = new Date(promise || toDateOnly((r as any).InvoiceDate) || today);
      const age = Math.max(0, Math.floor((today.getTime() - orderDate.getTime()) / (24*3600*1000)));
      return { id: String(i + 1), soNumber: soNum, customer: cust, promiseDate: promise || '', priority: 'Medium', sku, qtyOrdered, allocated, gap, coveragePercent, age };
    });

    const poMap = new Map<string, any>();
    for (const r of poCombined) {
      const po = String(((r as any).PurchaseOrder || '').toString()).trim();
      if (!po) continue;
      const rec = poMap.get(po) || { id: po, poNumber: po, vendor: String((r as any).VendorName || ''), dueDate: toDateOnly((r as any)['PO-date']) || '', linesOpen: 0, ordered: 0, received: 0, percentReceived: 0, lastReceipt: null as any, aging: 0, isLate: false, orderDate: toDateOnly((r as any).InvoiceDate) || '' };
      rec.received += num((r as any).Quantity, 0);
      const qo = num((r as any).QtyOrdered, 0);
      rec.ordered += qo;
      rec.linesOpen += 1;
      const recDate = toDateOnly((r as any).InvoiceDate);
      if (recDate && (!rec.lastReceipt || rec.lastReceipt < recDate)) rec.lastReceipt = recDate;
      poMap.set(po, rec);
    }
    const purchaseOrders = Array.from(poMap.values()).map((p: any, i: number) => {
      const orderDate = p.orderDate ? new Date(p.orderDate) : today;
      const aging = Math.max(0, Math.floor((today.getTime() - orderDate.getTime()) / (24*3600*1000)));
      const percent = p.ordered > 0 ? Math.round((p.received / p.ordered) * 100) : (p.received > 0 ? 100 : 0);
      return { id: String(i + 1), poNumber: p.poNumber, vendor: p.vendor, dueDate: p.dueDate, linesOpen: p.linesOpen, ordered: p.ordered, received: p.received, percentReceived: percent, lastReceipt: p.lastReceipt || null, aging, isLate: !!p.isLate };
    });

    const receiptsOut = receiptsSheet.map((r: any, i: number) => ({ id: String(i + 1), date: toDateOnly(r['PO-date'] || r.InvoiceDate) || '', poNumber: String(r.PurchaseOrder || ''), vendor: String(r.VendorName || ''), sku: String(r.ProductCode || ''), qty: num(r.Quantity, 0), variance: 0, receiver: '', remarks: String(r.Status || '') }));
    const productionOut = productionSheet.map((r: any, i: number) => ({
      id: String(i + 1),
      date: toDateOnly((r as any).Timestamp) || toDateOnly((r as any).Date) || toDateOnly((r as any)['ProductionDate']) || toDateOnly((r as any)['Production Date']) || '',
      line: String(r.Line || ''),
      sku: String(r.ItemCode || ''),
      qty: num(r.QtyProduced, 0),
      itemName: String(r.ItemName || r.name || ''),
      qtyRejected: num(r.QtyRejected, 0),
      rejectPct: num((r as any)['Reject%'], 0),
      male: num((r as any).Male, 0),
      female: num((r as any).Female, 0),
      operator: String((r as any).Name || (r as any).Operator || ''),
    }));

    const totalAvailable = stockItems.reduce((s: number, x: any) => s + num(x.available, 0), 0);
    const totalReserved = stockItems.reduce((s: number, x: any) => s + num(x.reserved, 0), 0);
    const incoming14d = stockItems.reduce((s: number, x: any) => s + num(x.incoming14d, 0), 0);
    const openPOs = purchaseOrders.filter((p: any) => p.linesOpen > 0).length;
    const pendingOrders = salesOrders.length;
    const lateItemsCount = purchaseOrders.filter((p: any) => p.isLate).length;
    const dashboardKPIs = [
      { id: 'available', label: 'Available', value: totalAvailable, unit: 'units', trend: 'neutral' },
      { id: 'reserved', label: 'Reserved', value: totalReserved, unit: 'units', trend: 'neutral' },
      { id: 'incoming', label: 'Incoming ≤14d', value: incoming14d, unit: 'units', trend: 'neutral' },
      { id: 'open-pos', label: 'Open POs', value: openPOs, trend: 'neutral' },
      { id: 'pending-orders', label: 'Orders Pending', value: pendingOrders, trend: 'neutral' },
      { id: 'late-items', label: 'Late Items', value: lateItemsCount, trend: 'neutral' },
    ];

    const morningListItems: any[] = [];
    for (const p of purchaseOrders.filter((x: any) => x.isLate).slice(0, 3)) {
      morningListItems.push({ id: `po-${p.poNumber}`, type: 'overdue', severity: 'critical', title: `${p.poNumber} overdue`, description: `Vendor: ${p.vendor}`, reference: p.poNumber });
    }
    for (const s of stockItems.filter((x: any) => x.available <= 0).slice(0, 3)) {
      morningListItems.push({ id: `out-${s.sku}`, type: 'stockout', severity: 'critical', title: `${s.sku} out of stock`, description: s.description, reference: s.sku });
    }
    const recentActivity: any[] = [];
    for (const r of receiptsOut.slice(-5)) { recentActivity.push({ id: `rec-${r.id}`, type: 'receipt', timestamp: r.date + 'T00:00:00', description: `Received ${r.poNumber}`, sku: r.sku, qty: r.qty, reference: r.poNumber }); }
    for (const p of productionOut.slice(-5)) { recentActivity.push({ id: `prod-${p.id}`, type: 'production', timestamp: p.date + 'T00:00:00', description: `Prod ${p.line}`, sku: p.sku, qty: p.qty, reference: p.id }); }

    const header = `// LIVE module generated from Excel at ${new Date().toISOString()}\nimport type { KPI, MorningListItem, ExpediteItem, ActivityItem, SalesOrder, PurchaseOrder, Receipt, ProductionRecord, StockItem, BOMLine } from './types';\n`;
    function ex(name: string, v: any, ts: string) { return `\nexport const ${name}: ${ts} = ${JSON.stringify(v, null, 2)};\n`; }
    const expediteItems: any[] = purchaseOrders.filter((p: any) => p.isLate).slice(0, 10).map((p: any, i: number) => ({ id: String(i + 1), type: 'late-po', severity: 'critical', reference: p.poNumber, description: `Vendor ${p.vendor}`, daysLate: p.aging }));
    const bomLines = bom.map((r:any) => ({
      parent: String(r.ParentPartNo || r.parent || ''),
      component: String(r.ComponentPartNo || r.component || ''),
      qtyPer: Number((r as any).QtyPer ?? (r as any).qtyPer ?? 0) || 0,
      scrapPct: (r as any).ScrapPct !== undefined && (r as any).ScrapPct !== '' ? Number((r as any).ScrapPct) : undefined,
      altGroup: (r as any).AltGroup !== undefined ? String((r as any).AltGroup) : undefined,
    })).filter((b:any) => b.parent && b.component && b.qtyPer > 0);

    const excelDebug = {
      dataDir,
      masterPath,
      counts: {
        finishedGoods: finishedGoods.length,
        rawMaterials: rawMaterials.length,
        bom: bom.length,
        bomLines: bomLines.length,
        poCombined: poCombined.length,
        soCombined: soCombined.length,
        receipts: receiptsSheet.length,
        production: productionSheet.length,
        movements: movements.length,
      },
      sample: {
        finishedGoods: finishedGoods.slice(0, 3),
        poCombined: poCombined.slice(0, 2),
        soCombined: soCombined.slice(0, 2),
      },
    };

    return [
      header,
      ex('dashboardKPIs', dashboardKPIs, 'KPI[]'),
      ex('morningListItems', morningListItems, 'MorningListItem[]'),
      ex('expediteItems', expediteItems, 'ExpediteItem[]'),
      ex('recentActivity', recentActivity, 'ActivityItem[]'),
      ex('salesOrders', salesOrders, 'SalesOrder[]'),
      ex('purchaseOrders', purchaseOrders, 'PurchaseOrder[]'),
      ex('receipts', receiptsOut, 'Receipt[]'),
      ex('productionRecords', productionOut, 'ProductionRecord[]'),
      ex('stockItems', stockItems, 'StockItem[]'),
      ex('bomLines', bomLines, 'BOMLine[]'),
      ex('excelDebug', excelDebug, 'any'),
    ].join('\n');
  }

  return {
    name: 'excel-live-data',
    apply: 'serve',
    load(id: string) {
      if (path.resolve(id) === targetId) {
        try { return buildModule(); } catch (e) { console.error('excel-live-data error:', e); }
      }
    },
    configureServer(server) {
      server.watcher.add(dataDir);
      server.watcher.on('change', (file) => {
        if (/\.(xls|xlsx)$/i.test(file)) {
          dbg('file changed →', file);
          const mod = server.moduleGraph.getModuleById(targetId);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      });

      // Simple JSON body parser
      function parseJson(req: any): Promise<any> {
        return new Promise((resolve) => {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
          });
        });
      }

      // POST /api/save-plan → writes to Production.xlsx → sheet 'line_plan'
      server.middlewares.use('/api/save-plan', async (req: any, res: any) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed'); }
        try {
          const payload = await parseJson(req);
          const rows = Array.isArray(payload?.rows) ? payload.rows : [];
          if (rows.length === 0) { res.statusCode = 400; return res.end('No rows'); }

          // Use exact workbook: Production.xlsx
          const prodPath = path.join(dataDir, 'Production.xlsx');
          let wb: XLSX.WorkBook;
          if (fs.existsSync(prodPath)) wb = XLSX.readFile(prodPath); else wb = XLSX.utils.book_new();

          // Helper to append rows to a sheet, creating header if needed
          const HEADERS = ['Date','Line','SKU','ItemName','Qty'];
          function ensureSheet(name: string) {
            let ws = wb.Sheets[name as any];
            if (!ws) {
              ws = XLSX.utils.json_to_sheet([], { header: HEADERS });
              // write header row manually to preserve order
              XLSX.utils.sheet_add_aoa(ws, [HEADERS], { origin: 'A1' });
              wb.SheetNames.push(name);
              wb.Sheets[name] = ws;
            }
            return ws;
          }
          function appendRows(name: string, items: any[]) {
            const ws = ensureSheet(name);
            const mapped = items.map((r: any) => ({
              Date: String(r.date || ''),
              Line: String(r.line || ''),
              SKU: String(r.sku || ''),
              ItemName: String(r.name || ''),
              Qty: Number(r.qty || 0),
            }));
            XLSX.utils.sheet_add_json(ws, mapped, { origin: -1, skipHeader: true, header: HEADERS });
          }
          appendRows('line_plan', rows);

          XLSX.writeFile(wb, prodPath);
          // Reopen to confirm row count for feedback
          const verify = XLSX.readFile(prodPath);
          const sheetNames = verify.SheetNames.filter(n => /^line_plan$/i.test(n));
          const counts: Record<string, number> = {};
          for (const s of sheetNames) {
            const arr = XLSX.utils.sheet_to_json(verify.Sheets[s] as any, { defval: '' }) as any[];
            counts[s] = arr.length; // includes header row? json_to_sheet defval prevents header; we wrote data rows only
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, path: prodPath, sheet: 'line_plan', appended: rows.length, rowsAfter: counts['line_plan'] ?? null }));
        } catch (e: any) {
          console.error('save-plan error', e);
          res.statusCode = 500;
          res.end('Error saving plan');
        }
      });
    },
  } as any;
}

export default defineConfig(({ command }) => ({
  plugins: [react(), excelLiveDataPlugin()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'class-variance-authority@0.7.1': 'class-variance-authority',
      'embla-carousel-react@8.6.0': 'embla-carousel-react',
      'cmdk@1.1.1': 'cmdk',
      'lucide-react@0.487.0': 'lucide-react',
      'react-resizable-panels@2.1.7': 'react-resizable-panels',
      'react-hook-form@7.55.0': 'react-hook-form',
      'react-day-picker@8.10.1': 'react-day-picker',
      'next-themes@0.4.6': 'next-themes',
      'input-otp@1.4.2': 'input-otp',
      'recharts@2.15.2': 'recharts',
      'sonner@2.0.3': 'sonner',
      'vaul@1.1.2': 'vaul',
      '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
      '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
      '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
      '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
      '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
      '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
      '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
      '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
      '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
      '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
      '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
      '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
      '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
      '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
      '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
      '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
      '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
      '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
      '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
      '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
      '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
      '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
    },
  },
  build: { target: 'esnext', outDir: 'build' },
  server: { port: 3000, open: true },
}));
