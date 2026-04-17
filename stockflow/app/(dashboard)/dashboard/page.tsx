'use client'

import { useState } from 'react'
import Link from 'next/link'

const mockData = {
  stats: [
    { label: 'Raw material stock', value: 4820, suffix: 'kg', sub: '3 materials · +200 kg today', color: 'amber' },
    { label: 'Active production orders', value: 12, sub: '4 pending approval · 8 in production', color: 'teal' },
    { label: 'Finished goods ready', value: 1340, suffix: 'kg', sub: '247 units across 6 designs', color: 'purple' },
    { label: 'Scrap this week', value: 82, suffix: 'kg', sub: '↑ 12 kg vs last week', down: true, color: 'red' },
  ],
  recentOrders: [
    { id: 'PO-0041', design: 'Hex bolt M12', kg: 120, status: 'Pending approval', dept: null },
    { id: 'PO-0040', design: 'Stud rod 8mm', kg: 85, status: 'In production', dept: 'Threading' },
    { id: 'PO-0039', design: 'Anchor bolt', kg: 200, status: 'In production', dept: 'Electroplate' },
    { id: 'PO-0038', design: 'Hex bolt M10', kg: 60, status: 'Complete', dept: 'Done' },
  ],
  departmentScrap: [
    { dept: 'Cutting', kg: 8, pct: 4 },
    { dept: 'Forging', kg: 22, pct: 11 },
    { dept: 'Threading', kg: 5, pct: 2 },
    { dept: 'Electroplating', kg: 31, pct: 15 },
    { dept: 'Drilling', kg: 16, pct: 8 },
  ],
  throughput: [
    { dept: 'Cutting', jobs: 3, kg: 340, scrap: 14, yield: 95.9, ops: 2 },
    { dept: 'Forging / chamfer', jobs: 2, kg: 180, scrap: 22, yield: 87.8, ops: 2 },
    { dept: 'Threading / locking', jobs: 4, kg: 210, scrap: 5, yield: 97.6, ops: 3 },
    { dept: 'Electroplating', jobs: 1, kg: 95, scrap: 31, yield: 67.4, ops: 1 },
    { dept: 'Drilling / grinding', jobs: 2, kg: 120, scrap: 10, yield: 91.7, ops: 2 },
  ],
}

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState('')

  const openModal = (content: string) => {
    setModalContent(content)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Overview</div>
          <div className="section-sub">Today — Thursday 17 Apr 2026</div>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('new_order')}>+ New production order</button>
      </div>

      <div className="stats-grid">
        {mockData.stats.map((stat, i) => (
          <div key={i} className={`stat-card ${stat.color}`}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">
              {stat.value}{stat.suffix && <span style={{fontSize:'14px',color:'var(--muted)'}}> {stat.suffix}</span>}
            </div>
            <div className="stat-sub">
              {stat.sub.includes('vs last week') ? (
                <>
                  {stat.down && <span className="down">{stat.sub.split(' vs last week')[0]}</span>} vs last week
                </>
              ) : (
                stat.sub
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-16">
        <div className="card">
          <div className="section-header mb-16">
            <div className="section-title">Recent production orders</div>
            <Link href="/orders" className="btn btn-ghost btn-sm">View all</Link>
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
                {mockData.recentOrders.map((order) => (
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
          {mockData.departmentScrap.map((item) => {
            const cls = item.pct > 10 ? 'bad' : item.pct > 5 ? 'warn' : 'good'
            return (
              <div key={item.dept} className="scrap-bar-wrap">
                <div className="scrap-bar-label">
                  <span>{item.dept}</span>
                  <span>{item.kg} kg · {item.pct}%</span>
                </div>
                <div className="scrap-bar">
                  <div className={`scrap-bar-fill ${cls}`} style={{width:`${item.pct*4}%`}} />
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
              {mockData.throughput.map((dept) => (
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        {modalContent === 'new_order' && (
          <div>
            <div className="modal-title">New production order</div>
            <div className="modal-sub">Select a design to auto-fill the process stages</div>
            <div className="form-group mb-16">
              <label className="form-label">Design template</label>
              <select className="form-input">
                <option>Hex bolt M12</option>
                <option>Stud rod 8mm</option>
                <option>Anchor bolt</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity (units)</label>
                <input className="form-input" type="number" placeholder="e.g. 500" />
              </div>
              <div className="form-group">
                <label className="form-label">Kg to reserve</label>
                <input className="form-input" type="number" placeholder="Auto-calculated" />
              </div>
            </div>
            <div className="form-group mb-16">
              <label className="form-label">Client / reference</label>
              <input className="form-input" type="text" placeholder="e.g. Apex Hardware" />
            </div>
            <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'12px',marginBottom:'16px'}}>
              <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Process stages (from design)</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                {['1. Cut','2. Forge','3. Thread','4. Electroplate'].map(s => (
                  <span key={s} style={{background:'rgba(139,124,248,0.12)',color:'var(--purple)',fontSize:'11px',padding:'3px 8px',borderRadius:'10px'}}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { alert('Order created — sent to manager for approval'); setModalOpen(false); }}>
              Create order → send for approval
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}