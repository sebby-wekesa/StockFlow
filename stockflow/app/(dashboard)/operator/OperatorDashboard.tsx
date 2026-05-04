"use client";

import { useState, useEffect } from "react";
import { getOperatorData } from "./actions";
import { DepartmentQueue } from "@/components/DepartmentQueue";
import { Factory, Terminal, Activity, Info } from "lucide-react";

export default function OperatorDashboard() {
  const [designs, setDesigns] = useState<any[]>([]);

  // In a real scenario, this comes from the logged-in user's profile
  const userDept = "Cutting";

  useEffect(() => {
    const fetchData = async () => {
      const result = await getOperatorData();
      if (result.success && result.data) {
        setDesigns(result.data);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="dashboard-content">
      <div className="section-header">
        <div>
          <h1>Station Terminal: {userDept}</h1>
          <div className="section-sub">
            Process active jobs • {designs.length} products in registry
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface2)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 12px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--green)',
            animation: 'pulse 2s infinite'
          }}></div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            System Online
          </span>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-label">Station Efficiency</div>
          <div className="stat-value">98.2%</div>
          <div className="stat-sub">Current performance</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Queue Health</div>
          <div className="stat-value">Optimal</div>
          <div className="stat-sub">System status</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Pending Handoffs</div>
          <div className="stat-value">Live Sync</div>
          <div className="stat-sub">Real-time updates</div>
        </div>
      </div>

      {/* Active Queue */}
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Active Production Queue</div>
            <div className="section-sub">Orders currently staged for {userDept}</div>
          </div>
        </div>

        <DepartmentQueue userDept={userDept} />
      </div>

      {/* Operational Tip */}
      <div style={{
        background: 'rgba(74,158,255,0.1)',
        border: '1px solid rgba(74,158,255,0.2)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <div style={{
          padding: '6px',
          background: 'rgba(74,158,255,0.2)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <Info style={{ color: 'var(--blue)' }} size={16} />
        </div>
        <div>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--blue)',
            fontFamily: 'var(--font-head)',
            marginBottom: '4px'
          }}>
            Station Tip
          </h4>
          <p style={{
            fontSize: '13px',
            color: 'var(--text)',
            lineHeight: 1.5
          }}>
            Ensure all material weights are logged before completing a stage. Accurate "Kg Out" values
            automatically update the target weight for the next department in the sequence.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}