import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export default async function RawmaterialsPage() {
  const materials = await prisma.rawMaterial.findMany();
  
  const receipts = await prisma.materialReceipt.findMany({
    include: { material: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return (
    <div>
      <div className="section-header mb-16">
        <div><div className="section-title">Raw materials</div><div className="section-sub">Current stock levels in kg</div></div>
        <form action={async () => { 'use server'; console.log("Receive stock action bypassed.") }}>
          <button type="submit" className="btn btn-primary">+ Receive stock</button>
        </form>
      </div>
      <div className="stats-grid mb-24" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        {materials.map(m => {
          const free = m.availableKg - m.reservedKg;
          const trend = free > 500 ? 'teal' : free > 0 ? 'amber' : 'red';
          return (
            <div key={m.id} className={`stat-card ${trend}`}>
              <div className="stat-label">{m.materialName}</div>
              <div className="stat-value">{(m.availableKg).toLocaleString()}<span style={{fontSize:'14px',color:'var(--muted)'}}> kg</span></div>
              <div className="stat-sub"><span>{Math.max(0, free).toLocaleString()} kg free</span> · {m.reservedKg.toLocaleString()} kg reserved</div>
            </div>
          )
        })}
        {materials.length === 0 && (
          <div style={{ color: 'var(--muted)', gridColumn: '1 / -1' }}>No raw materials defined.</div>
        )}
      </div>
      <div className="card">
        <div className="section-header mb-16"><div className="section-title">Receipt history</div></div>
        <table>
          <thead><tr><th>Date</th><th>Material</th><th>Kg received</th><th>Reference</th><th>Logged by</th></tr></thead>
          <tbody>
            {receipts.map(r => (
              <tr key={r.id}>
                <td>{r.createdAt.toLocaleDateString()}</td>
                <td>{r.material.materialName}</td>
                <td><span className="job-kg">{r.kgReceived.toFixed(2)} kg</span></td>
                <td>{r.reference || '—'}</td>
                <td>{r.loggedBy || 'System'}</td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr><td colSpan={5} style={{textAlign: 'center', color: 'var(--muted)'}}>No receipts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}