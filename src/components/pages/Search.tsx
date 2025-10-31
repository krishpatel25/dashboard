import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Package, ShoppingCart, FileText, Truck } from 'lucide-react';
import { salesOrders, purchaseOrders, receipts, stockItems } from '../../lib/data';

interface SearchProps {
  query: string;
}

export function Search({ query }: SearchProps) {
  const results = useMemo(() => {
    if (!query || query.trim().length < 2) {
      return {
        stock: [],
        salesOrders: [],
        purchaseOrders: [],
        receipts: [],
      };
    }

    const searchTerm = query.toLowerCase().trim();

    return {
      stock: stockItems.filter(item =>
        item.sku.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
      ),
      salesOrders: salesOrders.filter(order =>
        order.soNumber.toLowerCase().includes(searchTerm) ||
        order.customer.toLowerCase().includes(searchTerm) ||
        order.sku.toLowerCase().includes(searchTerm)
      ),
      purchaseOrders: purchaseOrders.filter(po =>
        po.poNumber.toLowerCase().includes(searchTerm) ||
        po.vendor.toLowerCase().includes(searchTerm)
      ),
      receipts: receipts.filter(receipt =>
        receipt.poNumber.toLowerCase().includes(searchTerm) ||
        receipt.vendor.toLowerCase().includes(searchTerm) ||
        receipt.sku.toLowerCase().includes(searchTerm)
      ),
    };
  }, [query]);

  const totalResults = results.stock.length + results.salesOrders.length + 
                      results.purchaseOrders.length + results.receipts.length;

  if (!query || query.trim().length < 2) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <p className="text-muted-foreground">
            Enter a search term (SKU, PO, SO, vendor, customer) to see results
          </p>
        </CardContent>
      </Card>
    );
  }

  if (totalResults === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <p className="text-muted-foreground">
            No results found for "{query}"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Search Results</h2>
        <Badge variant="secondary">{totalResults} result{totalResults !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Stock Items */}
      {results.stock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5" />
              Stock Items ({results.stock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.stock.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.sku}</p>
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Available: </span>
                          <span className={item.available < 0 ? 'text-red-600' : ''}>{item.available}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">On-hand: </span>
                          <span>{item.onHand}</span>
                        </div>
                        {item.location && (
                          <div>
                            <span className="text-muted-foreground">Location: </span>
                            <span>{item.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={
                      item.status === 'Healthy' ? 'default' :
                      item.status === 'Low' ? 'secondary' :
                      'destructive'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Orders */}
      {results.salesOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="w-5 h-5" />
              Sales Orders ({results.salesOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.salesOrders.map((order) => (
                <div key={order.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{order.soNumber}</p>
                        <Badge variant="outline" className="text-xs">{order.customer}</Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">SKU: </span>
                          <span>{order.sku}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Qty: </span>
                          <span>{order.qtyOrdered}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coverage: </span>
                          <span className={
                            order.coveragePercent === 0 ? 'text-red-600' :
                            order.coveragePercent < 100 ? 'text-yellow-600' :
                            'text-green-600'
                          }>
                            {order.coveragePercent}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Due: </span>
                          <span>{order.promiseDate}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      order.priority === 'High' ? 'destructive' :
                      order.priority === 'Medium' ? 'default' :
                      'secondary'
                    }>
                      {order.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Orders */}
      {results.purchaseOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5" />
              Purchase Orders ({results.purchaseOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.purchaseOrders.map((po) => (
                <div key={po.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{po.poNumber}</p>
                        <Badge variant="outline" className="text-xs">{po.vendor}</Badge>
                        {po.isLate && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Due: </span>
                          <span>{po.dueDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ordered: </span>
                          <span>{po.ordered}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Received: </span>
                          <span>{po.received} ({po.percentReceived}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipts */}
      {results.receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="w-5 h-5" />
              Receipts ({results.receipts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.receipts.map((receipt) => (
                <div key={receipt.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{receipt.poNumber}</p>
                        <Badge variant="outline" className="text-xs">{receipt.vendor}</Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date: </span>
                          <span>{receipt.date}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SKU: </span>
                          <span>{receipt.sku}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Qty: </span>
                          <span>{receipt.qty}</span>
                        </div>
                        {receipt.variance !== 0 && (
                          <div>
                            <span className="text-muted-foreground">Variance: </span>
                            <span className={receipt.variance < 0 ? 'text-red-600' : 'text-green-600'}>
                              {receipt.variance > 0 ? '+' : ''}{receipt.variance}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
