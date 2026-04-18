"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

export default function DesignsClient({ designs }: { designs: any[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <div className="section-header mb-16">
        <div><div className="section-title">Design templates</div><div className="section-sub">Standardised product designs with process stages and dimensions</div></div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ New design</button>
      </div>
      <div className="grid-3 mb-24">
        {designs.map(d => {
          // Calculate an estimated yield. In real system, this is based on kg/unit and targetWeight, or historical averages.
          const yieldPct = d.targetWeight && d.kgPerUnit > 0 
            ? Math.round((d.targetWeight / d.kgPerUnit) * 100) + '%' 
            : 'N/A';
            
          return (
            <div key={d.code} className="card" style={{cursor:'pointer'}} onClick={() => alert('View design modal')}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                <div>
                  <div style={{fontFamily:'var(--font-head)',fontSize:'15px',fontWeight:'700'}}>{d.name}</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>{d.code}</div>
                </div>
                <span className="badge badge-green">{yieldPct} yield</span>
              </div>
              <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'8px'}}>Material: {d.rawMaterialId || 'Various'}</div>
              <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'10px'}}>Dims: {d.targetDimensions || 'Standard'}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                {d.stages.map((s: any,i: number) => <span key={s.id || i} style={{background:'rgba(139,124,248,0.12)',color:'var(--purple)',fontSize:'10px',padding:'2px 7px',borderRadius:'10px',fontWeight:'500'}}>{s.sequence}. {s.name}</span>)}
              </div>
            </div>
          )
        })}
        {designs.length === 0 && (
          <div style={{ padding: '20px', color: 'var(--muted)', gridColumn: '1 / -1' }}>No design templates found.</div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div>
          <div className="modal-title">New design template</div>
          <div className="modal-sub">Define process stages, dimensions and expected yield</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Design name</label><input className="form-input" placeholder="e.g. Hex bolt M14"/></div>
            <div className="form-group"><label className="form-label">Design code</label><input className="form-input" placeholder="e.g. HB-M14"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Raw material</label><select className="form-input"><option>Steel rod 16mm</option><option>Steel rod 20mm</option><option>Steel rod 25mm</option></select></div>
            <div className="form-group"><label className="form-label">Target dimensions</label><input className="form-input" placeholder="e.g. M14 × 70mm"/></div>
          </div>
          <div className="form-group" style={{marginBottom:'10px'}}><label className="form-label">Select process stages (in order)</label></div>
          <div className="stage-builder" id="stage-builder">
            {['Cutting','Chamfering','Forging','Skimming','Threading','Locking','Electroplating','Drilling','Grinding'].map((s,i) => (
              <div key={i} className="stage-chip off" id={`chip-${i}`} onClick={() => alert(`Toggled ${s}`)}>
                <span className="chip-num" id={`cn-${i}`}>·</span>{s}
              </div>
            ))}
          </div>
          <div className="form-row" style={{marginTop:'14px'}}>
            <div className="form-group"><label className="form-label">Expected yield (%)</label><input className="form-input" type="number" placeholder="e.g. 88"/></div>
            <div className="form-group"><label className="form-label">Kg per finished unit</label><input className="form-input" type="number" placeholder="e.g. 2.83"/></div>
          </div>
          <button className="btn btn-primary" style={{marginTop:'6px'}} onClick={() => { alert('Design saved'); setModalOpen(false); }}>Save design</button>
        </div>
      </Modal>
    </div>
  );
}
