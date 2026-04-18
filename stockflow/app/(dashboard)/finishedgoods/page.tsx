import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export default async function FinishedgoodsPage() {
  const goods = await prisma.finishedGoods.findMany({
    include: {
      design: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className="section-header mb-16">
        <div><div className="section-title">Finished goods</div><div className="section-sub">Stock ready for sale</div></div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Design</th><th>Code</th><th>Units</th><th>Total kg</th><th>Kg/unit</th><th>Status</th></tr></thead>
          <tbody>
            {goods.map(g => {
              const kgUnit = g.quantity > 0 ? (g.kgProduced / g.quantity).toFixed(2) : '0.00';
              return (
                <tr key={g.id}>
                  <td>{g.design.name}</td>
                  <td><span style={{fontFamily:'var(--font-mono)',color:'var(--muted)'}}>{g.design.code}</span></td>
                  <td>{g.quantity}</td>
                  <td><span className="job-kg">{g.kgProduced.toFixed(2)} kg</span></td>
                  <td>{kgUnit} kg</td>
                  <td><span className={`badge ${g.quantity > 0 ? 'badge-teal' : 'badge-amber'}`}>{g.quantity > 0 ? 'Available' : 'Empty'}</span></td>
                </tr>
              )
            })}
            {goods.length === 0 && (
              <tr>
                <td colSpan={6} style={{padding: '20px', textAlign: 'center', color: 'var(--muted)'}}>No finished goods stock available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}