/*
  Generates three Excel workbooks with linked structure:
  - data/connected-workbooks/MasterData.xlsx
  - data/connected-workbooks/Transactions.xlsx
  - data/connected-workbooks/Inventory.xlsx (with cross-workbook formulas)

  Usage: npm run generate:workbooks
*/

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const outDir = path.join(__dirname, '..', 'data', 'connected-workbooks');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function makeWorkbook(sheets) {
  const wb = XLSX.utils.book_new();
  for (const { name, data } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return wb;
}

function writeWorkbook(wb, filepath) {
  XLSX.writeFile(wb, filepath, { bookType: 'xlsx' });
}

function genMasterData() {
  const items = [
    [
      'PartNo','PartName','Category','UoM','Status','Min','Max','DefaultVendor','LeadTimeDays','Location','Notes'
    ],
    ['FG-100','Widget Alpha','Finished Goods','ea','Healthy',10,100,'VEND-1',7,'A1','Demo FG'],
    ['RM-200','Steel Bracket','Raw Materials','ea','Healthy',50,500,'VEND-1',5,'B1','Demo RM']
  ];

  const bom = [
    ['ParentPartNo','ComponentPartNo','QtyPer','ScrapPct','EffectiveFrom','EffectiveTo','AltGroup'],
    ['FG-100','RM-200',2,0,'2025-10-01','','']
  ];

  const vendors = [
    ['VendorCode','VendorName'],
    ['VEND-1','Acme Corp'],
    ['VEND-2','Parts Plus'],
    ['VEND-3','Supplier Co'],
    ['VEND-4','Global Metals'],
    ['VEND-5','Tech Components']
  ];

  const customers = [
    ['CustomerCode','CustomerName'],
    ['CUST-1','North Retail'],
    ['CUST-2','GlobalMart'],
    ['CUST-3','TechDist'],
    ['CUST-4','Local Stores'],
    ['CUST-5','QuickShop']
  ];

  const wb = makeWorkbook([
    { name: 'Items', data: items },
    { name: 'BOM', data: bom },
    { name: 'Vendors', data: vendors },
    { name: 'Customers', data: customers },
  ]);

  writeWorkbook(wb, path.join(outDir, 'MasterData.xlsx'));
}

function genTransactions() {
  // Build combined PO and SO views directly from AI staging workbook
  const aiPath = path.join(outDir, 'AI_Staging.xlsx');
  const aiWb = XLSX.readFile(aiPath);

  // Purchases AI extract → PO_Combined (standardized headers)
  const wsAI = aiWb.Sheets['AI_Extract'];
  const aiRows = wsAI ? XLSX.utils.sheet_to_json(wsAI, { defval: '' }) : [];

  const poCombinedHeader = [
    'FileName','FileLink','VendorName','InvoiceId','PurchaseOrder','InvoiceDate','ProductDescription','ProductCode','Quantity','Unit','part no.'
  ];
  const poCombinedRows = [poCombinedHeader];
  for (const row of aiRows) {
    poCombinedRows.push([
      String(row.FileName || ''),
      String(row.FileLink || ''),
      String(row.VendorName || ''),
      String(row.InvoiceId || ''),
      String(row.PurchaseOrder || row.PONumber || ''),
      String(row.InvoiceDate || ''),
      String(row.ProductDescription || ''),
      String(row.ProductCode || ''),
      Number(row.Quantity || 0),
      String(row.Unit || ''),
      String(row['part no.'] || row.ProductCode || ''),
    ]);
  }

  // Sales AI extract → SO_Combined (same standardized headers)
  const wsAISales = aiWb.Sheets['AI_Extract_Sales'];
  const aiSalesRows = wsAISales ? XLSX.utils.sheet_to_json(wsAISales, { defval: '' }) : [];
  const soCombinedHeader = poCombinedHeader.slice();
  const soCombinedRows = [soCombinedHeader];
  for (const row of aiSalesRows) {
    soCombinedRows.push([
      String(row.FileName || ''),
      String(row.FileLink || ''),
      String(row.CustomerName || ''), // mapped into VendorName column name
      String(row.InvoiceId || ''),
      String(row.SalesOrder || row.SONumber || ''), // mapped into PurchaseOrder column name
      String(row.InvoiceDate || ''),
      String(row.ProductDescription || ''),
      String(row.ProductCode || ''),
      Number(row.Quantity || 0),
      String(row.Unit || ''),
      String(row['part no.'] || row.ProductCode || ''),
    ]);
  }

  const receipts = [
    ['ReceiptID','Date','PONumber','LineNo','PartNo','QtyReceived','Receiver','Variance','Remarks'],
    ['R-1','2025-10-12','PO-1003',1,'RM-200',60,'John',0,'First half'],
    ['R-2','2025-10-14','PO-1003',1,'RM-200',60,'Jane',0,'Closing'],
    ['R-3','2025-10-15','PO-1001',1,'RM-200',40,'John',-10,'Short vs expected'],
    ['R-4','2025-10-16','PO-1004',1,'RM-200',20,'Jane',0,'Early'],
    ['R-5','2025-10-19','PO-1005',1,'RM-200',10,'John',0,'Partial'],
  ];

  const production = [
    ['ProdID','Date','Line','FGPartNo','Qty','Shift'],
    ['P-1','2025-10-15','Line A','FG-100',20,'Day'],
    ['P-2','2025-10-16','Line B','FG-100',20,'Night'],
    ['P-3','2025-10-17','Line A','FG-100',15,'Day'],
    ['P-4','2025-10-18','Line C','FG-100',15,'Day'],
    ['P-5','2025-10-19','Line A','FG-100',10,'Night'],
  ];

  // Movements: ledger of qty deltas
  const movements = [
    ['MoveID','Date','PartNo','MovementType','QtyDelta','RefType','RefNo','Location'],
    // Receipts (RM in)
    ['M-1','2025-10-12','RM-200','Receipt', 60,'PO','PO-1003','B1'],
    ['M-2','2025-10-14','RM-200','Receipt', 60,'PO','PO-1003','B1'],
    ['M-3','2025-10-15','RM-200','Receipt', 40,'PO','PO-1001','B1'],
    ['M-4','2025-10-16','RM-200','Receipt', 20,'PO','PO-1004','B1'],
    ['M-5','2025-10-19','RM-200','Receipt', 10,'PO','PO-1005','B1'],
    // Production issues (RM out, 2 per FG)
    ['M-6','2025-10-15','RM-200','Issue',  -40,'PROD','P-1','B1'],
    ['M-7','2025-10-16','RM-200','Issue',  -40,'PROD','P-2','B1'],
    ['M-8','2025-10-17','RM-200','Issue',  -30,'PROD','P-3','B1'],
    ['M-9','2025-10-18','RM-200','Issue',  -30,'PROD','P-4','B1'],
    ['M-10','2025-10-19','RM-200','Issue', -20,'PROD','P-5','B1'],
    // Production completions (FG in)
    ['M-11','2025-10-15','FG-100','ProdIn', 20,'PROD','P-1','A1'],
    ['M-12','2025-10-16','FG-100','ProdIn', 20,'PROD','P-2','A1'],
    ['M-13','2025-10-17','FG-100','ProdIn', 15,'PROD','P-3','A1'],
    ['M-14','2025-10-18','FG-100','ProdIn', 15,'PROD','P-4','A1'],
    ['M-15','2025-10-19','FG-100','ProdIn', 10,'PROD','P-5','A1'],
    // Shipments (FG out)
    ['M-16','2025-10-19','FG-100','Dispatch',-10,'SO','SO-2001','Ship'],
    ['M-17','2025-10-20','FG-100','Dispatch',-15,'SO','SO-2002','Ship'],
  ];

  const wb = makeWorkbook([
    { name: 'Receipts', data: receipts },
    { name: 'Production', data: production },
    { name: 'Movements', data: movements },
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(poCombinedRows), 'PO_Combined');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(soCombinedRows), 'SO_Combined');

  writeWorkbook(wb, path.join(outDir, 'Transactions.xlsx'));
}

function genInventory() {
  const stockHeader = ['PartNo','PartName','Category','OnHand','Reserved','Available','Incoming14d','Min','Max','Status','LastMovement','Location'];
  const rows = [
    ['FG-100', '', '', null, null, null, null, null, null, '', null, ''],
    ['RM-200', '', '', null, null, null, null, null, null, '', null, ''],
  ];
  const data = [stockHeader, ...rows];
  const wb = makeWorkbook([{ name: 'StockSnapshot', data }]);
  const ws = wb.Sheets['StockSnapshot'];

  // Fill lookups to MasterData.xlsx
  // Use INDEX/MATCH for broad Excel compatibility (avoids XLOOKUP requirement)
  // Row 2 and 3 (two items)
  for (let r = 2; r <= 3; r++) {
    ws['B' + r] = { t: 's', f: `IFERROR(INDEX('[MasterData.xlsx]Items'!$B:$B, MATCH($A${r}, '[MasterData.xlsx]Items'!$A:$A, 0)), "")` }; // PartName
    ws['C' + r] = { t: 's', f: `IFERROR(INDEX('[MasterData.xlsx]Items'!$C:$C, MATCH($A${r}, '[MasterData.xlsx]Items'!$A:$A, 0)), "")` }; // Category
    ws['H' + r] = { t: 'n', f: `IFERROR(INDEX('[MasterData.xlsx]Items'!$F:$F, MATCH($A${r}, '[MasterData.xlsx]Items'!$A:$A, 0)), 0)` }; // Min
    ws['I' + r] = { t: 'n', f: `IFERROR(INDEX('[MasterData.xlsx]Items'!$G:$G, MATCH($A${r}, '[MasterData.xlsx]Items'!$A:$A, 0)), 0)` }; // Max
    ws['L' + r] = { t: 's', f: `IFERROR(INDEX('[MasterData.xlsx]Items'!$J:$J, MATCH($A${r}, '[MasterData.xlsx]Items'!$A:$A, 0)), "")` }; // Location

    // OnHand = SUMIFS over Movements
    ws['D' + r] = { t: 'n', f: `SUMIFS('[Transactions.xlsx]Movements'!$E:$E,'[Transactions.xlsx]Movements'!$C:$C,$A${r})` };
    // Reserved not derivable from standardized SO_Combined (no allocated) → 0
    ws['E' + r] = { t: 'n', f: `0` };
    // Available = OnHand - Reserved
    ws['F' + r] = { t: 'n', f: `D${r}-E${r}` };
    // Incoming14d not available from AI invoice extract → 0 by default
    ws['G' + r] = { t: 'n', f: `0` };
    // Status based on Available vs Min
    ws['J' + r] = { t: 's', f: `IF(F${r}<=0,"Out",IF(F${r}<H${r},"Low","Healthy"))` };
    // LastMovement: LOOKUP last matching date (avoids MAXIFS for compatibility)
    ws['K' + r] = { t: 'n', f: `IFERROR(LOOKUP(2,1/('[Transactions.xlsx]Movements'!$C:$C=$A${r}),'[Transactions.xlsx]Movements'!$B:$B),"")` };
  }

  writeWorkbook(wb, path.join(outDir, 'Inventory.xlsx'));
}

function genAIStaging() {
  const aiExtract = [
    [
      'FileName','FileLink','VendorName','InvoiceId','PurchaseOrder','InvoiceDate','ProductDescription','ProductCode','Quantity','Unit','LineAmount','Confidence','Status','Timestamp'
    ],
    [
      'GJ-727.pdf',
      'https://uillinoisedu.sharepoint.com/sites/test-1/Shared%20Documents/Invoices/Processed/GJ-727.pdf',
      'CLASSIC IMPORTS PVT LTD(GUJ) 25-26',
      '25-26/CI/GJ-727',
      '6100765509',
      '2025-10-05',
      'Croma 4 Slice Grill S/W maker\nAK6204 CRSK4SGTSA307504',
      '85167200',
      48,
      'PCS',
      71568,
      1,
      'succeeded',
      '2025-10-12T09:58:14.7240620Z'
    ],
    [
      'GJ-727.pdf',
      'https://uillinoisedu.sharepoint.com/sites/test-1/Shared%20Documents/Invoices/Processed/GJ-727.pdf',
      'CLASSIC IMPORTS PVT LTD(GUJ) 25-26',
      '25-26/CI/GJ-727',
      '6100765509',
      '2025-10-05',
      'Croma 1500W Griller AK6201\nCRSK15GTSA307501',
      '85167200',
      68,
      'PCS',
      167688,
      1,
      'succeeded',
      '2025-10-12T09:58:14.7277722Z'
    ],
  ];

  // Sales AI extract sample
  const aiExtractSales = [
    [
      'FileName','FileLink','CustomerName','InvoiceId','SalesOrder','InvoiceDate','ProductDescription','ProductCode','Quantity','Unit','LineAmount','Confidence','Status','Timestamp'
    ],
    [
      'INV-9001.pdf',
      'https://contoso.sharepoint.com/sites/test/Docs/INV-9001.pdf',
      'North Retail',
      'INV-9001',
      'SO-9001',
      '2025-10-18',
      'Widget Alpha 2-pack',
      'FG-100',
      10,
      'EA',
      2500,
      1,
      'succeeded',
      '2025-10-18T08:00:00Z'
    ],
    [
      'INV-9002.pdf',
      'https://contoso.sharepoint.com/sites/test/Docs/INV-9002.pdf',
      'GlobalMart',
      'INV-9002',
      'SO-9002',
      '2025-10-19',
      'Widget Alpha single',
      'FG-100',
      15,
      'EA',
      3000,
      1,
      'succeeded',
      '2025-10-19T09:00:00Z'
    ],
  ];

  const wb = makeWorkbook([
    { name: 'AI_Extract', data: aiExtract },
    { name: 'AI_Extract_Sales', data: aiExtractSales },
  ]);
  writeWorkbook(wb, path.join(outDir, 'AI_Staging.xlsx'));
}

function main() {
  ensureDir(outDir);
  // Generate AI staging first so Transactions can fold it into combined tables
  genAIStaging();
  genMasterData();
  genTransactions();
  genInventory();
  console.log('Generated:');
  console.log(' - MasterData.xlsx');
  console.log(' - Transactions.xlsx');
  console.log(' - Inventory.xlsx');
  console.log(' - AI_Staging.xlsx');
  console.log('\nOpen Inventory.xlsx and allow external links to update.');
}

main();
