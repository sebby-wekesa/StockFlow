import { getManagerData, approveOrder } from '@/app/actions/dashboard'

export default async function ManagerContent() {
  const { pendingApprovals, activeProduction, scrapAlerts, totalActiveOrders, totalTonnage, pendingCount } = await getManagerData()

  return (
    <div className="dashboard-content">
      <div className="section-header">
        <div>
          <h1>Production Manager Dashboard</h1>
          <div className="section-sub">Oversee production approvals and department queues</div>
        </div>
      </div>

      {/* Overview Tiles */}
      <div className="stats-grid">
        <div className="stat-card teal">
          <div className="stat-label">Active Orders</div>
          <div className="stat-value">{totalActiveOrders}</div>
          <div className="stat-sub">Orders in production</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Total Tonnage</div>
          <div className="stat-value">{totalTonnage.toFixed(1)}</div>
          <div className="stat-suffix">kg</div>
          <div className="stat-sub">In production</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-sub">Awaiting review</div>
        </div>
      </div>

      {/* Approvals List */}
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Pending Approvals</div>
            <div className="section-sub">Review and release orders to production</div>
          </div>
        </div>
        {pendingApprovals.length > 0 ? (
          pendingApprovals.map((order: any) => (
            <div key={order.id} className="approval-card">
              <div className="approval-header">
                <div>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--muted)'}}>{order.orderNumber}</span>
                  <div style={{fontFamily:'var(--font-head)',fontSize:'16px',fontWeight:'700',margin:'4px 0'}}>{order.design.name}</div>
                  <div style={{fontSize:'12px',color:'var(--muted)'}}>Quantity: {order.quantity} units · {order.targetKg.toFixed(2)} kg</div>
                </div>
                <span className="badge badge-amber">Pending approval</span>
              </div>
              <div className="approval-actions">
                <form action={approveOrder.bind(null, order.id)}>
                  <button className="btn btn-teal" type="submit">Approve & Release</button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', color: 'var(--muted)', textAlign: 'center' }}>
            No pending approvals.
          </div>
        )}
      </div>

      {/* Department Queues */}
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Department Queues</div>
            <div className="section-sub">Current workload distribution</div>
          </div>
        </div>
        {activeProduction.length > 0 ? (
          activeProduction.map((dept: any) => (
            <div key={dept.currentDept} className="queue-item">
              <div className="queue-label">{dept.currentDept || 'Unassigned'}</div>
              <div className="queue-count">{dept._count._all} jobs</div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', color: 'var(--muted)', textAlign: 'center' }}>
            No active production orders.
          </div>
        )}
      </div>
    </div>
  )
}