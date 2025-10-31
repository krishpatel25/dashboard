import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { AlertCircle, Bell } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { MorningListItem } from '@/lib/types';

interface MorningListProps {
  items: MorningListItem[];
}

export function MorningList({ items }: MorningListProps) {
  const criticalCount = items.filter(item => item.severity === 'critical').length;
  
  const getIcon = (type: MorningListItem['type']) => {
    return <AlertCircle className="w-4 h-4" />;
  };

  const getColor = (severity: 'critical' | 'warning') => {
    return severity === 'critical' ? 'text-red-600' : 'text-orange-600';
  };

  const getTypeLabel = (type: MorningListItem['type']) => {
    switch (type) {
      case 'overdue':
        return 'Overdue';
      case 'stockout':
        return 'Stockout';
      case 'short-receipt':
        return 'Short Receipt';
      case 'no-coverage':
        return 'No Coverage';
      default:
        return type;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Bell className="w-4 h-4" />
          Morning List
          {criticalCount > 0 && (
            <Badge variant="destructive" className="ml-1 px-1.5 py-0 h-5 min-w-5">
              {criticalCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Morning List</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''} requiring attention
          </p>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border bg-card space-y-2"
            >
              <div className="flex items-start gap-3">
                <div className={`${getColor(item.severity)} mt-0.5`}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{item.title}</p>
                    <Badge variant={item.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                      {getTypeLabel(item.type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ref: {item.reference}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
