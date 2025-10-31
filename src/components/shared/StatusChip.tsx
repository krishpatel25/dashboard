import { Badge } from '../ui/badge';
import type { StockStatus, OrderStatus, Priority } from '@/lib/types';

interface StatusChipProps {
  status: StockStatus | OrderStatus | Priority | string;
  type?: 'stock' | 'order' | 'priority' | 'default';
}

export function StatusChip({ status, type = 'default' }: StatusChipProps) {
  const getVariant = () => {
    if (type === 'stock') {
      switch (status) {
        case 'Healthy':
          return 'default';
        case 'Low':
          return 'secondary';
        case 'Out':
          return 'destructive';
        default:
          return 'outline';
      }
    }
    
    if (type === 'order') {
      switch (status) {
        case 'Open':
          return 'default';
        case 'Partial':
          return 'secondary';
        case 'Closed':
          return 'outline';
        default:
          return 'outline';
      }
    }
    
    if (type === 'priority') {
      switch (status) {
        case 'High':
          return 'destructive';
        case 'Medium':
          return 'default';
        case 'Low':
          return 'secondary';
        default:
          return 'outline';
      }
    }
    
    return 'outline';
  };

  return (
    <Badge variant={getVariant()}>
      {status}
    </Badge>
  );
}
