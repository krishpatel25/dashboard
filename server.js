// Minimal Node server for Azure App Service
// - Serves built frontend from ./build
// - Provides POST /api/save-plan to append rows to Production.xlsx -> sheet 'line_plan'

const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
app.use(express.json());

// Static frontend
const buildDir = path.join(__dirname, 'build');
app.use(express.static(buildDir));

// Ensure writable Excel directory
const dataDir = process.env.EXCEL_DATA_DIR || path.join(__dirname, 'data', 'connected-workbooks');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Helper to append to line_plan
function appendPlanRows(prodPath, items) {
  const HEADERS = ['Date', 'Line', 'SKU', 'ItemName', 'Qty'];
  const wb = fs.existsSync(prodPath) ? XLSX.readFile(prodPath) : XLSX.utils.book_new();
  let ws = wb.Sheets['line_plan'];
  if (!ws) {
    ws = XLSX.utils.json_to_sheet([], { header: HEADERS });
    XLSX.utils.sheet_add_aoa(ws, [HEADERS], { origin: 'A1' });
    wb.SheetNames.push('line_plan');
    wb.Sheets['line_plan'] = ws;
  }
  const mapped = items.map((r) => ({
    Date: String(r.date || ''),
    Line: String(r.line || ''),
    SKU: String(r.sku || ''),
    ItemName: String(r.name || ''),
    Qty: Number(r.qty || 0),
  }));
  XLSX.utils.sheet_add_json(ws, mapped, { origin: -1, skipHeader: true, header: HEADERS });
  XLSX.writeFile(wb, prodPath);
  const verify = XLSX.readFile(prodPath);
  const arr = XLSX.utils.sheet_to_json(verify.Sheets['line_plan'], { defval: '' });
  return { rowsAfter: arr.length };
}

// Save Plan API
app.post('/api/save-plan', (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) return res.status(400).send('No rows');
    const prodPath = path.join(dataDir, 'Production.xlsx');
    const { rowsAfter } = appendPlanRows(prodPath, rows);
    res.json({ ok: true, path: prodPath, sheet: 'line_plan', appended: rows.length, rowsAfter });
  } catch (e) {
    console.error('save-plan error', e);
    res.status(500).send('Error saving plan');
  }
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server listening on port', port);
});

