import { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { MorningList } from './MorningList';
import type { TabId, TimeRange } from '../../lib/types';
import { morningListItems } from '../../lib/data';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

interface AppHeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Orders to Fulfil' },
  { id: 'purchase-orders', label: 'Purchase Orders' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'production', label: 'Production' },
  { id: 'stock', label: 'Stock' },
  { id: 'bom', label: 'BOM/Capacity' },
  { id: 'search', label: 'Search' },
];

const timeRanges: TimeRange[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export function AppHeader({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
}: AppHeaderProps) {
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="px-4 py-3 space-y-3">
        {/* Top row: Logo, Search, Actions */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <h1 className="text-xl">Inventory Ops</h1>
          </div>
          
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, PO, SO, vendor, customer..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Select
              value={timeRange.days.toString()}
              onValueChange={(value) => {
                const range = timeRanges.find(r => r.days.toString() === value);
                if (range) onTimeRangeChange(range);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.days} value={range.days.toString()}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <MorningList items={morningListItems} />
          </div>
        </div>

        {/* Bottom row: Horizontal tabs */}
        <ScrollArea className="w-full">
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className="whitespace-nowrap"
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </header>
  );
}
