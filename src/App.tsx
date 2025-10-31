import { useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { Dashboard } from './components/pages/Dashboard';
import { OrdersToFulfil } from './components/pages/OrdersToFulfil';
import { PurchaseOrders } from './components/pages/PurchaseOrders';
import { Receipts } from './components/pages/Receipts';
import { Production } from './components/pages/Production';
import { Stock } from './components/pages/Stock';
import { BOMCapacity } from './components/pages/BOMCapacity';
import { Search } from './components/pages/Search';
import type { TabId, TimeRange } from './lib/types';
import { ExcelDebug } from './components/debug/ExcelDebug';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>({ label: 'Last 30 days', days: 30 });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'orders':
        return <OrdersToFulfil />;
      case 'purchase-orders':
        return <PurchaseOrders />;
      case 'receipts':
        return <Receipts />;
      case 'production':
        return <Production />;
      case 'stock':
        return <Stock />;
      case 'bom':
        return <BOMCapacity />;
      case 'search':
        return <Search query={searchQuery} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ExcelDebug />
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {renderContent()}
      </main>
    </div>
  );
}
