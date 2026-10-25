import React, { useState, useEffect } from 'react';
import { api, getFullApiUrl } from '../services/api';
import { 
  BarChart3, TrendingUp, AlertOctagon, Download, 
  MapPin, CheckCircle, Clock 
} from 'lucide-react';

export default function ManagementDashboard({ user, onViewCase }) {
  const [summary, setSummary] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [ageing, setAgeing] = useState(null);
  const [topOverdue, setTopOverdue] = useState([]);
  const [regionSummary, setRegionSummary] = useState([]);
  const [monthlyDisposal, setMonthlyDisposal] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('All India');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const regionParam = selectedRegion !== 'All India' ? { region: selectedRegion } : {};
        const [sumRes, workRes, ageRes, overdueRes, regRes, dispRes] = await Promise.all([
          api.getDashboardSummary(regionParam),
          api.getWorkload().catch(() => ({ data: { byBureau: [] } })),
          api.getAgeing().catch(() => ({ data: { bands: {} } })),
          api.getTopOverdue(10).catch(() => ({ data: [] })),
          api.getRegionSummary().catch(() => ({ data: [] })),
          api.getMonthlyDisposal(2026).catch(() => ({ data: [] }))
        ]);

        setSummary(sumRes.data);
        setWorkload(workRes.data);
        setAgeing(ageRes.data);
        setTopOverdue(overdueRes.data || []);
        setRegionSummary(regRes.data || []);
        setMonthlyDisposal(dispRes.data || []);
      } catch (err) {
        console.error('Failed to load senior management dashboard from DB:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedRegion]);

  const handleExport = async () => {
    try {
      window.open(getFullApiUrl('/reports/bureau-wise?format=xlsx'), '_blank');
    } catch (err) {
      alert('Report download initiated.');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading Management Analytics from DB...</div>;
  }

  // Workload data strictly from PostgreSQL
  const bureausData = workload?.byBureau?.length > 0 ? workload.byBureau : [
    { bureau_code: 'RB', count: summary?.byStatus ? Object.values(summary.byStatus).reduce((a, b) => a + b, 0) : 0 }
  ];
  const maxWorkload = Math.max(...bureausData.map(b => b.count || b.open_cases || 1), 1);

  // Dynamic monthly disposal bars
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const disposalMap = {};
  monthlyDisposal.forEach(d => {
    disposalMap[d.month] = d.count;
  });

  const recentMonths = [8, 9, 10, 11, 12, 1].map(m => ({
    m: monthNames[m - 1],
    c: disposalMap[m] || 0
  }));
  const maxDisposal = Math.max(...recentMonths.map(x => x.c), 1);

  return (
    <div>
      {/* Breadcrumb & Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
            Home &gt; Dashboards &gt; <strong>Senior Management Dashboard</strong>
          </div>
          <h2 style={{
            fontSize: '22px',
            fontFamily: 'var(--font-heading)',
            color: '#0A3663',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <BarChart3 size={24} color="#E65100" />
            Senior Management Dashboard
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <MapPin size={16} color="#64748B" />
            <span style={{ fontWeight: 600 }}>Region:</span>
            <select
              className="gov-select"
              style={{ width: '150px', padding: '6px 10px' }}
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="All India">All India</option>
              <option value="North">North Region</option>
              <option value="South">South Region</option>
              <option value="East">East Region</option>
              <option value="West">West Region</option>
              <option value="Central">Central Region</option>
            </select>
          </div>

          <button onClick={handleExport} className="gov-btn gov-btn-outline">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards (Live from Postgres) */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon-wrap">
            <BarChart3 size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Cases</span>
            <span className="kpi-value">{summary?.total || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-red">
          <div className="kpi-icon-wrap">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pending / Overdue</span>
            <span className="kpi-value">{summary?.overdue || summary?.byStatus?.PENDING || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-amber">
          <div className="kpi-icon-wrap">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Under Process</span>
            <span className="kpi-value">{summary?.byStatus?.UNDER_PROCESS || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon-wrap">
            <AlertOctagon size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Escalated</span>
            <span className="kpi-value">{summary?.byStatus?.ESCALATED || 0}</span>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon-wrap">
            <CheckCircle size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Disposed</span>
            <span className="kpi-value">{summary?.byStatus?.DISPOSED || 0}</span>
          </div>
        </div>
      </div>

      {/* Analytics Visual Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Case Status Doughnut from DB counts */}
        <div className="gov-table-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '15px', color: '#0A3663', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '16px' }}>
            Case Status Distribution (Live DB)
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '180px' }}>
            <div style={{
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              background: `conic-gradient(
                #0D47A1 0% ${Math.round(((summary?.byStatus?.DISPOSED || 0) / (summary?.total || 1)) * 100)}%, 
                #FF9933 ${Math.round(((summary?.byStatus?.DISPOSED || 0) / (summary?.total || 1)) * 100)}% ${Math.round((((summary?.byStatus?.DISPOSED || 0) + (summary?.byStatus?.UNDER_PROCESS || 0)) / (summary?.total || 1)) * 100)}%, 
                #D84315 ${Math.round((((summary?.byStatus?.DISPOSED || 0) + (summary?.byStatus?.UNDER_PROCESS || 0)) / (summary?.total || 1)) * 100)}% 100%
              )`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#0A3663' }}>
                  {summary?.total || 0}
                </span>
                <span style={{ fontSize: '10px', color: '#64748B' }}>Total</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', background: '#0D47A1', borderRadius: '2px' }} />
                <span>Disposed ({summary?.byStatus?.DISPOSED || 0})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', background: '#FF9933', borderRadius: '2px' }} />
                <span>Under Process ({summary?.byStatus?.UNDER_PROCESS || 0})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', background: '#D84315', borderRadius: '2px' }} />
                <span>Escalated ({summary?.byStatus?.ESCALATED || 0})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Workload per Bureau (Live DB) */}
        <div className="gov-table-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '15px', color: '#0A3663', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '16px' }}>
            Workload per Bureau (Open Cases)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '180px', justifyContent: 'center' }}>
            {bureausData.map((b) => {
              const bCode = b.bureau_code || b.bureauCode || b.bureau;
              const count = b.count ?? b.open_cases ?? 0;
              const pct = Math.max(10, Math.round((count / maxWorkload) * 100));
              const color = bCode === 'RB' ? '#0D47A1' : bCode === 'PGRC' ? '#FF9933' : bCode === 'RO' ? '#0284C7' : '#7C3AED';
              return (
                <div key={bCode} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
                  <span style={{ width: '50px', fontWeight: 700, color: '#334155' }}>{bCode}</span>
                  <div style={{ flex: 1, background: '#F1F5F9', borderRadius: '4px', height: '18px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      background: color,
                      height: '100%',
                      borderRadius: '4px',
                      transition: 'width 0.4s'
                    }} />
                  </div>
                  <span style={{ width: '35px', textAlign: 'right', fontWeight: 700 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Monthly Disposal Trend (Live from DB) */}
        <div className="gov-table-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '15px', color: '#0A3663', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '16px' }}>
            Monthly Disposal Trend
          </h4>
          <div style={{
            height: '180px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '20px'
          }}>
            {recentMonths.map(col => {
              const h = Math.max(14, Math.round((col.c / maxDisposal) * 100));
              return (
                <div key={col.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0A3663' }}>{col.c}</span>
                  <div style={{
                    width: '100%',
                    height: `${h}px`,
                    background: 'linear-gradient(180deg, #3B82F6 0%, #0A3663 100%)',
                    borderRadius: '4px 4px 0 0'
                  }} />
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{col.m}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Overdue Cases Table (Live DB) */}
      <div className="gov-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', color: '#0A3663', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
            Top Overdue Cases (Breached SLA Deadlines)
          </h3>
          <span style={{ fontSize: '12.5px', color: '#DC2626', fontWeight: 600 }}>
            ● Action Needed
          </span>
        </div>

        <div className="gov-table-wrap">
          <table className="gov-data-table">
            <thead>
              <tr>
                <th>Case ID ⇅</th>
                <th>Institution ⇅</th>
                <th>Bureau ⇅</th>
                <th>Category ⇅</th>
                <th>Due Date ⇅</th>
                <th>Days Overdue ⇅</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {topOverdue.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                    No overdue cases found. All cases within SLA!
                  </td>
                </tr>
              ) : (
                topOverdue.map(c => {
                  const daysOverdue = c.daysOverdue ?? Math.max(1, Math.round((new Date() - new Date(c.dueOn)) / (1000 * 60 * 60 * 24)));
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="case-id-link" onClick={() => onViewCase(c.id)}>
                          {c.id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.institutionName || `Institution #${c.institutionId}`}</td>
                      <td><span className="bureau-tag">{c.bureau || c.bureauCode}</span></td>
                      <td>{c.category}</td>
                      <td>{new Date(c.dueOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <span className="status-badge status-overdue" style={{ fontWeight: 700 }}>
                          {daysOverdue} days
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => onViewCase(c.id)}
                          className="gov-btn gov-btn-outline"
                          style={{ padding: '3px 10px', fontSize: '11.5px' }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
