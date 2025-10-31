/*
  Build src/lib/data.ts from Excel workbooks in data/connected-workbooks.
  New schema (ground truth only):
  - MasterData.xls(x): sheets 'finished goods', 'raw material', 'bom'
  - A workbook containing PO_Combined and SO_Combined (standardized headers)
  - Optional workbook with 'trascations', 'Production', 'Movements'
  Output: src/lib/data.ts exporting constants matching the dashboard types.
*/

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const dataDir = process.env.EXCEL_DATA_DIR
  ? path.resolve(process.env.EXCEL_DATA_DIR)
  : path.join(root, 'data', 'connected-workbooks');
const outFile = path.join(root, 'src', 'lib', 'data.ts');
const DEBUG = process.env.EXCEL_DEBUG === '1' || process.env.EXCEL_DEBUG === 'true';

function dbg(...args){ if (DEBUG) console.log('[excel-debug]', ...args); }

function toDateOnly(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  // Accept formats like yyyy-mm-dd, m/d/yyyy
  const dt = new Date(s);
  if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
  // Try dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) {
    const [_, d1, m1, y1] = m;
    const dt2 = new Date(Number(y1.length === 2 ? '20' + y1 : y1), Number(m1) - 1, Number(d1));
    return dt2.toISOString().slice(0, 10);
  }
  return '';
}

function daysBetween(a, b) {
  const ms = 24 * 3600 * 1000;
  return Math.max(0, Math.floor((a - b) / ms));
}

