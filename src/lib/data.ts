// GENERATED FILE. Do not edit by hand.
import type { KPI, MorningListItem, ExpediteItem, ActivityItem, SalesOrder, PurchaseOrder, Receipt, ProductionRecord, StockItem, BOMLine } from './types';


export const dashboardKPIs: KPI[] = [
  {
    "id": "available",
    "label": "Available",
    "value": 0,
    "unit": "units",
    "trend": "neutral"
  },
  {
    "id": "reserved",
    "label": "Reserved",
    "value": 0,
    "unit": "units",
    "trend": "neutral"
  },
  {
    "id": "incoming",
    "label": "Incoming ≤14d",
    "value": 0,
    "unit": "units",
    "trend": "neutral"
  },
  {
    "id": "open-pos",
    "label": "Open POs",
    "value": 1,
    "trend": "neutral"
  },
  {
    "id": "pending-orders",
    "label": "Orders Pending",
    "value": 2,
    "trend": "neutral"
  },
  {
    "id": "late-items",
    "label": "Late Items",
    "value": 0,
    "trend": "neutral"
  }
];


export const morningListItems: MorningListItem[] = [
  {
    "id": "out-FG-100",
    "type": "stockout",
    "severity": "critical",
    "title": "FG-100 out of stock",
    "description": "Widget Alpha",
    "reference": "FG-100"
  },
  {
    "id": "out-RM-200",
    "type": "stockout",
    "severity": "critical",
    "title": "RM-200 out of stock",
    "description": "Steel Bracket",
    "reference": "RM-200"
  }
];


export const expediteItems: ExpediteItem[] = [];


export const recentActivity: ActivityItem[] = [
  {
    "id": "prod-1",
    "type": "production",
    "timestamp": "T00:00:00",
    "description": "Prod Line A",
    "sku": "",
    "qty": 0,
    "reference": "1"
  },
  {
    "id": "prod-2",
    "type": "production",
    "timestamp": "T00:00:00",
    "description": "Prod Line B",
    "sku": "",
    "qty": 0,
    "reference": "2"
  },
  {
    "id": "prod-3",
    "type": "production",
    "timestamp": "T00:00:00",
    "description": "Prod Line A",
    "sku": "",
    "qty": 0,
    "reference": "3"
  },
  {
    "id": "prod-4",
    "type": "production",
    "timestamp": "T00:00:00",
    "description": "Prod Line C",
    "sku": "",
    "qty": 0,
    "reference": "4"
  },
  {
    "id": "prod-5",
    "type": "production",
    "timestamp": "T00:00:00",
    "description": "Prod Line A",
    "sku": "",
    "qty": 0,
    "reference": "5"
  }
];


export const salesOrders: SalesOrder[] = [
  {
    "id": "1",
    "soNumber": "SO-9001",
    "customer": "North Retail",
    "promiseDate": "2025-10-18",
    "priority": "Medium",
    "sku": "FG-100",
    "qtyOrdered": 10,
    "allocated": 0,
    "gap": 10,
    "coveragePercent": 0,
    "age": 12
  },
  {
    "id": "2",
    "soNumber": "SO-9002",
    "customer": "GlobalMart",
    "promiseDate": "2025-10-19",
    "priority": "Medium",
    "sku": "FG-100",
    "qtyOrdered": 76,
    "allocated": 0,
    "gap": 76,
    "coveragePercent": 0,
    "age": 11
  }
];


export const purchaseOrders: PurchaseOrder[] = [
  {
    "id": "1",
    "poNumber": "6100765509",
    "vendor": "CLASSIC IMPORTS PVT LTD(GUJ) 25-26",
    "dueDate": "",
    "linesOpen": 2,
    "ordered": 0,
    "received": 116,
    "percentReceived": 100,
    "lastReceipt": "2025-10-05",
    "aging": 25,
    "isLate": false
  }
];


export const receipts: Receipt[] = [];


export const productionRecords: ProductionRecord[] = [
  {
    "id": "1",
    "date": "",
    "line": "Line A",
    "sku": "",
    "qty": 0,
    "shift": "Day"
  },
  {
    "id": "2",
    "date": "",
    "line": "Line B",
    "sku": "",
    "qty": 0,
    "shift": "Night"
  },
  {
    "id": "3",
    "date": "",
    "line": "Line A",
    "sku": "",
    "qty": 0,
    "shift": "Day"
  },
  {
    "id": "4",
    "date": "",
    "line": "Line C",
    "sku": "",
    "qty": 0,
    "shift": "Day"
  },
  {
    "id": "5",
    "date": "",
    "line": "Line A",
    "sku": "",
    "qty": 0,
    "shift": "Night"
  }
];


