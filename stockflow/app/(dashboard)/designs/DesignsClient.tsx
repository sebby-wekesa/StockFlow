"use client";

import { useState } from "react";
import { DesignTemplateBuilder } from "@/components/DesignTemplateBuilder";
import { Button } from "@/components/ui/button";

export default function DesignsClient({ designs }: { designs: any[] }) {
  const [showBuilder, setShowBuilder] = useState(false);

  const handleDesignCreated = (design: any) => {
    setShowBuilder(false);
    // The page will revalidate and show the new design
    window.location.reload(); // Simple refresh for now
  };

  if (showBuilder) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => setShowBuilder(false)}>
            ← Back to Designs
          </Button>
        </div>
        <DesignTemplateBuilder onComplete={handleDesignCreated} />
      </div>
    );
  }

  return (
    <div>
      <div className="section-header mb-16">
        <div><div className="section-title">Design templates</div><div className="section-sub">Standardised product designs with process stages and dimensions</div></div>
        <button className="btn btn-primary" onClick={() => setShowBuilder(true)}>+ New design</button>
      </div>
      <div className="grid-3 mb-24">
        {designs.map(d => {
          // Calculate an estimated yield. In real system, this is based on kg/unit and targetWeight, or historical averages.
          const yieldPct = d.targetWeight && d.kgPerUnit > 0
            ? Math.round((d.targetWeight / d.kgPerUnit) * 100) + '%'
            : 'N/A';

          return (
            <div key={d.code} className="card" style={{cursor:'pointer'}} onClick={() => alert('View design modal - TODO: Implement design details modal')}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                <div>
                  <div style={{fontFamily:'var(--font-head)',fontSize:'15px',fontWeight:'700'}}>{d.name}</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>{d.code}</div>
                </div>
                <span className="badge badge-green">{yieldPct} yield</span>
              </div>
              <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'8px'}}>Material: {d.rawMaterial?.materialName || 'Various'}</div>
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
    </div>
  );
}
