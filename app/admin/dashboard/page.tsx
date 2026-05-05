import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  // Ensure only admin can access
  if (user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const data = await import('@/app/actions/dashboard').then(m => m.getDashboardStats(user, 'ADMIN'))
  const { stats, recentOrders, departmentScrap, throughput } = data

  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
  const month = today.toLocaleDateString('en-US', { month: 'short' })
  const day = today.getDate()
  const year = today.getFullYear()
  const dateString = `${dayName} ${day} ${month} ${year}`

  return (
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Overview</div>
          <div className="section-sub">Today — {dateString}</div>
        </div>
        <button className="btn btn-primary">+ New production order</button>
      </div>

      <div className="stats-grid">
        {stats.map((stat: any, i: number) => (
          <div key={i} className={`stat-card ${stat.color}`}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">
              {stat.value}{stat.suffix && <span style={{fontSize:'14px',color:'var(--muted)'}}> {stat.suffix}</span>}
            </div>
            <div className="stat-sub">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-16">
        <div className="card">
          <div className="section-header mb-16">
            <div className="section-title">Recent production orders</div>
            <button className="btn btn-ghost btn-sm">View all</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Design</th>
                  <th>Kg reserved</th>
                  <th>Status</th>
                  <th>Dept</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: any) => (
                  <tr key={order.id}>
                    <td>
                      <span style={{fontFamily:'var(--font-mono)',color:'var(--muted)'}}>{order.id}</span>
                    </td>
                    <td>{order.design}</td>
                    <td>
                      <span className="job-kg">{order.kg} kg</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        order.status === 'Pending approval' ? 'badge-amber' :
                        order.status === 'In production' ? 'badge-purple' :
                        'badge-green'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.dept || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="section-header mb-16">
            <div className="section-title">Scrap by department</div>
            <div style={{fontSize:'11px',color:'var(--muted)'}}>This week</div>
          </div>
          {departmentScrap.map((item: any) => {
            const cls = item.pct > 10 ? 'bad' : item.pct > 5 ? 'warn' : 'good'
            return (
              <div key={item.dept} className="scrap-bar-wrap">
                <div className="scrap-bar-label">
                  <span>{item.dept}</span>
                  <span>{item.kg} kg · {item.pct}%</span>
                </div>
                <div className="scrap-bar">
                  <div className={`scrap-bar-fill ${cls}`} style={{width:`${Math.min(item.pct*4, 100)}%`}} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-header mb-16">
          <div className="section-title">Department throughput — today</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Jobs active</th>
                <th>Kg processed</th>
                <th>Kg scrap</th>
                <th>Yield</th>
                <th>Operators</th>
              </tr>
            </thead>
            <tbody>
              {throughput.map((dept: any) => (
                <tr key={dept.dept}>
                  <td>{dept.dept}</td>
                  <td>{dept.jobs}</td>
                  <td>
                    <span className="job-kg">{dept.kg} kg</span>
                  </td>
                  <td>{dept.scrap} kg</td>
                  <td>
                    <span className={`badge ${
                      dept.yield < 70 ? 'badge-red' :
                      dept.yield < 90 ? 'badge-amber' : 'badge-green'
                    }`}>
                      {dept.yield}%
                    </span>
                  </td>
                  <td>{dept.ops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}