function loadSheet(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function num(v, d = 0) {
  const n = Number(v);
  return isFinite(n) ? n : d;
}

function main() {
  function firstExisting(...names){ for(const n of names){ const p=path.join(dataDir,n); if(fs.existsSync(p)) return p; } return null; }
  const masterPath = firstExisting('MasterData.xls','MasterData.xlsx');
  if(!masterPath) throw new Error('MasterData.xls/xlsx not found in data/connected-workbooks');
  dbg('Using master workbook:', masterPath);
  const master = XLSX.readFile(masterPath);

  function findBookWithAny(names){
    const norm = (s)=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
    const targets = (Array.isArray(names) ? names : [names]).map(norm);
    const files = fs.readdirSync(dataDir).filter(f=>/\.xls[x]?$/i.test(f));
    for(const f of files){
      const wb = XLSX.readFile(path.join(dataDir,f));
      const set = new Set(wb.SheetNames.map(s=>norm(s)));
      for(const n of targets){ if(set.has(n)) return wb; }
    }
    return null;
  }
  const poBook = findBookWithAny(['PO_Combined']);
  const soBook = findBookWithAny(['SO_Combined']) || poBook;
  const miscBook = findBookWithAny(['trascations','Trascations','Transactions','Production','ProductionLog','Movements']) || poBook || soBook;
  dbg('Found PO workbook:', poBook ? 'yes' : 'no');
  dbg('Found SO workbook:', soBook ? 'yes' : 'no');
  dbg('Found Misc workbook:', miscBook ? 'yes' : 'no');

  function loadSheetAny(wb, names){
    if(!wb) return [];
    const norm = (s)=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
    const map = new Map(wb.SheetNames.map(n=>[norm(n), n]));
    for(const n of (Array.isArray(names)?names:[names])){ const key=norm(n); if(map.has(key)) return loadSheet(wb, map.get(key)); }
    return [];
  }
  const finishedGoods = loadSheetAny(master,['finishgoods']);
  const rawMaterials = loadSheetAny(master,['rawmaterial']);
  const bom = loadSheetAny(master,['bom','BOM']);
  // Back-compat: if both are empty, try legacy 'Items'
  const legacyItems = (finishedGoods.length===0 && rawMaterials.length===0) ? loadSheetAny(master,['Items']) : [];
  dbg('Sheet rows:', { finishedGoods: finishedGoods.length, rawMaterials: rawMaterials.length, legacyItems: legacyItems.length, bom: bom.length });
  if (finishedGoods && finishedGoods.length) {
    const preview = finishedGoods.slice(0, 5);
    dbg('finished goods preview (first 5 rows):');
    console.log(preview);
  } else {
    dbg('finished goods sheet not found or empty');
  }
  const poCombined = loadSheetAny(poBook,['PO_Combined']);
  const soCombined = loadSheetAny(soBook,['SO_Combined']);
  const receipts = loadSheetAny(miscBook,['trascations','Trascations','Transactions']);
  const production = loadSheetAny(miscBook,['ProductionLog','Production']);
  const movements = loadSheetAny(miscBook,['Movements']);
  dbg('Combined rows:', { PO_Combined: poCombined.length, SO_Combined: soCombined.length, Trascations: receipts.length, Production: production.length, Movements: movements.length });

  // Build stock snapshot from master qty as ground truth
  const onHand = new Map();
  const lastMove = new Map();
  const allItems = finishedGoods.concat(rawMaterials).concat(legacyItems);
  for (const r of allItems) {
    const sku = String(r.PartNo || '').trim();
    if (!sku) continue;
    onHand.set(sku, num(r.qty, 0));
  }
  // Optional last movement from Movements
  for (const m of movements) {
    const sku = String(m.PartNo || '').trim();
    if (!sku) continue;
    const dt = new Date(toDateOnly(m.Date) || '1970-01-01');
    if (!lastMove.has(sku) || lastMove.get(sku) < dt) lastMove.set(sku, dt);
  }

  const reserved = new Map();
  for (const s of soCombined) {
    // Standardized header: no allocated → default 0; you may set to Quantity if desired
    const sku = String((s['part no.'] || s.PartNo || s.ProductCode || '').toString().trim());
    if (!sku) continue;
    reserved.set(sku, (reserved.get(sku) || 0) + 0);
  }

  const today = new Date();
  const stockItems = allItems.map((it, idx) => {
    const sku = String(it.PartNo || '').trim();
    const oh = onHand.get(sku) || 0;
    const res = reserved.get(sku) || 0;
    const avail = oh - res;
    const min = num(it.Min, 0);
    const max = num(it.Max, 0);
    const status = avail <= 0 ? 'Out' : (avail < min ? 'Low' : 'Healthy');
    const lm = lastMove.get(sku);
    return {
      id: String(idx + 1),
      sku,
      description: String(it.PartName || it.ItemName || sku),
      category: String(it.Category || 'Raw Materials'),
      onHand: oh,
      reserved: res,
      available: avail,
      incoming14d: 0,
      min,
      max,
      status,
      lastMovement: lm ? lm.toISOString().slice(0, 10) : '',
      location: String(it.Location || ''),
    };
  });

  // Sales Orders (row per line)
  const salesOrders = soCombined.map((r, i) => {
    const soNum = String(r['SaleOrder No.'] || r.PurchaseOrder || r.SONumber || '');
    const cust = String(r.VendorName || r.CustomerName || '');
    const sku = String((r['part no.'] || r.ProductCode || '').toString());
    const qtyOrdered = num(r.Quantity ?? r.QtyOrdered, 0);
    const allocated = 0; // set to qtyOrdered if you want full coverage
    const gap = Math.max(0, qtyOrdered - allocated);
    const coveragePercent = qtyOrdered === 0 ? 0 : Math.round((allocated / qtyOrdered) * 100);
    const orderDate = new Date(toDateOnly(r['SO-date']) || toDateOnly(r.InvoiceDate) || today);
    const age = daysBetween(today, orderDate);
    return {
      id: String(i + 1),
      soNumber: soNum,
      customer: cust,
      promiseDate: toDateOnly(r['SO-date']) || toDateOnly(r.InvoiceDate) || '',
      priority: 'Medium',
      sku,
      qtyOrdered,
      allocated,
      gap,
      coveragePercent,
      age,
    };
  });

  // Purchase Orders (aggregate by PONumber)
  const poMap = new Map();
  for (const r of poCombined) {
    const po = String(r.PurchaseOrder || '').trim();
    if (!po) continue;
    const grp = poMap.get(po) || {
      id: po,
      poNumber: po,
      vendor: String(r.VendorName || r.VendorCode || ''),
      dueDate: toDateOnly(r['PO-date']) || '',
      linesOpen: 0,
      ordered: 0,
      received: 0,
      percentReceived: 0,
      lastReceipt: null,
      aging: 0,
      isLate: false,
      orderDate: toDateOnly(r.InvoiceDate) || '',
    };
    grp.received += num(r.Quantity ?? r.QtyReceived, 0);
    const qtyOrdered = num(r.QtyOrdered, 0); // unknown in standardized header
    grp.ordered += qtyOrdered;
    grp.linesOpen += 1;
    const recDate = toDateOnly(r.InvoiceDate);
    if (recDate && (!grp.lastReceipt || grp.lastReceipt < recDate)) grp.lastReceipt = recDate;
    // No open qty available without ordered qty
    poMap.set(po, grp);
  }
  const purchaseOrders = Array.from(poMap.values()).map((p, i) => {
    const orderDate = p.orderDate ? new Date(p.orderDate) : today;
    const aging = daysBetween(today, orderDate);
    const percent = p.ordered > 0 ? Math.round((p.received / p.ordered) * 100) : (p.received > 0 ? 100 : 0);
    return {
      id: String(i + 1),
      poNumber: p.poNumber,
      vendor: p.vendor,
      dueDate: p.dueDate,
      linesOpen: p.linesOpen,
      ordered: p.ordered,
      received: p.received,
      percentReceived: percent,
      lastReceipt: p.lastReceipt || null,
      aging,
      isLate: !!p.isLate,
    };
  });

  // Receipts
  const receiptsOut = receipts.map((r, i) => ({
    id: String(i + 1),
    date: toDateOnly(r['PO-date'] || r.InvoiceDate) || '',
    poNumber: String(r.PurchaseOrder || ''),
    vendor: String(r.VendorName || ''),
    sku: String(r.ProductCode || ''),
    qty: num(r.Quantity, 0),
    variance: 0,
    receiver: '',
    remarks: String(r.Status || ''),
  }));

  // Production
  const productionOut = production.map((r, i) => ({
    id: String(i + 1),
    date: toDateOnly(r.Timestamp) || toDateOnly(r.Date) || toDateOnly(r['ProductionDate']) || toDateOnly(r['Production Date']) || '',
    line: String(r.Line || ''),
    sku: String(r.ItemCode || ''),
    qty: num(r.QtyProduced, 0),
    itemName: String(r.ItemName || r.name || ''),
    qtyRejected: num(r.QtyRejected, 0),
    rejectPct: num(r['Reject%'], 0),
    male: num(r.Male, 0),
    female: num(r.Female, 0),
    operator: String(r.Name || r.Operator || ''),
  }));

  // KPIs from stock snapshot and counts
  const totalAvailable = stockItems.reduce((s, x) => s + num(x.available, 0), 0);
  const totalReserved = stockItems.reduce((s, x) => s + num(x.reserved, 0), 0);
  const incoming14d = stockItems.reduce((s, x) => s + num(x.incoming14d, 0), 0);
  const openPOs = purchaseOrders.filter(p => p.linesOpen > 0).length;
  const pendingOrders = salesOrders.length;
  const lateItems = purchaseOrders.filter(p => p.isLate).length;
  const dashboardKPIs = [
    { id: 'available', label: 'Available', value: totalAvailable, unit: 'units', trend: 'neutral' },
    { id: 'reserved', label: 'Reserved', value: totalReserved, unit: 'units', trend: 'neutral' },
    { id: 'incoming', label: 'Incoming ≤14d', value: incoming14d, unit: 'units', trend: 'neutral' },
    { id: 'open-pos', label: 'Open POs', value: openPOs, trend: 'neutral' },
    { id: 'pending-orders', label: 'Orders Pending', value: pendingOrders, trend: 'neutral' },
    { id: 'late-items', label: 'Late Items', value: lateItems, trend: 'neutral' },
  ];

  // Morning list: simple signals
  const morningListItems = [];
  for (const p of purchaseOrders.filter(x => x.isLate).slice(0, 3)) {
    morningListItems.push({
      id: `po-${p.poNumber}`,
      type: 'overdue',
      severity: 'critical',
      title: `${p.poNumber} overdue`,
      description: `Vendor: ${p.vendor}`,
      reference: p.poNumber,
    });
  }
  for (const s of stockItems.filter(x => x.available <= 0).slice(0, 3)) {
    morningListItems.push({
      id: `out-${s.sku}`,
      type: 'stockout',
      severity: 'critical',
      title: `${s.sku} out of stock`,
      description: s.description,
      reference: s.sku,
    });
  }

  const recentActivity = [];
  for (const r of receiptsOut.slice(-5)) {
    recentActivity.push({ id: `rec-${r.id}`, type: 'receipt', timestamp: r.date + 'T00:00:00', description: `Received ${r.poNumber}`, sku: r.sku, qty: r.qty, reference: r.poNumber });
  }
  for (const p of productionOut.slice(-5)) {
    recentActivity.push({ id: `prod-${p.id}`, type: 'production', timestamp: p.date + 'T00:00:00', description: `Prod ${p.line}`, sku: p.sku, qty: p.qty, reference: p.id });
  }

  const expediteItems = purchaseOrders.filter(p => p.isLate).slice(0, 10).map((p, i) => ({
    id: String(i + 1),
    type: 'late-po',
    severity: 'critical',
    reference: p.poNumber,
    description: `Vendor ${p.vendor}`,
    daysLate: p.aging,
  }));

  const header = `// GENERATED FILE. Do not edit by hand.\nimport type { KPI, MorningListItem, ExpediteItem, ActivityItem, SalesOrder, PurchaseOrder, Receipt, ProductionRecord, StockItem } from './types';\n`;
  const typeMap = {
    dashboardKPIs: 'KPI[]',
    morningListItems: 'MorningListItem[]',
    expediteItems: 'ExpediteItem[]',
    recentActivity: 'ActivityItem[]',
    salesOrders: 'SalesOrder[]',
    purchaseOrders: 'PurchaseOrder[]',
    receipts: 'Receipt[]',
    productionRecords: 'ProductionRecord[]',
    stockItems: 'StockItem[]',
  };
  function exportConst(name, value) {
    const tsType = typeMap[name] || 'any';
    return `\nexport const ${name}: ${tsType} = ${JSON.stringify(value, null, 2)};\n`;
  }

  const excelDebug = {
    dataDir,
    masterPath,
    counts: {
      finishedGoods: finishedGoods.length,
      rawMaterials: rawMaterials.length,
      legacyItems: legacyItems.length,
      bom: bom.length,
      PO_Combined: poCombined.length,
      SO_Combined: soCombined.length,
      Trascations: receipts.length,
      Production: production.length,
      Movements: movements.length,
    },
    sample: {
      finishedGoods: finishedGoods.slice(0, 3),
      poCombined: poCombined.slice(0, 2),
      soCombined: soCombined.slice(0, 2),
    }
  };

  const content = [
    header,
    exportConst('dashboardKPIs', dashboardKPIs),
    exportConst('morningListItems', morningListItems),
    exportConst('expediteItems', expediteItems),
    exportConst('recentActivity', recentActivity),
    exportConst('salesOrders', salesOrders),
    exportConst('purchaseOrders', purchaseOrders),
    exportConst('receipts', receiptsOut),
    exportConst('productionRecords', productionOut),
    exportConst('stockItems', stockItems),
    exportConst('excelDebug', excelDebug),
  ].join('\n');

  fs.writeFileSync(outFile, content, 'utf8');
  console.log('Wrote', path.relative(root, outFile));
}

main();
