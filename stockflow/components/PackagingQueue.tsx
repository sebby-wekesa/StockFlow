'use client'

import React, { useState, useEffect } from 'react'
import { fulfillOrder, getPackagingStats } from '@/app/actions/packaging'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Package, Truck, CheckCircle, AlertTriangle } from 'lucide-react'

interface PackagingItem {
  id: string
  designName: string
  designCode: string
  quantity: number
  unitPrice: number
  totalPrice: number
  availableStock: number
}

interface PackagingOrder {
  id: string
  orderNumber: string
  customerName: string
  totalItems: number
  totalQuantity: number
  totalKg: number
  createdAt: Date
  items: PackagingItem[]
}

interface PackagingQueueProps {
  orders: PackagingOrder[]
}

export function PackagingQueue({ orders: initialOrders }: PackagingQueueProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [fulfilling, setFulfilling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  const handleFulfillOrder = async (orderId: string) => {
    setFulfilling(orderId)
    setError(null)

    try {
      await fulfillOrder(orderId)
      // Remove the fulfilled order from the list
      setOrders(prev => prev.filter(order => order.id !== orderId))
      // Refresh stats
      loadStats()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setFulfilling(null)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await getPackagingStats()
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load packaging stats:', err)
    }
  }

  // Load stats on mount
  React.useEffect(() => {
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Shipped Today</p>
                  <p className="text-2xl font-bold">{stats.shippedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Weekly Revenue</p>
                  <p className="text-2xl font-bold">${stats.weeklyRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Packaging Queue
          </CardTitle>
          <CardDescription>
            Sales orders ready for fulfillment and shipping
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders ready for packaging</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here when all items are available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        Ordered {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{order.totalItems} items</Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.totalQuantity} units • {order.totalKg.toFixed(1)} kg
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <div>
                          <span className="font-medium">{item.designName}</span>
                          <span className="text-sm text-gray-500 ml-2">({item.designCode})</span>
                        </div>
                        <div className="text-sm">
                          {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleFulfillOrder(order.id)}
                      disabled={fulfilling === order.id}
                      className="min-w-32"
                    >
                      {fulfilling === order.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Fulfilling...
                        </>
                      ) : (
                        <>
                          <Truck className="h-4 w-4 mr-2" />
                          Ship Order
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}