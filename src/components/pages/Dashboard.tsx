import { KpiChip } from '../shared/KpiChip';
import { TimelineList } from '../shared/TimelineList';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, Clock, Package } from 'lucide-react';
import { dashboardKPIs, expediteItems, recentActivity, salesOrders } from '../../lib/data';
import type { TabId } from '../../lib/types';

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Orders to Fulfill */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* High Priority Orders */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              High Priority Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesOrders
                .filter(order => order.priority === 'High' && order.gap > 0)
                .slice(0, 5)
                .map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate('orders')}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{order.soNumber}</p>
                        <Badge variant="destructive" className="text-xs">
                          {order.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customer} • {order.sku}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Due: {order.promiseDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>Gap: {order.gap} units</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              order.coveragePercent === 0 ? 'bg-red-500' :
                              order.coveragePercent < 50 ? 'bg-orange-500' :
                              order.coveragePercent < 100 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${order.coveragePercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {order.coveragePercent}% covered
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesOrders
                .slice(0, 5)
                .map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate('orders')}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{order.soNumber}</p>
                        <Badge
                          variant={
                            order.priority === 'High' ? 'destructive' :
                            order.priority === 'Medium' ? 'default' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {order.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customer} • {order.sku}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Due: {order.promiseDate}</span>
                        </div>
                        <span>Qty: {order.qtyOrdered}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              order.coveragePercent === 0 ? 'bg-red-500' :
                              order.coveragePercent < 50 ? 'bg-orange-500' :
                              order.coveragePercent < 100 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${order.coveragePercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {order.coveragePercent}% covered
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expedite List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Expedite List - Top 10 Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expediteItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Badge
                    variant={item.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="mt-0.5"
                  >
                    {item.type === 'late-po' ? 'Late PO' : 'Gap'}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm">{item.reference}</p>
                      {item.daysLate && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.daysLate}d late
                        </span>
                      )}
                      {item.gap && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Gap: {item.gap}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineList activities={recentActivity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