export const stockItems: StockItem[] = [
  {
    "id": "1",
    "sku": "FG-100",
    "description": "Widget Alpha",
    "category": "Finished Goods",
    "onHand": 0,
    "reserved": 0,
    "available": 0,
    "incoming14d": 0,
    "min": 10,
    "max": 100,
    "status": "Out",
    "lastMovement": "2025-10-20",
    "location": "A1"
  },
  {
    "id": "2",
    "sku": "RM-200",
    "description": "Steel Bracket",
    "category": "Raw Materials",
    "onHand": 0,
    "reserved": 0,
    "available": 0,
    "incoming14d": 0,
    "min": 50,
    "max": 500,
    "status": "Out",
    "lastMovement": "2025-10-19",
    "location": "B1"
  }
];


export const bomLines: BOMLine[] = [
  {
    "parent": "FG-100",
    "component": "RM-200",
    "qtyPer": 2,
    "scrapPct": 0,
    "altGroup": ""
  }
];


export const excelDebug: any = {
  "dataDir": "/Users/apple/Downloads/Read-Only Inventory Ops Dashboard/data/connected-workbooks",
  "masterPath": "/Users/apple/Downloads/Read-Only Inventory Ops Dashboard/data/connected-workbooks/MasterData.xlsx",
  "counts": {
    "finishedGoods": 0,
    "rawMaterials": 0,
    "legacyItems": 2,
    "bom": 1,
    "bomLines": 1,
    "PO_Combined": 2,
    "SO_Combined": 2,
    "Trascations": 0,
    "Production": 5,
    "Movements": 17
  },
  "sample": {
    "finishedGoods": [],
    "poCombined": [
      {
        "FileName": "GJ-727.pdf",
        "FileLink": "https://uillinoisedu.sharepoint.com/sites/test-1/Shared%20Documents/Invoices/Processed/GJ-727.pdf",
        "VendorName": "CLASSIC IMPORTS PVT LTD(GUJ) 25-26",
        "InvoiceId": "25-26/CI/GJ-727",
        "PurchaseOrder": "6100765509",
        "InvoiceDate": "2025-10-05",
        "ProductDescription": "Croma 4 Slice Grill S/W maker\r\nAK6204 CRSK4SGTSA307504",
        "ProductCode": "85167200",
        "Quantity": 48,
        "Unit": "PCS",
        "part no.": "85167200"
      },
      {
        "FileName": "GJ-727.pdf",
        "FileLink": "https://uillinoisedu.sharepoint.com/sites/test-1/Shared%20Documents/Invoices/Processed/GJ-727.pdf",
        "VendorName": "CLASSIC IMPORTS PVT LTD(GUJ) 25-26",
        "InvoiceId": "25-26/CI/GJ-727",
        "PurchaseOrder": "6100765509",
        "InvoiceDate": "2025-10-05",
        "ProductDescription": "Croma 1500W Griller AK6201\r\nCRSK15GTSA307501",
        "ProductCode": "85167200",
        "Quantity": 68,
        "Unit": "PCS",
        "part no.": "85167200"
      }
    ],
    "soCombined": [
      {
        "FileName": "INV-9001.pdf",
        "FileLink": "https://contoso.sharepoint.com/sites/test/Docs/INV-9001.pdf",
        "VendorName": "North Retail",
        "InvoiceId": "INV-9001",
        "PurchaseOrder": "SO-9001",
        "InvoiceDate": "2025-10-18",
        "ProductDescription": "Widget Alpha 2-pack",
        "ProductCode": "FG-100",
        "Quantity": 10,
        "Unit": "EA",
        "part no.": "FG-100"
      },
      {
        "FileName": "INV-9002.pdf",
        "FileLink": "https://contoso.sharepoint.com/sites/test/Docs/INV-9002.pdf",
        "VendorName": "GlobalMart",
        "InvoiceId": "INV-9002",
        "PurchaseOrder": "SO-9002",
        "InvoiceDate": "2025-10-19",
        "ProductDescription": "Widget Alpha single",
        "ProductCode": "FG-100",
        "Quantity": 76,
        "Unit": "EA",
        "part no.": "FG-100"
      }
    ]
  }
};
