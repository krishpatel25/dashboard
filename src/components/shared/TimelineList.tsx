import { Package, Send, Factory, FileEdit } from 'lucide-react';
import type { ActivityItem } from '@/lib/types';

interface TimelineListProps {
  activities: ActivityItem[];
}

export function TimelineList({ activities }: TimelineListProps) {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'receipt':
        return <Package className="w-4 h-4" />;
      case 'dispatch':
        return <Send className="w-4 h-4" />;
      case 'production':
        return <Factory className="w-4 h-4" />;
      case 'adjustment':
        return <FileEdit className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'receipt':
        return 'bg-blue-500';
      case 'dispatch':
        return 'bg-green-500';
      case 'production':
        return 'bg-purple-500';
      case 'adjustment':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `Today ${timeStr}`;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + timeStr;
  };

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          <div className="relative flex flex-col items-center">
            <div className={`${getColor(activity.type)} rounded-full p-2 text-white`}>
              {getIcon(activity.type)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-px h-full bg-border absolute top-8" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm">{activity.description}</p>
                {activity.sku && (
                  <p className="text-xs text-muted-foreground">
                    {activity.sku} • {activity.qty} units
                    {activity.reference && ` • ${activity.reference}`}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(activity.timestamp)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
