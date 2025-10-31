import { Card } from '../ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { KPI } from '@/lib/types';

interface KpiChipProps {
  kpi: KPI;
  onClick?: () => void;
}

export function KpiChip({ kpi, onClick }: KpiChipProps) {
  const isClickable = !!onClick;
  
  const trendIcon = kpi.trend === 'up' ? (
    <ArrowUp className="w-3 h-3 text-green-600" />
  ) : kpi.trend === 'down' ? (
    <ArrowDown className="w-3 h-3 text-red-600" />
  ) : kpi.trend === 'neutral' ? (
    <Minus className="w-3 h-3 text-gray-400" />
  ) : null;

  return (
    <Card
      className={`p-4 ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{kpi.label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl">
            {kpi.value}
            {kpi.unit && <span className="text-sm text-muted-foreground ml-1">{kpi.unit}</span>}
          </p>
          {kpi.trendValue && (
            <div className="flex items-center gap-1 text-xs">
              {trendIcon}
              <span className={
                kpi.trend === 'up' ? 'text-green-600' :
                kpi.trend === 'down' ? 'text-red-600' :
                'text-gray-400'
              }>
                {kpi.trendValue}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
