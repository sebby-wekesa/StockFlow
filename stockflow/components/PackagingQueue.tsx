'use client'

import React, { useState, useEffect } from 'react'
import { fulfillOrder, getPackagingStats } from '@/app/actions/packaging'

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
    <div>
      {error && (
        <div style={{
          background: 'rgba(224,85,85,0.1)',
          border: '1px solid rgba(224,85,85,0.2)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
          <span style={{ color: 'var(--text)', fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-label">Pending Orders</div>
            <div className="stat-value">{stats.pendingOrders}</div>
          </div>

          <div className="stat-card teal">
            <div className="stat-label">Shipped Today</div>
            <div className="stat-value">{stats.shippedToday}</div>
          </div>

          <div className="stat-card purple">
            <div className="stat-label">Weekly Revenue</div>
            <div className="stat-value">${stats.weeklyRevenue.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Orders Queue */}
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Packaging Queue</div>
            <div className="section-sub">Sales orders ready for fulfillment and shipping</div>
          </div>
        </div>

        <div>
          {orders.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--muted)'
            }}>
              <div style={{
                display: 'inline-block',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '20px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius)',
                  display: 'inline-block'
                }}>
                  <Package size={36} style={{ color: 'var(--muted)' }} />
                </div>
              </div>
              <p style={{
                fontSize: '16px',
                color: 'var(--muted)',
                marginBottom: '4px'
              }}>
                No orders ready for packaging
              </p>
              <p style={{
                fontSize: '12px',
                color: 'var(--muted)'
              }}>
                Orders will appear here when all items are available
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((order) => (
                <div key={order.id} style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginBottom: '4px'
                      }}>
                        {order.orderNumber}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--muted)',
                        marginBottom: '2px'
                      }}>
                        {order.customerName}
                      </p>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--muted)'
                      }}>
                        Ordered {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'var(--muted)',
                        display: 'inline-block',
                        marginBottom: '6px'
                      }}>
                        {order.totalItems} items
                      </span>
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--muted)'
                      }}>
                        {order.totalQuantity} units • {order.totalKg.toFixed(1)} kg
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {order.items.map((item) => (
                      <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--surface)',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border2)'
                      }}>
                        <div>
                          <span style={{
                            fontWeight: 500,
                            color: 'var(--text)'
                          }}>
                            {item.designName}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--muted)',
                            marginLeft: '8px'
                          }}>
                            ({item.designCode})
                          </span>
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--text)'
                        }}>
                          {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleFulfillOrder(order.id)}
                      disabled={fulfilling === order.id}
                      className="btn-primary"
                      style={{
                        minWidth: '120px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {fulfilling === order.id ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          Fulfilling...
                        </>
                      ) : (
                        <>
                          <Truck size={14} />
                          Ship Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}