# Inventory Ops Dashboard

A read-only Inventory Operations Dashboard built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Designed iPad-first with responsive layouts for mobile and desktop.

## Features

### Global Features
- **Universal Search**: Search across SKUs, POs, SOs, vendors, and customers from the header
- **Time Range Filter**: Filter data by 7, 14, 30, or 90 days
- **CSV Export**: Export data from any table view
- **Morning List**: Quick view of critical issues (overdue items, stockouts, short receipts, orders without coverage)
- **Responsive Design**: Cards on mobile/tablet, tables on desktop

### Pages

#### Dashboard
- **KPI Cards**: Available stock, Reserved, Incoming ≤14d, Open POs, Orders Pending, Late Items (tappable to navigate to filtered views)
- **Expedite List**: Top 10 risks (late PO lines or orders with gaps)
- **Recent Activity Timeline**: Last receipts, dispatches, production runs

#### Orders to Fulfil (Sales Orders)
- Read-only view of sales orders
- Filters: Due date bucket (Today/≤7d/Late), Priority, Customer
- Group by: Order or SKU
- Columns: SO, Customer, Promise Date, Priority, SKU, Qty Ordered, Allocated, Gap, Coverage %, Age

#### Purchase Orders
- Read-only view of open purchase orders
- Filters: Vendor, "Show closed" toggle
- Columns: PO, Vendor, Due Date, Lines Open, Ordered, Received, % Received, Last Receipt, Aging
- Late badge for overdue POs

#### Receipts (Goods In)
- Receipt history with variance tracking
- Filters: Vendor, PO Number, 7/30-day views
- Columns: Date, PO, Vendor, SKU, Qty, Variance vs PO, Receiver, Remarks

#### Production
- Production output by Date × Line
- KPIs: Yesterday output, 7-day total, Best/Worst line
- Sparklines showing 7-day trend per line
- Drill-down: Click on any cell to see SKU breakdown

#### Stock
- Three tabs: Finished Goods, Raw Materials, WIP
- Status indicators: Healthy/Low/Out
- Columns: SKU, On-hand, Reserved, Available, Incoming ≤14d, Min/Max, Status, Last Movement, Location
- Summary cards showing totals and counts by status

#### BOM/Capacity
- "How many can we make?" calculator
- Select a finished good SKU
- Shows maximum buildable quantity based on current available inventory
- Highlights bottleneck components with shortfall details

#### Search
- Universal search results grouped by category
- Categories: Stock Items, Sales Orders, Purchase Orders, Receipts
- Shows relevant details for each result type

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS v4** for styling
- **shadcn/ui** components
- **Lucide React** icons

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
/
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx      # Top app bar with tabs and search
│   │   └── MorningList.tsx    # Critical issues drawer
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── OrdersToFulfil.tsx
│   │   ├── PurchaseOrders.tsx
│   │   ├── Receipts.tsx
│   │   ├── Production.tsx
│   │   ├── Stock.tsx
│   │   ├── BOMCapacity.tsx
│   │   └── Search.tsx
│   ├── shared/
│   │   ├── KpiChip.tsx        # Reusable KPI card
│   │   ├── StatusChip.tsx     # Status badges
│   │   ├── TimelineList.tsx   # Activity timeline
│   │   └── ExportButton.tsx   # CSV export button
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── types.ts               # TypeScript type definitions
│   ├── data.ts                # Mock data (replace with API calls)
│   └── csv-export.ts          # CSV export utility
├── styles/
│   └── globals.css            # Global styles and theme
└── App.tsx                    # Main application
```

## Customization

### Connecting to Real APIs

The dashboard currently uses stub data from `/lib/data.ts`. To connect to real APIs:

1. Create API client functions in a new `/lib/api.ts` file
2. Replace the mock data imports in each page component
3. Use React hooks (useState, useEffect) to fetch data
4. Add loading and error states as needed

Example:
```typescript
// lib/api.ts
export async function fetchSalesOrders() {
  const response = await fetch('/api/sales-orders');
  return response.json();
}

// In your component
const [orders, setOrders] = useState([]);
useEffect(() => {
  fetchSalesOrders().then(setOrders);
}, []);
```

### Theming

The dashboard supports light and dark mode via CSS variables in `/styles/globals.css`. The theme automatically follows the system preference.

To customize colors, modify the CSS variables in the `:root` (light mode) and `.dark` (dark mode) selectors.

### iPad-First Breakpoints

The dashboard uses Tailwind's responsive breakpoints:
- Mobile: default (< 768px) - Card layout
- Tablet/iPad: `md:` (≥ 768px) - Card or table layout
- Desktop: `lg:` (≥ 1024px) - Table layout with more columns

## Features for Future Development

- User authentication and role-based access
- Real-time updates via WebSocket
- Advanced filtering and saved views
- Charts and graphs for trend analysis
- Batch operations (when write access is added)
- Print-friendly views
- Offline support with local caching

## Accessibility

- Keyboard navigation supported throughout
- ARIA labels on interactive elements
- Focus management for dialogs and sheets
- High contrast mode compatible
- Screen reader friendly

## License

MIT
